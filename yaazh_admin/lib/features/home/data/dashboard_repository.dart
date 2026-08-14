import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/home/domain/dashboard_stats.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(ref.watch(apiClientProvider));
});

final dashboardStatsProvider = FutureProvider<DashboardStats>((ref) {
  return ref.watch(dashboardRepositoryProvider).fetch();
});

class DashboardRepository {
  final ApiClient _api;

  DashboardRepository(this._api);

  Future<DashboardStats> fetch() async {
    final data = await _api.get('/admin/dashboard');
    if (data is Map<String, dynamic>) {
      return DashboardStats.fromJson(data);
    }
    if (data is Map) {
      return DashboardStats.fromJson(Map<String, dynamic>.from(data));
    }
    return const DashboardStats(
      totalBookings: 0,
      pendingBookings: 0,
      activeDrivers: 0,
      customers: 0,
      bookingsToday: 0,
      enquiries: 0,
    );
  }
}
