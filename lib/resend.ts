import { Resend } from 'resend';

// Lazy-init so missing key at build/import time doesn't crash the server.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'NURA <noreply@nurapersonal.com>';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailOptions) {
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    replyTo,
  });

  if (error) throw new Error(error.message);
  return data;
}

/** Transactional: welcome email sent after first sign-in. */
export function buildWelcomeEmail(name: string): { subject: string; html: string; text: string } {
  const displayName = name || 'there';
  return {
    subject: 'Welcome to NURA',
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#fcfaf7;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fcfaf7;">
    <tr><td align="center" style="padding:64px 24px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-bottom:1px solid #e5e5e5;">
        <tr><td style="padding:48px 48px 0;border-bottom:1px solid #000;">
          <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#000;">NURA</p>
        </td></tr>
        <tr><td style="padding:40px 48px;">
          <h1 style="margin:0 0 24px;font-size:32px;font-style:italic;font-weight:500;letter-spacing:0.02em;color:#000;">
            Welcome, ${displayName}.
          </h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.75;color:#000;letter-spacing:0.02em;">
            Your AI executive assistant is ready. Chat with NURA to schedule meetings, manage your calendar, and stay on top of what matters.
          </p>
          <p style="margin:0 0 32px;font-size:14px;line-height:1.75;color:rgba(0,0,0,0.5);letter-spacing:0.02em;">
            Head to your home dashboard to get started.
          </p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="border-bottom:1px solid #000;">
              <a href="${process.env.NEXTAUTH_URL || 'https://nurapersonal.com'}/home"
                 style="display:inline-block;padding:16px 32px;font-size:13px;font-weight:500;letter-spacing:0.08em;color:#000;text-decoration:none;text-transform:uppercase;">
                Open NURA →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 48px;border-top:1px solid #e5e5e5;">
          <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.4);letter-spacing:0.05em;">
            NURA · AI Executive Assistant
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Welcome to NURA, ${displayName}.\n\nYour AI executive assistant is ready.\nOpen your dashboard: ${process.env.NEXTAUTH_URL || 'https://nurapersonal.com'}/home\n\n— NURA`,
  };
}
