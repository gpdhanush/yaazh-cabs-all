import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { loadEnv } from "../config/env.js";

let transporter: Transporter | null = null;
let warnedDisabled = false;

function mailFrom(): string {
  const env = loadEnv();
  const name = env.MAIL_FROM_NAME?.trim() || "Yaazh Cabs";
  const address = env.MAIL_FROM_ADDRESS?.trim() || env.MAIL_USERNAME;
  return address ? `"${name}" <${address}>` : name;
}

export function getMailTransporter(): Transporter | null {
  const env = loadEnv();
  if (!env.mailEnabled || !env.MAIL_HOST || !env.MAIL_USERNAME || !env.MAIL_PASSWORD) {
    if (!warnedDisabled) {
      warnedDisabled = true;
      console.warn("Mail skipped: set MAIL_ENABLED=true plus MAIL_HOST, MAIL_USERNAME, and MAIL_PASSWORD.");
    }
    return null;
  }
  if (transporter) return transporter;

  const encryption = (env.MAIL_ENCRYPTION || "tls").toLowerCase();
  const secure = encryption === "ssl" || env.MAIL_PORT === 465;

  transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure,
    requireTLS: !secure && encryption === "tls",
    auth: {
      user: env.MAIL_USERNAME,
      pass: env.MAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: env.mailTlsRejectUnauthorized,
    },
    connectionTimeout: env.MAIL_CONN_TIMEOUT,
    greetingTimeout: env.MAIL_GREETING_TIMEOUT,
    socketTimeout: env.MAIL_SOCKET_TIMEOUT,
    logger: env.mailLogger,
    debug: env.mailDebug,
  });
  return transporter;
}

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
};

export async function sendMail(input: SendMailInput): Promise<{ sent: boolean; error?: string }> {
  const transport = getMailTransporter();
  if (!transport) return { sent: false, error: "Mail is not configured." };
  try {
    await transport.sendMail({
      from: mailFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email.";
    console.error("Mail send failed:", message);
    return { sent: false, error: message };
  }
}
