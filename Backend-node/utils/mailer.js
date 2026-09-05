const fs = require('fs');
const path = require('path');

function enabled() {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD && process.env.MAIL_FROM_ADDRESS);
}

function envValue(name) {
  const value = process.env[name];
  if (value == null) return value;
  return value.trim().replace(/^("|')(.*)\1$/, '$2');
}

function transporter() {
  if (!enabled()) throw new Error('SMTP mail settings are not configured.');
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (_error) {
    throw Object.assign(new Error('SMTP dependency is missing. Run npm ci in Backend-node.'), { code: 'MAIL_DEPENDENCY_MISSING' });
  }
  const port = Number(envValue('MAIL_PORT') || 465);
  const secureValue = envValue('MAIL_SECURE');
  return nodemailer.createTransport({
    host: envValue('MAIL_HOST'),
    port,
    secure: secureValue == null
      ? String(envValue('MAIL_ENCRYPTION') || '').toLowerCase() === 'ssl' || port === 465
      : secureValue.toLowerCase() === 'true',
    auth: { user: envValue('MAIL_USERNAME'), pass: envValue('MAIL_PASSWORD') },
    authMethod: envValue('MAIL_AUTH_METHOD') || 'LOGIN',
    tls: { rejectUnauthorized: envValue('MAIL_TLS_REJECT') !== 'false' },
  });
}

async function sendAdminPasswordReset({ to, name, resetUrl }) {
  const fromName = process.env.MAIL_FROM_NAME || 'Yaazh Cabs';
  return transporter().sendMail({
    from: `"${fromName}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to,
    subject: 'Reset your Yaazh Cabs admin password',
    text: `Hello ${name || 'Admin'},\n\nUse this link to reset your Yaazh Cabs admin password:\n${resetUrl}\n\nThis link expires in 15 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Hello ${name || 'Admin'},</p><p>Use the link below to reset your Yaazh Cabs admin password:</p><p><a href="${resetUrl}">Reset admin password</a></p><p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendBookingInvoice({ to, name, bookingReference, invoiceNumber, pickup, drop, total, balance, pdf }) {
  const fromName = process.env.MAIL_FROM_NAME || 'Yaazh Cabs';
  const safeName = name || 'Customer';
  const safeReference = bookingReference || 'Booking';
  const safeInvoiceNumber = invoiceNumber || `INV-${safeReference}`;
  const totalText = `INR ${Number(total || 0).toFixed(2)}`;
  const balanceText = `INR ${Number(balance || 0).toFixed(2)}`;
  const logoPath = path.resolve(__dirname, '../storage/public/logo.png');
  const logoAttachment = fs.existsSync(logoPath)
    ? { filename: 'yaazh-cabs-logo.png', path: logoPath, cid: 'yaazh-cabs-logo' }
    : null;
  const logoMarkup = logoAttachment
    ? '<img src="cid:yaazh-cabs-logo" width="170" alt="Yaazh Cabs" style="display:block;width:170px;max-width:100%;height:auto;border:0;" />'
    : `<div style="font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;">${escapeHtml(fromName)}</div>`;
  const attachmentList = [
    ...(logoAttachment ? [logoAttachment] : []),
    { filename: `${safeInvoiceNumber}.pdf`, content: pdf, contentType: 'application/pdf' },
  ];
  return transporter().sendMail({
    from: `"${fromName}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to,
    subject: `Yaazh Cabs invoice ${safeInvoiceNumber} - ${safeReference}`,
    text: [
      `Hello ${safeName},`,
      '',
      `Please find invoice ${safeInvoiceNumber} for booking ${safeReference}.`,
      `${pickup || ''} → ${drop || ''}`,
      `Total: ${totalText}`,
      Number(balance || 0) > 0 ? `Balance due: ${balanceText}` : 'This invoice is paid.',
      '',
      `- ${fromName}`,
    ].join('\n'),
    html: `
      <div style="margin:0;padding:32px 12px;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#172033;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background:#0b1220;">
              ${logoMarkup}
              <p style="margin:18px 0 0;color:#f5b700;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Booking invoice</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">Hello ${escapeHtml(safeName)},</p>
              <h1 style="margin:0;color:#172033;font-size:24px;line-height:1.25;">Your invoice is ready</h1>
              <p style="margin:14px 0 0;color:#64748b;font-size:14px;line-height:1.6;">Your Yaazh Cabs invoice is attached to this email. Here is a quick summary of your trip.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0 0 5px;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Invoice number</p>
                    <p style="margin:0;color:#172033;font-size:14px;font-weight:700;">${escapeHtml(safeInvoiceNumber)}</p>
                  </td>
                  <td style="padding:16px;border-bottom:1px solid #e2e8f0;text-align:right;">
                    <p style="margin:0 0 5px;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Booking reference</p>
                    <p style="margin:0;color:#172033;font-size:14px;font-weight:700;">${escapeHtml(safeReference)}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:16px;">
                    <p style="margin:0 0 8px;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Route</p>
                    <p style="margin:0;color:#172033;font-size:15px;font-weight:700;line-height:1.5;">${escapeHtml(pickup)} <span style="color:#f5b700;">&#8594;</span> ${escapeHtml(drop)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="50%" style="padding:20px;background:#fff8df;border-radius:12px 0 0 12px;">
                    <p style="margin:0 0 8px;color:#927000;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Total</p>
                    <p style="margin:0;color:#172033;font-size:22px;font-weight:700;">${escapeHtml(totalText)}</p>
                  </td>
                  <td width="50%" style="padding:20px;background:#f0fdf4;border-radius:0 12px 12px 0;">
                    <p style="margin:0 0 8px;color:#15803d;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Balance due</p>
                    <p style="margin:0;color:#172033;font-size:22px;font-weight:700;">${escapeHtml(balanceText)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
              Thank you for riding with ${escapeHtml(fromName)}. Please keep the attached invoice for your records.
            </td>
          </tr>
        </table>
      </div>
    `,
    attachments: attachmentList,
  });
}

function isSmtpAuthError(error) {
  return error?.code === 'EAUTH' || error?.responseCode === 535;
}

module.exports = { enabled, sendAdminPasswordReset, sendBookingInvoice, isSmtpAuthError };
