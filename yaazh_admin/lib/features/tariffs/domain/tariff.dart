import 'package:yaazh_admin/core/format.dart';

class TariffPlan {
  final String id;
  final String vehicleCategoryId;
  final String? categoryName;
  final String tripType;
  final String tripTypeLabel;
  final String? routeId;
  final String? routeTitle;
  final String routeLabel;
  final double ratePerKm;
  final double baseFare;
  final double driverBatta;
  final double minimumKm;
  final double minimumFare;
  final double extraKmRate;
  final double nightCharge;
  final double permitCharge;
  final double gstPercentage;
  final String effectiveFrom;
  final String? effectiveTo;
  final bool isActive;

  const TariffPlan({
    required this.id,
    required this.vehicleCategoryId,
    this.categoryName,
    required this.tripType,
    required this.tripTypeLabel,
    this.routeId,
    this.routeTitle,
    required this.routeLabel,
    required this.ratePerKm,
    required this.baseFare,
    required this.driverBatta,
    required this.minimumKm,
    required this.minimumFare,
    required this.extraKmRate,
    required this.nightCharge,
    required this.permitCharge,
    required this.gstPercentage,
    required this.effectiveFrom,
    this.effectiveTo,
    required this.isActive,
  });

  factory TariffPlan.fromJson(Map<String, dynamic> json) {
    return TariffPlan(
      id: json['id']?.toString() ?? '',
      vehicleCategoryId: json['vehicle_category_id']?.toString() ?? '',
      categoryName: json['category_name']?.toString(),
      tripType: json['trip_type']?.toString() ?? '',
      tripTypeLabel: json['trip_type_label']?.toString() ??
          TariffMeta.tripTypeLabel(json['trip_type']?.toString() ?? ''),
      routeId: json['route_id']?.toString(),
      routeTitle: json['route_title']?.toString(),
      routeLabel: json['route_label']?.toString() ?? 'All routes',
      ratePerKm: parseDouble(json['rate_per_km']) ?? 0,
      baseFare: parseDouble(json['base_fare']) ?? 0,
      driverBatta: parseDouble(json['driver_batta']) ?? 0,
      minimumKm: parseDouble(json['minimum_km']) ?? 0,
      minimumFare: parseDouble(json['minimum_fare']) ?? 0,
      extraKmRate: parseDouble(json['extra_km_rate']) ?? 0,
      nightCharge: parseDouble(json['night_charge']) ?? 0,
      permitCharge: parseDouble(json['permit_charge']) ?? 0,
      gstPercentage: parseDouble(json['gst_percentage']) ?? 0,
      effectiveFrom: json['effective_from']?.toString() ?? '',
      effectiveTo: json['effective_to']?.toString(),
      isActive: json['is_active'] != false,
    );
  }
}

class TariffRouteOption {
  final String id;
  final String label;

  const TariffRouteOption({required this.id, required this.label});

  factory TariffRouteOption.fromJson(Map<String, dynamic> json) {
    final title = json['title']?.toString().trim();
    final corridor = json['corridor']?.toString().trim();
    final label = (title != null && title.isNotEmpty)
        ? title
        : (corridor != null && corridor.isNotEmpty)
            ? corridor
            : 'Route ${json['id']}';
    return TariffRouteOption(
      id: json['id']?.toString() ?? '',
      label: label,
    );
  }
}

class TariffMeta {
  static const tripTypes = [
    ('one_way', 'One way'),
    ('round_trip', 'Round trip'),
    ('airport', 'Airport'),
    ('outstation', 'Outstation'),
    ('local_rental', 'Local rental'),
  ];

  static String tripTypeLabel(String value) {
    for (final t in tripTypes) {
      if (t.$1 == value) return t.$2;
    }
    return value.replaceAll('_', ' ');
  }
}
