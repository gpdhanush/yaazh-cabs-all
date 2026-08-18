import 'package:yaazh_admin/features/auth/domain/admin_user.dart';

/// Permission keys returned by the admin API (`module.action`).
class AdminPermissions {
  static const dashboardView = 'dashboard.view';
  static const bookingsView = 'bookings.view';
  static const customersView = 'customers.view';
  static const driversView = 'drivers.view';
  static const vehiclesManage = 'vehicles.manage';
  static const vehicleCategoriesManage = 'vehicle_categories.manage';
  static const tariffManage = 'tariff.manage';
  static const reviewsApprove = 'reviews.approve';
  static const reportsView = 'reports.view';
  static const supportManage = 'support.manage';
  static const notificationsSend = 'notifications.send';
  static const settingsManage = 'settings.manage';
}

extension AdminUserPermissions on AdminUser {
  bool get permissionsLoaded => permissions != null;

  bool hasPermission(String key) {
    final perms = permissions;
    if (perms == null) return true;
    return perms.contains(key);
  }

  bool hasAnyPermission(Iterable<String> keys) =>
      keys.any(hasPermission);
}

/// Drawer / tab items gated by permission. `null` permission = always visible.
class AdminNavItem {
  final String label;
  final String route;
  final String? permission;

  const AdminNavItem({
    required this.label,
    required this.route,
    this.permission,
  });
}

const adminDrawerItems = [
  AdminNavItem(
    label: 'Drivers',
    route: '/drivers',
    permission: AdminPermissions.driversView,
  ),
  AdminNavItem(
    label: 'Customers',
    route: '/customers',
    permission: AdminPermissions.customersView,
  ),
  AdminNavItem(
    label: 'Vehicles',
    route: '/fleet',
    permission: AdminPermissions.vehiclesManage,
  ),
  AdminNavItem(
    label: 'Categories',
    route: '/vehicle-categories',
    permission: AdminPermissions.vehicleCategoriesManage,
  ),
  AdminNavItem(
    label: 'Tariffs',
    route: '/tariffs',
    permission: AdminPermissions.tariffManage,
  ),
];

const adminWebsiteDrawerItems = [
  AdminNavItem(
    label: 'Testimonials',
    route: '/testimonials',
    permission: AdminPermissions.reviewsApprove,
  ),
  AdminNavItem(
    label: 'Gallery',
    route: '/gallery',
  ),
  AdminNavItem(
    label: 'Reports',
    route: '/reports',
    permission: AdminPermissions.reportsView,
  ),
];

class AdminShellTab {
  final int branchIndex;
  final String route;
  final String label;
  final String? permission;

  const AdminShellTab({
    required this.branchIndex,
    required this.route,
    required this.label,
    this.permission,
  });
}

const adminShellTabs = [
  AdminShellTab(
    branchIndex: 0,
    route: '/home',
    label: 'Home',
    permission: AdminPermissions.dashboardView,
  ),
  AdminShellTab(
    branchIndex: 1,
    route: '/bookings',
    label: 'Bookings',
    permission: AdminPermissions.bookingsView,
  ),
  AdminShellTab(
    branchIndex: 2,
    route: '/enquiries',
    label: 'Enquiries',
    permission: AdminPermissions.supportManage,
  ),
  AdminShellTab(branchIndex: 3, route: '/settings', label: 'Settings'),
];

List<AdminNavItem> visibleDrawerItems(AdminUser? user) {
  if (user?.permissionsLoaded != true) return adminDrawerItems;
  bool allowed(AdminNavItem item) =>
      item.permission == null || user!.hasPermission(item.permission!);
  return adminDrawerItems.where(allowed).toList();
}

List<AdminNavItem> visibleWebsiteDrawerItems(AdminUser? user) {
  if (user?.permissionsLoaded != true) return adminWebsiteDrawerItems;
  bool allowed(AdminNavItem item) =>
      item.permission == null || user!.hasPermission(item.permission!);
  return adminWebsiteDrawerItems.where(allowed).toList();
}

List<AdminShellTab> visibleShellTabs(AdminUser? user) {
  if (user?.permissionsLoaded != true) return adminShellTabs;
  bool allowed(AdminShellTab tab) =>
      tab.permission == null || user!.hasPermission(tab.permission!);
  return adminShellTabs.where(allowed).toList();
}

String? permissionForRoute(String path) {
  for (final item in [...adminDrawerItems, ...adminWebsiteDrawerItems]) {
    if (path.startsWith(item.route)) return item.permission;
  }
  if (path.startsWith('/notifications')) {
    return AdminPermissions.notificationsSend;
  }
  if (path.startsWith('/web-settings')) {
    return AdminPermissions.settingsManage;
  }
  for (final tab in adminShellTabs) {
    if (path.startsWith(tab.route)) return tab.permission;
  }
  return null;
}

bool canAccessRoute(AdminUser? user, String path) {
  if (path.startsWith('/profile') ||
      path.startsWith('/splash') ||
      path.startsWith('/login')) {
    return true;
  }
  if (user?.permissionsLoaded != true) return true;
  final needed = permissionForRoute(path);
  if (needed == null) return true;
  return user!.hasPermission(needed);
}
