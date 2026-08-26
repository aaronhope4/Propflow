import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import * as db2 from "../db2";
import { sendVendorInsuranceReminderEmail } from "../email";

function daysUntil(expiresAt: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(expiresAt); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}
function reminderStage(days: number) {
  if (days <= 0) return -1;
  if (days <= 1) return 1;
  if (days <= 7) return 7;
  if (days <= 14) return 14;
  if (days <= 30) return 30;
  return null;
}

export async function vendorInsuranceReminderHandler(req: Request, res: Response) {
  try {
    const cronUser = await sdk.authenticateRequest(req);
    if (!cronUser.isCron) return res.status(403).json({ error: "cron-only endpoint" });
    const candidates = await db2.getVendorInsuranceReminderCandidates();
    let reminded = 0;
    let skipped = 0;
    for (const certificate of candidates) {
      const days = daysUntil(certificate.expiresAt);
      const stage = reminderStage(days);
      if (stage === null || (certificate.lastReminderStage !== null && stage >= certificate.lastReminderStage)) { skipped++; continue; }
      const recipients = (await db2.getOrganizationAdminRecipients(certificate.orgId)).map((user) => user.email).filter((email): email is string => Boolean(email));
      if (recipients.length === 0) { skipped++; continue; }
      const result = await sendVendorInsuranceReminderEmail({
        to: recipients, vendorName: certificate.vendorCompany || certificate.vendorName, certificateName: certificate.certificateName,
        expiresAt: certificate.expiresAt, daysUntil: days,
      });
      if (result.success) { await db2.markVendorCertificateReminder(certificate.id, stage); reminded++; }
    }
    return res.json({ ok: true, reminded, skipped, total: candidates.length });
  } catch (error: any) {
    console.error("[VendorInsuranceReminder]", error);
    return res.status(500).json({ error: error?.message ?? "Unknown error", timestamp: new Date().toISOString() });
  }
}
