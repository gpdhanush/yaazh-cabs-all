import 'package:yaazh_admin/core/format.dart';

class ReportCounts {
  final int bookings;
  final int completed;
  final int cancelled;
  final int pending;
  final double revenue;

  const ReportCounts({
    required this.bookings,
    required this.completed,
    required this.cancelled,
    required this.pending,
    required this.revenue,
  });

  factory ReportCounts.fromJson(Map<String, dynamic> json) {
    return ReportCounts(
      bookings: parseInt(json['bookings']) ?? 0,
      completed: parseInt(json['completed']) ?? 0,
      cancelled: parseInt(json['cancelled']) ?? 0,
      pending: parseInt(json['pending']) ?? 0,
      revenue: parseDouble(json['revenue']) ?? 0,
    );
  }
}

class ReportSeriesPoint {
  final String key;
  final String label;
  final int bookings;
  final int completed;
  final int cancelled;
  final int pending;
  final double revenue;

  const ReportSeriesPoint({
    required this.key,
    required this.label,
    required this.bookings,
    required this.completed,
    required this.cancelled,
    required this.pending,
    required this.revenue,
  });

  factory ReportSeriesPoint.fromJson(Map<String, dynamic> json) {
    return ReportSeriesPoint(
      key: json['key']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      bookings: parseInt(json['bookings']) ?? 0,
      completed: parseInt(json['completed']) ?? 0,
      cancelled: parseInt(json['cancelled']) ?? 0,
      pending: parseInt(json['pending']) ?? 0,
      revenue: parseDouble(json['revenue']) ?? 0,
    );
  }
}

class ReportStatusCount {
  final String status;
  final int count;

  const ReportStatusCount({required this.status, required this.count});

  factory ReportStatusCount.fromJson(Map<String, dynamic> json) {
    return ReportStatusCount(
      status: json['status']?.toString() ?? '',
      count: parseInt(json['count']) ?? 0,
    );
  }
}

class ReportsPayload {
  final String period;
  final ReportCounts counts;
  final List<ReportSeriesPoint> series;
  final List<ReportStatusCount> byStatus;

  const ReportsPayload({
    required this.period,
    required this.counts,
    required this.series,
    required this.byStatus,
  });

  factory ReportsPayload.fromJson(Map<String, dynamic> json) {
    return ReportsPayload(
      period: json['period']?.toString() ?? 'day',
      counts: ReportCounts.fromJson(
        json['counts'] is Map
            ? Map<String, dynamic>.from(json['counts'] as Map)
            : <String, dynamic>{},
      ),
      series: asMapList(json['series']).map(ReportSeriesPoint.fromJson).toList(),
      byStatus: asMapList(json['bookings_by_status']).map(ReportStatusCount.fromJson).toList(),
    );
  }
}
