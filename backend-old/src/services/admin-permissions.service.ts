import { prisma } from "../config/database.js";

export async function loadRolePermissions(roleId: bigint): Promise<string[]> {
  const perms = await prisma.$queryRaw<Array<{ module: string; action: string }>>`
    SELECT p.module, p.action
    FROM role_permissions rp
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ${roleId}
  `;
  return perms.map((p) => `${p.module}.${p.action}`);
}
