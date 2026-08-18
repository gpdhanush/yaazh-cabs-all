import 'package:yaazh_admin/core/format.dart';

class VehicleCategory {
  final String id;
  final String name;
  final String slug;
  final int seatingCapacity;
  final String? luggageCapacity;
  final String? description;
  final String? imageUrl;
  final double oneWayRatePerKm;
  final double roundTripRatePerKm;
  final double driverBatta;
  final double minimumKmPerDay;
  final int displayOrder;
  final bool isActive;
  final String? createdAt;

  const VehicleCategory({
    required this.id,
    required this.name,
    required this.slug,
    required this.seatingCapacity,
    this.luggageCapacity,
    this.description,
    this.imageUrl,
    required this.oneWayRatePerKm,
    required this.roundTripRatePerKm,
    required this.driverBatta,
    required this.minimumKmPerDay,
    required this.displayOrder,
    required this.isActive,
    this.createdAt,
  });

  factory VehicleCategory.fromJson(Map<String, dynamic> json) {
    final image = json['image_url']?.toString().trim();
    return VehicleCategory(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      seatingCapacity:
          int.tryParse(json['seating_capacity']?.toString() ?? '') ?? 0,
      luggageCapacity: json['luggage_capacity']?.toString(),
      description: json['description']?.toString(),
      imageUrl: (image == null || image.isEmpty || image == 'null') ? null : image,
      oneWayRatePerKm: parseDouble(json['one_way_rate_per_km']) ?? 0,
      roundTripRatePerKm: parseDouble(json['round_trip_rate_per_km']) ?? 0,
      driverBatta: parseDouble(json['driver_batta']) ?? 0,
      minimumKmPerDay: parseDouble(json['minimum_km_per_day']) ?? 0,
      displayOrder: int.tryParse(json['display_order']?.toString() ?? '') ?? 0,
      isActive: json['is_active'] != false,
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toPayload() {
    return {
      'name': name.trim(),
      'slug': slug.trim(),
      'seating_capacity': seatingCapacity,
      'luggage_capacity': luggageCapacity?.trim().isNotEmpty == true
          ? luggageCapacity!.trim()
          : null,
      'description': description?.trim().isNotEmpty == true
          ? description!.trim()
          : null,
      'image_url': imageUrl?.trim().isNotEmpty == true ? imageUrl!.trim() : null,
      'one_way_rate_per_km': oneWayRatePerKm,
      'round_trip_rate_per_km': roundTripRatePerKm,
      'driver_batta': driverBatta,
      'minimum_km_per_day': minimumKmPerDay,
      'display_order': displayOrder,
      'is_active': isActive,
    };
  }
}

class FleetVehicle {
  final String id;
  final String categoryId;
  final String? categoryName;
  final String vehicleName;
  final String? registrationNo;
  final String? modelName;
  final String? color;
  final String fuelType;
  final String? rcExpiryDate;
  final String? insuranceExpiryDate;
  final String? permitExpiryDate;
  final String? pollutionExpiryDate;
  final bool isActive;

  const FleetVehicle({
    required this.id,
    required this.categoryId,
    this.categoryName,
    required this.vehicleName,
    this.registrationNo,
    this.modelName,
    this.color,
    required this.fuelType,
    this.rcExpiryDate,
    this.insuranceExpiryDate,
    this.permitExpiryDate,
    this.pollutionExpiryDate,
    required this.isActive,
  });

  factory FleetVehicle.fromJson(Map<String, dynamic> json) {
    return FleetVehicle(
      id: json['id']?.toString() ?? '',
      categoryId: json['category_id']?.toString() ?? '',
      categoryName: json['category_name']?.toString(),
      vehicleName: json['vehicle_name']?.toString() ?? '',
      registrationNo: json['registration_no']?.toString(),
      modelName: json['model_name']?.toString(),
      color: json['color']?.toString(),
      fuelType: json['fuel_type']?.toString() ?? 'diesel',
      rcExpiryDate: json['rc_expiry_date']?.toString(),
      insuranceExpiryDate: json['insurance_expiry_date']?.toString(),
      permitExpiryDate: json['permit_expiry_date']?.toString(),
      pollutionExpiryDate: json['pollution_expiry_date']?.toString(),
      isActive: json['is_active'] != false,
    );
  }
}

String slugifyCategoryName(String value) {
  var slug = value
      .toLowerCase()
      .trim()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  if (slug.length > 120) slug = slug.substring(0, 120);
  return slug;
}
