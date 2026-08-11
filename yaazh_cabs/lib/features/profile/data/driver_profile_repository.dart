import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/core/network/api_client.dart';

class AssignedVehicle {
  final String vehicleId;
  final String vehicleName;
  final String? registrationNo;
  final String? modelName;
  final String? color;
  final String? fuelType;
  final String? categoryName;
  final DateTime? assignedFrom;

  const AssignedVehicle({
    required this.vehicleId,
    required this.vehicleName,
    this.registrationNo,
    this.modelName,
    this.color,
    this.fuelType,
    this.categoryName,
    this.assignedFrom,
  });

  factory AssignedVehicle.fromJson(Map<String, dynamic> json) {
    return AssignedVehicle(
      vehicleId: json['vehicle_id']?.toString() ?? '',
      vehicleName: json['vehicle_name']?.toString() ?? 'Assigned vehicle',
      registrationNo: json['registration_no']?.toString(),
      modelName: json['model_name']?.toString(),
      color: json['color']?.toString(),
      fuelType: json['fuel_type']?.toString(),
      categoryName: json['category_name']?.toString(),
      assignedFrom: json['assigned_from'] != null
          ? DateTime.tryParse(json['assigned_from'].toString())
          : null,
    );
  }
}

class DriverRatingRow {
  final String id;
  final String bookingId;
  final String? bookingReference;
  final String? customerName;
  final int? customerRating;
  final String? customerReview;
  final int? driverRating;
  final DateTime? createdAt;

  const DriverRatingRow({
    required this.id,
    required this.bookingId,
    this.bookingReference,
    this.customerName,
    this.customerRating,
    this.customerReview,
    this.driverRating,
    this.createdAt,
  });

  factory DriverRatingRow.fromJson(Map<String, dynamic> json) {
    return DriverRatingRow(
      id: json['id']?.toString() ?? '',
      bookingId: json['booking_id']?.toString() ?? '',
      bookingReference: json['booking_reference']?.toString(),
      customerName: json['customer_name']?.toString(),
      customerRating: int.tryParse(json['customer_rating']?.toString() ?? ''),
      customerReview: json['customer_review']?.toString(),
      driverRating: int.tryParse(json['driver_rating']?.toString() ?? ''),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }
}

final driverProfileRepositoryProvider = Provider<DriverProfileRepository>((ref) {
  return DriverProfileRepository(ref.watch(apiClientProvider));
});

final assignedVehicleProvider = FutureProvider<AssignedVehicle?>((ref) {
  return ref.watch(driverProfileRepositoryProvider).getAssignedVehicle();
});

final driverRatingsProvider = FutureProvider<List<DriverRatingRow>>((ref) {
  return ref.watch(driverProfileRepositoryProvider).getRatings();
});

class DriverProfileRepository {
  final ApiClient _api;
  DriverProfileRepository(this._api);

  Future<AssignedVehicle?> getAssignedVehicle() async {
    final data = await _api.get('/driver/vehicle');
    if (data == null) return null;
    if (data is! Map) return null;
    return AssignedVehicle.fromJson(Map<String, dynamic>.from(data));
  }

  Future<List<DriverRatingRow>> getRatings() async {
    final data = await _api.get('/driver/ratings');
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => DriverRatingRow.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> ratePassenger({
    required String bookingId,
    required int rating,
    String? review,
  }) async {
    await _api.post('/driver/trips/$bookingId/rating', data: {
      'rating': rating,
      if (review != null && review.trim().isNotEmpty) 'review': review.trim(),
    });
  }
}
