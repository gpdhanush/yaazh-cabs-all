import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyJwt, type JwtPayload } from "../utils/jwt.js";
import { UnauthorizedError, ForbiddenError } from "../errors/app-error.js";
import { prisma } from "../config/database.js";
import { loadRolePermissions } from "../services/admin-permissions.service.js";

export type AuthUser = {
  id: bigint;
  typ: "customer" | "driver" | "admin";
  sessionId?: bigint;
  permissions?: string[];
};

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthUser;
  }
}

function bearer(req: FastifyRequest): string {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) throw new UnauthorizedError("Missing bearer token.");
  return h.slice(7);
}

export async function authenticate(
  req: FastifyRequest,
  _reply: FastifyReply,
  allowed: Array<"customer" | "driver" | "admin">,
) {
  const token = bearer(req);
  let payload: JwtPayload;
  try {
    payload = verifyJwt(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired token.");
  }
  if (!allowed.includes(payload.typ)) {
    throw new ForbiddenError("Wrong account type for this endpoint.");
  }
  const id = BigInt(payload.sub);
  const auth: AuthUser = {
    id,
    typ: payload.typ,
    sessionId: payload.sid ? BigInt(payload.sid) : undefined,
  };

  if (payload.typ === "admin") {
    const admin = await prisma.adminUsers.findFirst({
      where: { id, is_active: true },
    });
    if (!admin) throw new UnauthorizedError("Admin account inactive.");
    auth.permissions = await loadRolePermissions(admin.role_id);
  }

  if (payload.typ === "customer") {
    const c = await prisma.customers.findFirst({
      where: { id, is_active: true, app_status: "active" },
    });
    if (!c) throw new UnauthorizedError("Customer account inactive.");
  }

  if (payload.typ === "driver") {
    const d = await prisma.drivers.findFirst({
      where: { id, is_active: true },
    });
    if (!d) throw new UnauthorizedError("Driver account inactive.");
  }

  req.auth = auth;
}

export function requireAuth(...types: Array<"customer" | "driver" | "admin">) {
  return async (req: FastifyRequest, reply: FastifyReply) => authenticate(req, reply, types);
}

export function requirePermission(...needed: string[]) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    if (!req.auth || req.auth.typ !== "admin") throw new ForbiddenError();
    const perms = req.auth.permissions ?? [];
    const ok = needed.every((n) => perms.includes(n));
    if (!ok) throw new ForbiddenError("Missing required permission.");
  };
}

export function requireUser(req: FastifyRequest): AuthUser {
  if (!req.auth) throw new UnauthorizedError();
  return req.auth;
}
