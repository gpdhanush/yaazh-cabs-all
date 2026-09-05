function enabled() {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD && process.env.MAIL_FROM_ADDRESS);
}

function transporter() {
  if (!enabled()) throw new Error('SMTP mail settings are not configured.');
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (_error) {
    throw Object.assign(new Error('SMTP dependency is missing. Run npm ci in Backend-node.'), { code: 'MAIL_DEPENDENCY_MISSING' });
  }
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 465),
    secure: String(process.env.MAIL_ENCRYPTION || '').toLowerCase() === 'ssl' || Number(process.env.MAIL_PORT) === 465,
    auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD },
    tls: { rejectUnauthorized: process.env.MAIL_TLS_REJECT !== 'false' },
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

async function sendBookingInvoice({ to, name, bookingReference, pdf }) {
  const fromName = process.env.MAIL_FROM_NAME || 'Yaazh Cabs';
  return transporter().sendMail({
    from: `"${fromName}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to,
    subject: `Yaazh Cabs invoice ${bookingReference}`,
    text: `Hello ${name || 'Customer'},\n\nPlease find your Yaazh Cabs invoice attached.`,
    attachments: [{ filename: `invoice-${bookingReference}.pdf`, content: pdf, contentType: 'application/pdf' }],
  });
}

module.exports = { enabled, sendAdminPasswordReset, sendBookingInvoice };
