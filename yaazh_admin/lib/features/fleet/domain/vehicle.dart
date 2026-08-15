class VehicleCategory {
  final String id;
  final String name;
  final String slug;
  final int seatingCapacity;
  final String? imageUrl;
  final bool isActive;

  const VehicleCategory({
    required this.id,
    required this.name,
    required this.slug,
    required this.seatingCapacity,
    this.imageUrl,
    required this.isActive,
  });

  factory VehicleCategory.fromJson(Map<String, dynamic> json) {
    final image = json['image_url']?.toString().trim();
    return VehicleCategory(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      seatingCapacity: int.tryParse(json['seating_capacity']?.toString() ?? '') ?? 0,
      imageUrl: (image == null || image.isEmpty || image == 'null') ? null : image,
      isActive: json['is_active'] == true,
    );
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
