/**
 * email.ts — Resend email integration for WAA PropFlow.
 * Handles transactional emails: tenant invites, notifications, etc.
 */
import { Resend } from "resend";
import { ENV } from "./_core/env";

// Lazy-initialize so missing key doesn't crash the server at startup
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!ENV.resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured. Please add it in the project secrets.");
    }
    _resend = new Resend(ENV.resendApiKey);
  }
  return _resend;
}

// ─── Sender identity ─────────────────────────────────────────────────────────
// Uses RESEND_FROM_EMAIL env var when set (e.g. "noreply@yourdomain.com").
// Falls back to Resend's shared onboarding domain for testing.
function getFromAddress(): string {
  const custom = ENV.resendFromEmail?.trim();
  if (custom) {
    // If the env var already includes a display name (e.g. "Name <addr>") use as-is,
    // otherwise wrap it with the app name.
    return custom.includes("<") ? custom : `WAA PropFlow <${custom}>`;
  }
  return "WAA PropFlow <onboarding@resend.dev>";
}

// ─── Email templates ──────────────────────────────────────────────────────────

function buildInviteEmailHtml({
  tenantName,
  inviteUrl,
  expiresHours,
  managerName,
}: {
  tenantName: string;
  inviteUrl: string;
  expiresHours: number;
  managerName: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to WAA PropFlow</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; }
    .wrapper { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e2a4a 0%, #16213e 100%); padding: 36px 40px; text-align: center; }
    .logo-icon { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #3b82f6; border-radius: 12px; margin-bottom: 12px; }
    .logo-icon svg { width: 24px; height: 24px; fill: white; }
    .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .logo-sub { color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 2px; }
    .body { padding: 40px; }
    .greeting { font-size: 24px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; }
    .intro { font-size: 15px; line-height: 1.6; color: #4a5568; margin-bottom: 28px; }
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: #3b82f6; color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 36px; border-radius: 8px; letter-spacing: 0.2px; }
    .divider { border: none; border-top: 1px solid #e8ecf0; margin: 28px 0; }
    .fallback-label { font-size: 12px; color: #718096; margin-bottom: 8px; }
    .fallback-url { font-size: 12px; color: #3b82f6; word-break: break-all; font-family: monospace; background: #f0f4ff; padding: 10px 14px; border-radius: 6px; border: 1px solid #dbeafe; }
    .expiry-note { font-size: 13px; color: #718096; margin-top: 20px; text-align: center; }
    .expiry-note strong { color: #e53e3e; }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e8ecf0; }
    .footer p { font-size: 12px; color: #a0aec0; line-height: 1.6; }
    .footer a { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <!-- Header -->
      <div class="header">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9.5L12 3l9 6.5V21H3V9.5z"/>
          </svg>
        </div>
        <div class="logo-text">WAA PropFlow</div>
        <div class="logo-sub">Property Management Platform</div>
      </div>

      <!-- Body -->
      <div class="body">
        <div class="greeting">You're invited, ${tenantName}!</div>
        <p class="intro">
          <strong>${managerName}</strong> has invited you to access your tenant portal on
          <strong>WAA PropFlow</strong>. Your portal lets you pay rent, view your lease,
          submit maintenance requests, and manage your account — all in one place.
        </p>

        <div class="cta-wrapper">
          <a href="${inviteUrl}" class="cta-btn">Activate My Account →</a>
        </div>

        <p class="expiry-note">
          This invite link expires in <strong>${expiresHours} hours</strong>.
          If it expires, contact your property manager for a new one.
        </p>

        <hr class="divider" />

        <p class="fallback-label">Or copy this link into your browser:</p>
        <div class="fallback-url">${inviteUrl}</div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>
          You received this email because your property manager invited you to WAA PropFlow.<br />
          If you didn't expect this, you can safely ignore it.<br />
          &copy; ${new Date().getFullYear()} WAA PropFlow. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SendInviteEmailParams {
  /** Tenant's email address */
  to: string;
  /** Tenant's display name */
  tenantName: string;
  /** Full invite URL (e.g. https://app.example.com/accept-invite?token=xxx) */
  inviteUrl: string;
  /** Hours until the invite expires (shown in the email) */
  expiresHours?: number;
  /** Property manager's name (shown as the sender) */
  managerName?: string;
}

export interface SendInviteEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Send a branded tenant invite email via Resend.
 * Returns { success: true, emailId } on success, or { success: false, error } on failure.
 * Never throws — callers should handle the failure gracefully.
 */
export async function sendInviteEmail(params: SendInviteEmailParams): Promise<SendInviteEmailResult> {
  const {
    to,
    tenantName,
    inviteUrl,
    expiresHours = 72,
    managerName = "Your Property Manager",
  } = params;

  try {
    const resend = getResend();
    const html = buildInviteEmailHtml({ tenantName, inviteUrl, expiresHours, managerName });

    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject: `You're invited to access your tenant portal — WAA PropFlow`,
      html,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Invite sent to ${to} — id: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending invite:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Unknown email error" };
  }
}

export async function sendVendorInsuranceReminderEmail(params: {
  to: string[];
  vendorName: string;
  certificateName: string;
  expiresAt: Date;
  daysUntil: number;
}): Promise<SendInviteEmailResult> {
  const urgency = params.daysUntil < 0 ? "has expired" : params.daysUntil === 0 ? "expires today" : `expires in ${params.daysUntil} day${params.daysUntil === 1 ? "" : "s"}`;
  try {
    const { data, error } = await getResend().emails.send({
      from: getFromAddress(),
      to: params.to,
      subject: `Insurance certificate ${urgency}: ${params.vendorName}`,
      html: `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:620px;margin:auto"><h2 style="color:#172554">Vendor insurance alert</h2><p><strong>${params.vendorName}</strong>'s <strong>${params.certificateName}</strong> insurance certificate ${urgency}.</p><p>Expiry date: <strong>${params.expiresAt.toLocaleDateString()}</strong></p><p>Please review the vendor record in WAA PropFlow and request an updated certificate if needed.</p></div>`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, emailId: data?.id };
  } catch (error: any) {
    return { success: false, error: error?.message ?? "Unknown email error" };
  }
}

// ─── Invite Expiry Reminder ───────────────────────────────────────────────────

function buildReminderEmailHtml({
  tenantName,
  inviteUrl,
  hoursLeft,
}: {
  tenantName: string;
  inviteUrl: string;
  hoursLeft: number;
}): string {
  const urgencyColor = hoursLeft <= 6 ? "#e53e3e" : "#d97706";
  const urgencyLabel = hoursLeft <= 6 ? "Expiring very soon!" : `Expires in ~${hoursLeft} hours`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your portal invite is expiring soon</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; }
    .wrapper { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e2a4a 0%, #16213e 100%); padding: 36px 40px; text-align: center; }
    .logo-icon { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #3b82f6; border-radius: 12px; margin-bottom: 12px; }
    .logo-icon svg { width: 24px; height: 24px; fill: white; }
    .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .logo-sub { color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 2px; }
    .body { padding: 40px; }
    .urgency-banner { background: #fff8f0; border: 1px solid ${urgencyColor}40; border-left: 4px solid ${urgencyColor}; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
    .urgency-label { color: ${urgencyColor}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .greeting { font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; }
    .intro { font-size: 15px; line-height: 1.6; color: #4a5568; margin-bottom: 28px; }
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: #3b82f6; color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 36px; border-radius: 8px; }
    .divider { border: none; border-top: 1px solid #e8ecf0; margin: 28px 0; }
    .fallback-label { font-size: 12px; color: #718096; margin-bottom: 8px; }
    .fallback-url { font-size: 12px; color: #3b82f6; word-break: break-all; font-family: monospace; background: #f0f4ff; padding: 10px 14px; border-radius: 6px; border: 1px solid #dbeafe; }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e8ecf0; }
    .footer p { font-size: 12px; color: #a0aec0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9.5L12 3l9 6.5V21H3V9.5z"/></svg>
        </div>
        <div class="logo-text">WAA PropFlow</div>
        <div class="logo-sub">Property Management Platform</div>
      </div>
      <div class="body">
        <div class="urgency-banner">
          <div class="urgency-label">⏰ ${urgencyLabel}</div>
        </div>
        <div class="greeting">Don't miss your portal access, ${tenantName}!</div>
        <p class="intro">
          Your invitation to access the <strong>WAA PropFlow tenant portal</strong> is expiring soon.
          Once it expires, you'll need to contact your property manager to get a new link.
          Click the button below now to set up your account.
        </p>
        <div class="cta-wrapper">
          <a href="${inviteUrl}" class="cta-btn">Activate My Account →</a>
        </div>
        <hr class="divider" />
        <p class="fallback-label">Or copy this link into your browser:</p>
        <div class="fallback-url">${inviteUrl}</div>
      </div>
      <div class="footer">
        <p>
          You received this reminder because your portal invite is expiring soon.<br />
          If you've already activated your account, you can safely ignore this email.<br />
          &copy; ${new Date().getFullYear()} WAA PropFlow. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export interface SendInviteReminderEmailParams {
  to: string;
  tenantName: string;
  inviteUrl: string;
  hoursLeft: number;
}

/**
 * Send a reminder email to a tenant whose invite token is expiring within 24 hours.
 * Never throws — callers should handle the failure gracefully.
 */
export async function sendInviteReminderEmail(
  params: SendInviteReminderEmailParams
): Promise<SendInviteEmailResult> {
  const { to, tenantName, inviteUrl, hoursLeft } = params;

  try {
    const resend = getResend();
    const html = buildReminderEmailHtml({ tenantName, inviteUrl, hoursLeft });

    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject: `⏰ Your WAA PropFlow portal invite expires in ~${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}`,
      html,
    });

    if (error) {
      console.error("[Email] Reminder Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Reminder sent to ${to} — id: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending reminder:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Unknown email error" };
  }
}

// ─── Password Reset Email ─────────────────────────────────────────────────────
export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const { to, name, resetUrl } = params;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 14px;margin-right:12px;">
                <span style="color:#fff;font-size:20px;">🏢</span>
              </td>
              <td style="padding-left:12px;">
                <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WAA PropFlow</div>
                <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:2px;">Property Management</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 8px;">Reset your password</h1>
            <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Hi ${name}, we received a request to reset the password for your WAA PropFlow account.
              Click the button below to choose a new password.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#2563eb;border-radius:8px;">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.2px;">
                    Reset Password →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;">
              This link expires in <strong style="color:#94a3b8;">1 hour</strong>.
              If you didn't request a password reset, you can safely ignore this email — your password won't change.
            </p>
            <p style="color:#475569;font-size:12px;margin:16px 0 0;">
              Or copy this URL into your browser:<br/>
              <span style="color:#3b82f6;word-break:break-all;">${resetUrl}</span>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#13161f;padding:20px 40px;border-top:1px solid #1e2433;">
            <p style="color:#475569;font-size:12px;margin:0;text-align:center;">
              WAA PropFlow · Property Management Software<br/>
              You're receiving this because a password reset was requested for your account.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: "Reset your WAA PropFlow password",
      html,
    });

    if (error) {
      console.error("[Email] Failed to send password reset email:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Password reset sent to ${to} — id: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending reset email:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Unknown email error" };
  }
}

// ─── Staff Invite Email ───────────────────────────────────────────────────────
export async function sendStaffInviteEmail({
  to,
  name,
  inviteUrl,
  inviterName,
}: {
  to: string;
  name: string;
  inviteUrl: string;
  inviterName: string;
}): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] Resend not configured — skipping staff invite email");
    return { success: false, error: "Email service not configured" };
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to WAA PropFlow</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:36px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">WAA PropFlow</h1>
            <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Property Management Software</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">You've been invited to join the team</h2>
            <p style="margin:0 0 12px;color:#475569;font-size:15px;line-height:1.6;">
              Hi <strong>${name}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              <strong>${inviterName}</strong> has invited you to join their organization on <strong>WAA PropFlow</strong>.
              Click the button below to set up your password and access your account.
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#2563eb;border-radius:8px;">
                  <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">
                    Accept Invitation &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">
              This invitation link expires in <strong>7 days</strong>. If you weren't expecting this, you can safely ignore this email.
            </p>
            <p style="margin:0;color:#94a3b8;font-size:12px;word-break:break-all;">
              Or copy this link: <a href="${inviteUrl}" style="color:#2563eb;">${inviteUrl}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} WAA PropFlow &mdash; Property Management Software
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: `${inviterName} invited you to WAA PropFlow`,
      html,
    });

    if (error) {
      console.error("[Email] Failed to send staff invite email:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Staff invite sent to ${to} — id: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending staff invite email:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Unknown email error" };
  }
}
