class DashboardStats {
  final int totalBookings;
  final int pendingBookings;
  final int activeDrivers;
  final int customers;
  final int bookingsToday;
  final int enquiries;

  const DashboardStats({
    required this.totalBookings,
    required this.pendingBookings,
    required this.activeDrivers,
    required this.customers,
    required this.bookingsToday,
    required this.enquiries,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    int n(dynamic v) => int.tryParse(v?.toString() ?? '') ?? 0;
    return DashboardStats(
      totalBookings: n(json['total_bookings']),
      pendingBookings: n(json['pending_bookings']),
      activeDrivers: n(json['active_drivers']),
      customers: n(json['customers']),
      bookingsToday: n(json['bookings_today']),
      enquiries: n(json['enquiries']),
    );
  }
}
