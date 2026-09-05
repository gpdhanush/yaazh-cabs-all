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

function isSmtpAuthError(error) {
  return error?.code === 'EAUTH' || error?.responseCode === 535;
}

module.exports = { enabled, sendAdminPasswordReset, sendBookingInvoice, isSmtpAuthError };
