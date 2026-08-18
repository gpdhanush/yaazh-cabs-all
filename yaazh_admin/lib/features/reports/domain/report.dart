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

class ReportBooking {
  final String reference;
  final String customerName;
  final String pickup;
  final String drop;
  final String status;
  final double amount;
  final double? km;
  final String? pickupAt;

  const ReportBooking({
    required this.reference,
    this.customerName = '',
    required this.pickup,
    required this.drop,
    required this.status,
    required this.amount,
    this.km,
    this.pickupAt,
  });

  factory ReportBooking.fromJson(Map<String, dynamic> json) {
    return ReportBooking(
      reference: json['reference']?.toString() ?? json['booking_reference']?.toString() ?? '',
      customerName: json['customer_name']?.toString() ?? json['customer']?.toString() ?? '',
      pickup: json['pickup']?.toString() ?? json['pickup_location']?.toString() ?? '',
      drop: json['drop']?.toString() ?? json['drop_location']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      amount: parseDouble(json['amount']) ??
          parseDouble(json['final_total']) ??
          parseDouble(json['estimated_total']) ??
          0,
      km: () {
        final actual = parseDouble(json['km']) ??
            parseDouble(json['actual_distance_km']) ??
            parseDouble(json['odometer_difference_km']);
        if (actual != null && actual > 0) return actual;
        final estimated = parseDouble(json['estimated_distance_km']);
        if (estimated != null && estimated > 0) return estimated;
        return null;
      }(),
      pickupAt: json['pickup_at']?.toString(),
    );
  }
}

class ReportsPayload {
  final String period;
  final String? from;
  final String? to;
  final ReportCounts counts;
  final List<ReportSeriesPoint> series;
  final List<ReportStatusCount> byStatus;
  final List<ReportBooking> bookings;

  const ReportsPayload({
    required this.period,
    this.from,
    this.to,
    required this.counts,
    required this.series,
    required this.byStatus,
    this.bookings = const [],
  });

  factory ReportsPayload.fromJson(Map<String, dynamic> json) {
    return ReportsPayload(
      period: json['period']?.toString() ?? 'day',
      from: json['from']?.toString(),
      to: json['to']?.toString(),
      counts: ReportCounts.fromJson(
        json['counts'] is Map
            ? Map<String, dynamic>.from(json['counts'] as Map)
            : <String, dynamic>{},
      ),
      series: asMapList(json['series']).map(ReportSeriesPoint.fromJson).toList(),
      byStatus: asMapList(json['bookings_by_status']).map(ReportStatusCount.fromJson).toList(),
      bookings: asMapList(json['bookings']).map(ReportBooking.fromJson).toList(),
    );
  }

  ReportsPayload copyWith({
    ReportCounts? counts,
    List<ReportBooking>? bookings,
  }) {
    return ReportsPayload(
      period: period,
      from: from,
      to: to,
      counts: counts ?? this.counts,
      series: series,
      byStatus: byStatus,
      bookings: bookings ?? this.bookings,
    );
  }
}
