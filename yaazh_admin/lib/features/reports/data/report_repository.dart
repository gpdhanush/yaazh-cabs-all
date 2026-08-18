import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_admin/core/format.dart';
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

  bool contains(DateTime value) {
    final day = _dateOnly(value.toLocal());
    return !day.isBefore(from) && !day.isAfter(to);
  }
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
    var payload = _payloadFrom(
      await _api.get('/admin/reports', queryParameters: {
        'period': period,
        'from': range.fromParam,
        'to': range.toParam,
      }),
      period,
      range,
    );

    var bookings = payload.bookings;
    try {
      final fromList = _bookingsFromList(
        await _api.get('/admin/bookings', queryParameters: {
          'page': 1,
          'per_page': 500,
          'from': range.fromParam,
          'to': range.toParam,
        }),
        range,
      );
      if (fromList.isNotEmpty) bookings = fromList;
    } catch (_) {}

    final counts = bookings.isNotEmpty ? _countsFrom(bookings) : payload.counts;
    return payload.copyWith(counts: counts, bookings: bookings);
  }

  ReportsPayload _payloadFrom(
    dynamic data,
    String period,
    ReportDateRange range,
  ) {
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
      bookings: const [],
    );
  }

  List<ReportBooking> _bookingsFromList(dynamic data, ReportDateRange range) {
    return asMapList(data)
        .where((json) {
          final raw = json['created_at']?.toString() ??
              json['pickup_at']?.toString() ??
              '';
          final parsed = DateTime.tryParse(raw);
          if (parsed == null) return true;
          return range.contains(parsed);
        })
        .map(ReportBooking.fromJson)
        .toList();
  }

  ReportCounts _countsFrom(List<ReportBooking> bookings) {
    var completed = 0;
    var cancelled = 0;
    var pending = 0;
    var revenue = 0.0;
    for (final booking in bookings) {
      switch (booking.status) {
        case 'completed':
          completed++;
          revenue += booking.amount;
        case 'cancelled':
        case 'rejected':
        case 'no_show':
          cancelled++;
        default:
          pending++;
      }
    }
    return ReportCounts(
      bookings: bookings.length,
      completed: completed,
      cancelled: cancelled,
      pending: pending,
      revenue: revenue,
    );
  }
}
