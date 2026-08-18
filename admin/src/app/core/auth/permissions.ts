export type NavItem = {
  label: string;
  path: string;
  icon: string;
  permission?: string;
};

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', permission: 'dashboard.view' },
  { label: 'Bookings', path: '/bookings', icon: 'local_taxi', permission: 'bookings.view' },
  { label: 'Customers', path: '/customers', icon: 'group', permission: 'customers.view' },
  { label: 'Drivers', path: '/drivers', icon: 'badge', permission: 'drivers.view' },
  { label: 'Reports', path: '/reports', icon: 'insights', permission: 'reports.view' },
  { label: 'Vehicles', path: '/vehicles', icon: 'directions_car', permission: 'vehicles.manage' },
  {
    label: 'Assignments',
    path: '/driver-assignments',
    icon: 'link',
    permission: 'driver_assignments.manage',
  },
  {
    label: 'Categories',
    path: '/vehicle-categories',
    icon: 'category',
    permission: 'vehicle_categories.manage',
  },
  { label: 'Routes', path: '/routes', icon: 'alt_route', permission: 'routes.manage' },
  { label: 'Tariffs', path: '/tariffs', icon: 'payments', permission: 'tariff.manage' },
  { label: 'FAQs', path: '/faqs', icon: 'help', permission: 'faq.manage' },
  { label: 'Testimonials', path: '/testimonials', icon: 'star', permission: 'reviews.approve' },
  { label: 'Gallery', path: '/gallery', icon: 'photo_library', permission: 'gallery.manage' },
  { label: 'Enquiries', path: '/enquiries', icon: 'mail', permission: 'support.manage' },
  { label: 'Notifications', path: '/notifications', icon: 'notifications', permission: 'notifications.send' },
  { label: 'Users', path: '/admin-users', icon: 'manage_accounts', permission: 'admin_users.view' },
  { label: 'Roles', path: '/roles', icon: 'verified_user', permission: 'admin_users.view' },
  { label: 'Remote config', path: '/remote-config', icon: 'tune', permission: 'remote_config.manage' },
  { label: 'Settings', path: '/settings', icon: 'settings', permission: 'settings.manage' },
  { label: 'Appearance', path: '/appearance', icon: 'palette', permission: 'settings.manage' },
];

export function permissionForPath(path: string): string | undefined {
  const hit = ADMIN_NAV_ITEMS.find((item) =>
    item.path === '/dashboard' ? path === '/dashboard' : path.startsWith(item.path),
  );
  return hit?.permission;
}

export function hasAccess(permissions: string[] | undefined, needed?: string): boolean {
  if (!needed) return true;
  if (permissions === undefined) return true;
  if (permissions.includes(needed)) return true;
  if (needed === 'gallery.view' || needed === 'gallery.manage') {
    return (
      permissions.includes('gallery.manage') ||
      permissions.includes('cms.manage') ||
      permissions.includes('admin_users.manage') ||
      (needed === 'gallery.view' && permissions.includes('gallery.view'))
    );
  }
  return false;
}

export function filterNavByPermissions(
  items: NavItem[],
  permissions: string[] | undefined,
): NavItem[] {
  if (permissions === undefined) return items;
  return items.filter((item) => hasAccess(permissions, item.permission));
}
