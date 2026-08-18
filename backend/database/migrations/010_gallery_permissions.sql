-- Website gallery view/manage. Super Admin + Content Manager.
-- Safe to re-run.

INSERT INTO permissions (module, action, label)
SELECT 'gallery', 'view', 'View Gallery'
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'gallery' AND action = 'view'
);

INSERT INTO permissions (module, action, label)
SELECT 'gallery', 'manage', 'Manage Gallery'
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE module = 'gallery' AND action = 'manage'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
INNER JOIN permissions p ON p.module = 'gallery'
WHERE r.name IN ('Super Admin', 'Content Manager')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
