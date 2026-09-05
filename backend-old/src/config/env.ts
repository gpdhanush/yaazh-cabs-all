import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/** `tsx` loads .env automatically; `node dist/server.js` does not. */
function loadDotEnvFile() {
  if (typeof process.loadEnvFile !== "function") return;
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "backend/.env"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return;
    }
  }
}

const bool = (v: string | undefined, fallback: boolean) => {
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
};

function encodeUriComponentSafe(value: string): string {
  return encodeURIComponent(value);
}

/** Build mysql:// URL from split DB_* keys. */
export function buildDatabaseUrl(parts: {
  host: string;
  port: number | string;
  user: string;
  password?: string;
  name: string;
}): string {
  // Host must be hostname/IP only — never include http:// or mysql://
  const host = parts.host
    .trim()
    .replace(/^(https?|mysql):\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  const user = encodeUriComponentSafe(parts.user);
  const password = parts.password ? encodeUriComponentSafe(parts.password) : "";
  const auth = password ? `${user}:${password}` : `${user}:`;
  return `mysql://${auth}@${host}:${parts.port}/${parts.name}?charset=utf8mb4`;
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default("0.0.0.0"),
    APP_URL: z.string().default("http://localhost:3000"),
    PUBLIC_WEB_URL: z.string().default("https://yaazhcabs.in"),
    API_PREFIX: z.string().default("/api"),
    APP_NAME: z.string().default("Yaazh Cab Booking API"),

    // Preferred split DB config (cPanel-friendly)
    DB_HOST: z.string().default("127.0.0.1"),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().default("root"),
    DB_PASSWORD: z.string().optional().default(""),
    DB_NAME: z.string().default("yaazh_cab_booking"),

    // Optional full URL override
    DATABASE_URL: z.string().optional(),

    JWT_SECRET: z.string().min(16).default("development-only-secret-change-me"),
    JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),
    REDIS_ENABLED: z.string().optional(),
    FCM_ENABLED: z.string().optional(),
    FCM_PROJECT_ID: z.string().optional().default(""),
    FCM_CLIENT_EMAIL: z.string().optional().default(""),
    FCM_PRIVATE_KEY: z.string().optional().default(""),
    MAIL_ENABLED: z.string().optional(),
    MAIL_HOST: z.string().optional().default(""),
    MAIL_PORT: z.coerce.number().int().default(587),
    MAIL_USERNAME: z.string().optional().default(""),
    MAIL_PASSWORD: z.string().optional().default(""),
    MAIL_ENCRYPTION: z.string().optional().default("tls"),
    MAIL_FROM_ADDRESS: z.string().optional().default(""),
    MAIL_FROM_NAME: z.string().optional().default("Yaazh Cabs"),
    MAIL_DEBUG: z.string().optional(),
    MAIL_LOGGER: z.string().optional(),
    MAIL_TLS_REJECT: z.string().optional(),
    MAIL_CONN_TIMEOUT: z.coerce.number().int().positive().default(30_000),
    MAIL_GREETING_TIMEOUT: z.coerce.number().int().positive().default(20_000),
    MAIL_SOCKET_TIMEOUT: z.coerce.number().int().positive().default(45_000),
    MAIL_IPV4: z.string().optional(),
    SMS_ENABLED: z.string().optional(),
    WHATSAPP_ENABLED: z.string().optional(),
    PAYMENT_ENABLED: z.string().optional(),
    MAP_PROVIDER: z.enum(["haversine", "osrm"]).default("haversine"),
    OSRM_BASE_URL: z.string().optional().default(""),
    NOMINATIM_BASE_URL: z.string().optional().default(""),
    STORAGE_DRIVER: z.enum(["local"]).default("local"),
    STORAGE_PATH: z.string().default("./storage"),
    CORS_ORIGINS: z.string().default("http://localhost:4000"),
    LOG_LEVEL: z.string().default("info"),
    FEATURE_LIVE_TRACKING: z.string().optional(),
    FEATURE_WEBSOCKET: z.string().optional(),
    FEATURE_ONLINE_PAYMENT: z.string().optional(),
    DB_CONNECTION_LIMIT: z.coerce.number().int().positive().max(50).default(5),
    DB_POOL_TIMEOUT: z.coerce.number().int().positive().max(300).default(10),
    DB_CONNECT_TIMEOUT: z.coerce.number().int().positive().max(60).default(10),
    DB_AUTO_UTF8MB4: z.string().optional(),
  })
  .transform((data) => {
    const DATABASE_URL =
      data.DATABASE_URL && data.DATABASE_URL.trim().length > 0
        ? data.DATABASE_URL.trim()
        : buildDatabaseUrl({
            host: data.DB_HOST,
            port: data.DB_PORT,
            user: data.DB_USER,
            password: data.DB_PASSWORD ?? "",
            name: data.DB_NAME,
          });
    return { ...data, DATABASE_URL };
  });

