-- Add admin_users view/manage permissions and grant to Super Admin.
-- Safe to re-run.

INSERT INTO permissions (module, action, label)
SELECT 'admin_users', 'view', 'View Admin Users'
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'admin_users' AND action = 'view'
);

INSERT INTO permissions (module, action, label)
SELECT 'admin_users', 'manage', 'Manage Admin Users'
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'admin_users' AND action = 'manage'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
INNER JOIN permissions p ON p.module = 'admin_users'
WHERE r.name = 'Super Admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
