import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/reports/domain/report.dart';

final _ymd = DateFormat('yyyy-MM-dd');

DateTime _dateOnly(DateTime value) =>
    DateTime(value.year, value.month, value.day);

class ReportDateRange {
  final DateTime from;
  final DateTime to;

  const ReportDateRange({required this.from, required this.to});

  factory ReportDateRange.lastDays(int days) {
    final to = _dateOnly(DateTime.now());
    final from = to.subtract(Duration(days: days - 1));
    return ReportDateRange(from: from, to: to);
  }

  String get fromParam => _ymd.format(from);
  String get toParam => _ymd.format(to);
}

final reportPeriodProvider = StateProvider<String>((ref) => 'day');

final reportDateRangeProvider = StateProvider<ReportDateRange>(
  (ref) => ReportDateRange.lastDays(14),
);

final reportRepositoryProvider = Provider<ReportRepository>((ref) {
  return ReportRepository(ref.watch(apiClientProvider));
});

final reportsProvider = FutureProvider.autoDispose<ReportsPayload>((ref) {
  final period = ref.watch(reportPeriodProvider);
  final range = ref.watch(reportDateRangeProvider);
  return ref.watch(reportRepositoryProvider).fetch(
        period: period,
        range: range,
      );
});

class ReportRepository {
  final ApiClient _api;

  ReportRepository(this._api);

  Future<ReportsPayload> fetch({
    required String period,
    required ReportDateRange range,
  }) async {
    final data = await _api.get('/admin/reports', queryParameters: {
      'period': period,
      'from': range.fromParam,
      'to': range.toParam,
    });
    if (data is Map<String, dynamic>) return ReportsPayload.fromJson(data);
    if (data is Map) {
      return ReportsPayload.fromJson(Map<String, dynamic>.from(data));
    }
    return ReportsPayload(
      period: period,
      from: range.fromParam,
      to: range.toParam,
      counts: const ReportCounts(
        bookings: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        revenue: 0,
      ),
      series: const [],
      byStatus: const [],
    );
  }
}