export type Env = z.output<typeof envSchema> & {
  redisEnabled: boolean;
  fcmEnabled: boolean;
  mailEnabled: boolean;
  mailDebug: boolean;
  mailLogger: boolean;
  mailTlsRejectUnauthorized: boolean;
  mailIpv4: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  paymentEnabled: boolean;
  featureLiveTracking: boolean;
  featureWebsocket: boolean;
  featureOnlinePayment: boolean;
  dbAutoUtf8mb4: boolean;
  corsOrigins: string[];
};

let cached: Env | null = null;

/** Map EMAIL_* aliases (cPanel / nodemailer-style) onto MAIL_* before parse. */
function applyEmailAliases(env: NodeJS.ProcessEnv) {
  const setIfEmpty = (mailKey: string, emailKey: string) => {
    if (!env[mailKey] && env[emailKey]) env[mailKey] = env[emailKey];
  };
  setIfEmpty("MAIL_HOST", "EMAIL_HOST");
  setIfEmpty("MAIL_USERNAME", "EMAIL_USER");
  setIfEmpty("MAIL_PASSWORD", "EMAIL_PASS");
  setIfEmpty("MAIL_PORT", "EMAIL_PORT");
  setIfEmpty("MAIL_DEBUG", "EMAIL_DEBUG");
  setIfEmpty("MAIL_LOGGER", "EMAIL_LOGGER");
  setIfEmpty("MAIL_TLS_REJECT", "EMAIL_TLS_REJECT");
  setIfEmpty("MAIL_CONN_TIMEOUT", "EMAIL_CONN_TIMEOUT");
  setIfEmpty("MAIL_GREETING_TIMEOUT", "EMAIL_GREETING_TIMEOUT");
  setIfEmpty("MAIL_SOCKET_TIMEOUT", "EMAIL_SOCKET_TIMEOUT");
  setIfEmpty("MAIL_IPV4", "EMAIL_IPV4");
  if (!env.MAIL_ENABLED && (env.EMAIL_HOST || env.MAIL_HOST)) env.MAIL_ENABLED = "true";

  if (!env.MAIL_ENCRYPTION) {
    const secure = env.EMAIL_SECURE;
    const port = Number(env.MAIL_PORT || env.EMAIL_PORT || 587);
    if (port === 465) env.MAIL_ENCRYPTION = "ssl";
    else if (secure && ["1", "true", "yes", "on"].includes(secure.toLowerCase())) env.MAIL_ENCRYPTION = "ssl";
    else if (secure && ["0", "false", "no", "off"].includes(secure.toLowerCase())) env.MAIL_ENCRYPTION = "tls";
  }

  const from = env.EMAIL_FROM?.trim();
  if (from && (!env.MAIL_FROM_ADDRESS || !env.MAIL_FROM_NAME)) {
    const match = from.match(/^(.*)<([^>]+)>$/);
    if (match) {
      if (!env.MAIL_FROM_NAME) env.MAIL_FROM_NAME = match[1]!.trim().replace(/^"|"$/g, "") || "Yaazh Cabs";
      if (!env.MAIL_FROM_ADDRESS) env.MAIL_FROM_ADDRESS = match[2]!.trim();
    } else if (!env.MAIL_FROM_ADDRESS) {
      env.MAIL_FROM_ADDRESS = from;
    }
  }
}

export function loadEnv(raw?: NodeJS.ProcessEnv): Env {
  if (cached) return cached;
  if (!raw) loadDotEnvFile();
  const source = raw ?? process.env;
  applyEmailAliases(source);
  const parsed = envSchema.parse(source);
  if (parsed.NODE_ENV === "production" && !source.JWT_SECRET?.trim()) {
    throw new Error("JWT_SECRET must be configured in production");
  }

  // Prisma reads process.env.DATABASE_URL
  process.env.DATABASE_URL = parsed.DATABASE_URL;

  cached = {
    ...parsed,
    redisEnabled: bool(parsed.REDIS_ENABLED, false),
    fcmEnabled: bool(parsed.FCM_ENABLED, false),
    mailEnabled: bool(parsed.MAIL_ENABLED, false),
    mailDebug: bool(parsed.MAIL_DEBUG, false),
    mailLogger: bool(parsed.MAIL_LOGGER, false),
    mailTlsRejectUnauthorized: bool(parsed.MAIL_TLS_REJECT, true),
    mailIpv4: bool(parsed.MAIL_IPV4, true),
    smsEnabled: bool(parsed.SMS_ENABLED, false),
    whatsappEnabled: bool(parsed.WHATSAPP_ENABLED, false),
    paymentEnabled: bool(parsed.PAYMENT_ENABLED, false),
    featureLiveTracking: bool(parsed.FEATURE_LIVE_TRACKING, true),
    featureWebsocket: bool(parsed.FEATURE_WEBSOCKET, false),
    featureOnlinePayment: bool(parsed.FEATURE_ONLINE_PAYMENT, false),
    dbAutoUtf8mb4: bool(parsed.DB_AUTO_UTF8MB4, false),
    corsOrigins: parsed.CORS_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  return cached;
}

export function resetEnvCache() {
  cached = null;
}
