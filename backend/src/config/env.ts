import { z } from "zod";

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
  return `mysql://${auth}@${host}:${parts.port}/${parts.name}`;
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default("0.0.0.0"),
    APP_URL: z.string().default("http://localhost:3000"),
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

    JWT_SECRET: z.string().min(16),
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
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
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
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  paymentEnabled: boolean;
  featureLiveTracking: boolean;
  featureWebsocket: boolean;
  featureOnlinePayment: boolean;
  corsOrigins: string[];
};

let cached: Env | null = null;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.parse(raw);

  // Prisma reads process.env.DATABASE_URL
  process.env.DATABASE_URL = parsed.DATABASE_URL;

  cached = {
    ...parsed,
    redisEnabled: bool(parsed.REDIS_ENABLED, false),
    fcmEnabled: bool(parsed.FCM_ENABLED, false),
    mailEnabled: bool(parsed.MAIL_ENABLED, false),
    smsEnabled: bool(parsed.SMS_ENABLED, false),
    whatsappEnabled: bool(parsed.WHATSAPP_ENABLED, false),
    paymentEnabled: bool(parsed.PAYMENT_ENABLED, false),
    featureLiveTracking: bool(parsed.FEATURE_LIVE_TRACKING, true),
    featureWebsocket: bool(parsed.FEATURE_WEBSOCKET, false),
    featureOnlinePayment: bool(parsed.FEATURE_ONLINE_PAYMENT, false),
    corsOrigins: parsed.CORS_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  return cached;
}

export function resetEnvCache() {
  cached = null;
}
