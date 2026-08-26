/**
 * inviteExpiryReminder.ts
 * Heartbeat handler: runs every hour, finds pending invite tokens expiring
 * within the next 24 hours, and sends a reminder email to those tenants.
 *
 * Registered at: POST /api/scheduled/invite-expiry-reminder
 */
import type { Request, Response } from "express";
import { and, eq, gt, lt, isNotNull, isNull } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { sendInviteReminderEmail } from "../email";
import { ENV } from "../_core/env";

export async function inviteExpiryReminderHandler(req: Request, res: Response) {
  try {
    // Authenticate — must be a cron caller
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find users with a pending invite token expiring in the next 24 hours
    // that have NOT yet received a reminder (inviteReminderSentAt IS NULL).
    // This makes the handler idempotent: each invite is reminded at most once.
    const pendingInvites = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        inviteToken: users.inviteToken,
        inviteTokenExpiry: users.inviteTokenExpiry,
      })
      .from(users)
      .where(
        and(
          eq(users.inviteUsed, 0),
          isNotNull(users.inviteToken),
          isNotNull(users.inviteTokenExpiry),
          gt(users.inviteTokenExpiry, now),    // not yet expired
          lt(users.inviteTokenExpiry, in24h),  // expiring within 24h
          isNull(users.inviteReminderSentAt),  // not yet reminded
        )
      );

    if (pendingInvites.length === 0) {
      return res.json({ ok: true, reminded: 0, message: "No expiring invites found." });
    }

    // Derive base URL from environment — prefer the deployed domain, fall back to sandbox URL
    const baseUrl = (process.env.APP_BASE_URL ?? "").trim() || "https://propflow-jxpbjcad.manus.space";

    let successCount = 0;
    let failCount = 0;

    for (const invite of pendingInvites) {
      if (!invite.email || !invite.inviteToken) continue;

      const inviteUrl = `${baseUrl}/accept-invite?token=${invite.inviteToken}`;
      const hoursLeft = Math.max(
        1,
        Math.round(
          ((invite.inviteTokenExpiry?.getTime() ?? 0) - now.getTime()) / (60 * 60 * 1000)
        )
      );

      const result = await sendInviteReminderEmail({
        to: invite.email,
        tenantName: invite.name ?? "Tenant",
        inviteUrl,
        hoursLeft,
      });

      if (result.success) {
        successCount++;
        // Mark as reminded so we don't send again on the next hourly run
        await db
          .update(users)
          .set({ inviteReminderSentAt: now })
          .where(eq(users.id, invite.id));
      } else {
        failCount++;
        console.error(`[InviteReminder] Failed to email ${invite.email}: ${result.error}`);
      }
    }

    console.log(`[InviteReminder] Sent ${successCount} reminder(s), ${failCount} failed.`);
    return res.json({
      ok: true,
      reminded: successCount,
      failed: failCount,
      total: pendingInvites.length,
    });
  } catch (err: any) {
    console.error("[InviteReminder] Unexpected error:", err?.message ?? err);
    return res.status(500).json({
      error: err?.message ?? "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
