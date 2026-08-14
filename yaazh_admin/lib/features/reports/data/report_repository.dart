import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/reports/domain/report.dart';

final reportPeriodProvider = StateProvider<String>((ref) => 'day');

final reportRepositoryProvider = Provider<ReportRepository>((ref) {
  return ReportRepository(ref.watch(apiClientProvider));
});

final reportsProvider = FutureProvider.autoDispose<ReportsPayload>((ref) {
  final period = ref.watch(reportPeriodProvider);
  return ref.watch(reportRepositoryProvider).fetch(period);
});

class ReportRepository {
  final ApiClient _api;

  ReportRepository(this._api);

  Future<ReportsPayload> fetch(String period) async {
    final data = await _api.get('/admin/reports', queryParameters: {
      'period': period,
    });
    if (data is Map<String, dynamic>) return ReportsPayload.fromJson(data);
    if (data is Map) {
      return ReportsPayload.fromJson(Map<String, dynamic>.from(data));
    }
    return const ReportsPayload(
      period: 'day',
      counts: ReportCounts(
        bookings: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        revenue: 0,
      ),
      series: [],
      byStatus: [],
    );
  }
}
