import { prisma } from "../config/database.js";
import { loadEnv } from "../config/env.js";
import { sha256, randomToken, hashPassword, verifyPassword } from "../utils/crypto.js";
import { signJwt } from "../utils/jwt.js";
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from "../errors/app-error.js";

type UserType = "customer" | "driver" | "admin";

async function issueTokens(params: {
  userType: UserType;
  userId: bigint;
  ip?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
}) {
  const env = loadEnv();
  const refresh = randomToken(48);
  const refreshHash = sha256(refresh);
  const expires = new Date(Date.now() + env.JWT_REFRESH_TTL * 1000);

  const session = await prisma.authSessions.create({
    data: {
      user_type: params.userType,
      customer_id: params.userType === "customer" ? params.userId : null,
      driver_id: params.userType === "driver" ? params.userId : null,
      admin_user_id: params.userType === "admin" ? params.userId : null,
      refresh_token_hash: refreshHash,
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      device_name: params.deviceName ?? null,
      expires_at: expires,
      last_used_at: new Date(),
    },
  });

  const accessToken = signJwt(
    {
      sub: String(params.userId),
      typ: params.userType,
      sid: String(session.id),
    },
    env.JWT_ACCESS_TTL,
  );

  return {
    access_token: accessToken,
    refresh_token: refresh,
    token_type: "Bearer",
    expires_in: env.JWT_ACCESS_TTL,
  };
}

export const authService = {
  async registerCustomer(input: {
    name: string;
    phone: string;
    password: string;
    email?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const existing = await prisma.customers.findUnique({ where: { phone: input.phone } });
    if (existing) throw new ConflictError("Phone already registered.");

    const password_hash = await hashPassword(input.password);
    const customer = await prisma.customers.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        password_hash,
        phone_verified_at: new Date(),
      },
    });

    const tokens = await issueTokens({
      userType: "customer",
      userId: customer.id,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      user: {
        id: String(customer.id),
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      ...tokens,
    };
  },

  async loginCustomer(input: {
    phone: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }) {
    const customer = await prisma.customers.findUnique({ where: { phone: input.phone } });
    if (!customer?.password_hash) throw new UnauthorizedError("Invalid credentials.");
    if (!customer.is_active || customer.app_status !== "active") {
      throw new UnauthorizedError("Account is not active.");
    }
    const ok = await verifyPassword(customer.password_hash, input.password);
    if (!ok) throw new UnauthorizedError("Invalid credentials.");

    await prisma.customers.update({
      where: { id: customer.id },
      data: { last_login_at: new Date() },
    });

    const tokens = await issueTokens({
      userType: "customer",
      userId: customer.id,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      user: {
        id: String(customer.id),
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      ...tokens,
    };
  },

  async loginDriver(input: {
    phone: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }) {
    const driver = await prisma.drivers.findUnique({ where: { phone: input.phone } });
    if (!driver?.password_hash) throw new UnauthorizedError("Invalid credentials.");
    if (!driver.is_active) throw new UnauthorizedError("Account is not active.");
    const ok = await verifyPassword(driver.password_hash, input.password);
    if (!ok) throw new UnauthorizedError("Invalid credentials.");

    await prisma.drivers.update({
      where: { id: driver.id },
      data: { last_login_at: new Date() },
    });

    const tokens = await issueTokens({
      userType: "driver",
      userId: driver.id,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      user: {
        id: String(driver.id),
        name: driver.name,
        phone: driver.phone,
        verification_status: driver.verification_status,
      },
      ...tokens,
    };
  },

  async loginAdmin(input: {
    email: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }) {
    const admin = await prisma.adminUsers.findUnique({ where: { email: input.email } });
    if (!admin) throw new UnauthorizedError("Invalid credentials.");
    if (!admin.is_active) throw new UnauthorizedError("Account is not active.");
    const ok = await verifyPassword(admin.password_hash, input.password);
    if (!ok) throw new UnauthorizedError("Invalid credentials.");

    await prisma.adminUsers.update({
      where: { id: admin.id },
      data: { last_login_at: new Date() },
    });

    const tokens = await issueTokens({
      userType: "admin",
      userId: admin.id,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      user: {
        id: String(admin.id),
        name: admin.name,
        email: admin.email,
        role_id: String(admin.role_id),
      },
      ...tokens,
    };
  },

  async refresh(refreshToken: string, userType: UserType) {
    const hash = sha256(refreshToken);
    const session = await prisma.authSessions.findFirst({
      where: {
        refresh_token_hash: hash,
        user_type: userType,
        revoked_at: null,
      },
    });
    if (!session || session.expires_at < new Date()) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    await prisma.authSessions.update({
      where: { id: session.id },
      data: { revoked_at: new Date() },
    });

    const userId =
      userType === "customer"
        ? session.customer_id
        : userType === "driver"
          ? session.driver_id
          : session.admin_user_id;
    if (!userId) throw new UnauthorizedError("Invalid session.");

    return issueTokens({
      userType,
      userId,
      ip: session.ip_address,
      userAgent: session.user_agent,
      deviceName: session.device_name,
    });
  },

  async logout(refreshToken: string) {
    const hash = sha256(refreshToken);
    await prisma.authSessions.updateMany({
      where: { refresh_token_hash: hash, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    return { logged_out: true };
  },

  async logoutAll(userType: UserType, userId: bigint) {
    const where =
      userType === "customer"
        ? { user_type: userType, customer_id: userId, revoked_at: null }
        : userType === "driver"
          ? { user_type: userType, driver_id: userId, revoked_at: null }
          : { user_type: userType, admin_user_id: userId, revoked_at: null };
    await prisma.authSessions.updateMany({
      where,
      data: { revoked_at: new Date() },
    });
    return { logged_out_all: true };
  },

  async ensureSeedAdmin(email: string, password: string, name = "Super Admin") {
    const existing = await prisma.adminUsers.findUnique({ where: { email } });
    if (existing) return existing;
    const role = await prisma.adminRoles.findFirst({ where: { name: "Super Admin" } });
    if (!role) throw new AppError(500, "Admin roles not seeded.");
    const password_hash = await hashPassword(password);
    return prisma.adminUsers.create({
      data: {
        role_id: role.id,
        name,
        email,
        password_hash,
      },
    });
  },
};

export function parseAuthBody(body: unknown, fields: string[]): Record<string, string> {
  if (!body || typeof body !== "object") throw new ValidationError();
  const o = body as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (typeof o[f] !== "string" || !(o[f] as string).trim()) {
      throw new ValidationError(`${f} is required.`);
    }
    out[f] = (o[f] as string).trim();
  }
  // copy optional string fields
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && !(k in out)) out[k] = v;
  }
  return out;
}
