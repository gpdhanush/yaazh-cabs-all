class BookingParty {
  final String name;
  final String phone;
  final String? photoUrl;

  const BookingParty({required this.name, required this.phone, this.photoUrl});
}

class BookingVehicle {
  final String name;
  final String? registration;

  const BookingVehicle({required this.name, this.registration});
}

class StatusHistoryItem {
  final String? oldStatus;
  final String newStatus;
  final String? note;
  final DateTime? changedAt;

  const StatusHistoryItem({
    this.oldStatus,
    required this.newStatus,
    this.note,
    this.changedAt,
  });
}

class Booking {
  final String id;
  final String bookingReference;
  final String status;
  final String tripType;
  final String paymentStatus;
  final String customerName;
  final String customerPhone;
  final String pickupLocation;
  final String dropLocation;
  final DateTime? pickupAt;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropLat;
  final double? dropLng;
  final double estimatedTotal;
  final double? finalTotal;
  final double? estimatedDistanceKm;
  final String? assignedDriverId;
  final BookingParty? driver;
  final BookingVehicle? vehicle;
  final int? customerRating;
  final String? customerReview;
  final List<StatusHistoryItem> statusHistory;

  const Booking({
    required this.id,
    required this.bookingReference,
    required this.status,
    required this.tripType,
    required this.paymentStatus,
    required this.customerName,
    required this.customerPhone,
    required this.pickupLocation,
    required this.dropLocation,
    this.pickupAt,
    this.pickupLat,
    this.pickupLng,
    this.dropLat,
    this.dropLng,
    required this.estimatedTotal,
    this.finalTotal,
    this.estimatedDistanceKm,
    this.assignedDriverId,
    this.driver,
    this.vehicle,
    this.customerRating,
    this.customerReview,
    this.statusHistory = const [],
  });

  bool get isActive => const {
        'pending',
        'confirmed',
        'driver_notified',
        'driver_accepted',
        'driver_assigned',
        'on_the_way',
        'arrived',
        'trip_started',
      }.contains(status);

  bool get canCancel => isActive;
  bool get isCompleted => status == 'completed';
  bool get hasRated => customerRating != null;
  bool get isCancelled =>
      status == 'cancelled' || status == 'rejected' || status == 'no_show';

  bool get showsAssignedDriver {
    if (driver == null) return false;
    return const {
      'driver_assigned',
      'driver_accepted',
      'on_the_way',
      'arrived',
      'trip_started',
      'completed',
    }.contains(status);
  }

  factory Booking.fromJson(Map<String, dynamic> json) {
    final driverJson = json['driver'];
    final vehicleJson = json['vehicle'];
    final history = json['status_history'];

    return Booking(
      id: json['id']?.toString() ?? '',
      bookingReference: json['booking_reference']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      tripType: json['trip_type']?.toString() ?? 'one_way',
      paymentStatus: json['payment_status']?.toString() ?? 'unpaid',
      customerName: json['customer_name']?.toString() ?? '',
      customerPhone: json['customer_phone']?.toString() ?? '',
      pickupLocation: json['pickup_location']?.toString() ?? '',
      dropLocation: json['drop_location']?.toString() ?? '',
      pickupAt: json['pickup_at'] != null
          ? DateTime.tryParse(json['pickup_at'].toString())
          : null,
      pickupLat: _d(json['pickup_latitude']),
      pickupLng: _d(json['pickup_longitude']),
      dropLat: _d(json['drop_latitude']),
      dropLng: _d(json['drop_longitude']),
      estimatedTotal: _d(json['estimated_total']) ?? 0,
      finalTotal: _d(json['final_total']),
      estimatedDistanceKm: _d(json['estimated_distance_km']),
      assignedDriverId: json['assigned_driver_id']?.toString(),
      customerRating: int.tryParse(json['customer_rating']?.toString() ?? ''),
      customerReview: json['customer_review']?.toString(),
      driver: driverJson is Map
          ? BookingParty(
              name: driverJson['name']?.toString() ?? 'Driver',
              phone: driverJson['phone']?.toString() ?? '',
              photoUrl: (driverJson['photo_url'] ?? driverJson['profile_image_url'])
                  ?.toString(),
            )
          : null,
      vehicle: vehicleJson is Map
          ? BookingVehicle(
              name: vehicleJson['name']?.toString() ?? 'Cab',
              registration: vehicleJson['registration']?.toString(),
            )
          : null,
      statusHistory: history is List
          ? history.whereType<Map>().map((h) {
              return StatusHistoryItem(
                oldStatus: h['old_status']?.toString(),
                newStatus: h['new_status']?.toString() ?? '',
                note: h['note']?.toString(),
                changedAt: h['changed_at'] != null
                    ? DateTime.tryParse(h['changed_at'].toString())
                    : null,
              );
            }).toList()
          : const [],
    );
  }

  static double? _d(dynamic value) {
    if (value == null) return null;
    return double.tryParse(value.toString());
  }
}

class DriverLocation {
  final double? latitude;
  final double? longitude;
  final double? heading;
  final double? speedKmph;
  final DateTime? recordedAt;

  const DriverLocation({
    this.latitude,
    this.longitude,
    this.heading,
    this.speedKmph,
    this.recordedAt,
  });

  factory DriverLocation.fromJson(Map<String, dynamic> json) {
    return DriverLocation(
      latitude: Booking._d(json['latitude']),
      longitude: Booking._d(json['longitude']),
      heading: Booking._d(json['heading']),
      speedKmph: Booking._d(json['speed_kmph']),
      recordedAt: json['recorded_at'] != null
          ? DateTime.tryParse(json['recorded_at'].toString())
          : null,
    );
  }
}

class FareQuote {
  final double distanceKm;
  final int? durationMinutes;
  final double ratePerKm;
  final double baseFare;
  final double driverBatta;
  final double gstAmount;
  final double discountAmount;
  final double estimatedTotal;

  const FareQuote({
    required this.distanceKm,
    this.durationMinutes,
    required this.ratePerKm,
    required this.baseFare,
    required this.driverBatta,
    required this.gstAmount,
    required this.discountAmount,
    required this.estimatedTotal,
  });

  factory FareQuote.fromJson(Map<String, dynamic> json) {
    return FareQuote(
      distanceKm: Booking._d(json['distance_km']) ?? 0,
      durationMinutes: int.tryParse(json['duration_minutes']?.toString() ?? ''),
      ratePerKm: Booking._d(json['rate_per_km']) ?? 0,
      baseFare: Booking._d(json['base_fare']) ?? 0,
      driverBatta: Booking._d(json['driver_batta']) ?? 0,
      gstAmount: Booking._d(json['gst_amount']) ?? 0,
      discountAmount: Booking._d(json['discount_amount']) ?? 0,
      estimatedTotal: Booking._d(json['estimated_total']) ?? 0,
    );
  }
}

class BookingDraft {
  final String pickupLabel;
  final String dropLabel;
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final String tripType;
  final String vehicleCategoryId;
  final String vehicleName;
  final DateTime pickupAt;
  final DateTime? returnAt;
  final int passengerCount;
  final String? couponCode;
  final String? specialNote;
  final FareQuote? quote;
  final bool useCurrentLocation;

  const BookingDraft({
    required this.pickupLabel,
    required this.dropLabel,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropLat,
    required this.dropLng,
    required this.tripType,
    required this.vehicleCategoryId,
    required this.vehicleName,
    required this.pickupAt,
    this.returnAt,
    this.passengerCount = 1,
    this.couponCode,
    this.specialNote,
    this.quote,
    this.useCurrentLocation = true,
  });

  BookingDraft copyWith({
    String? pickupLabel,
    double? pickupLat,
    double? pickupLng,
    DateTime? pickupAt,
    DateTime? returnAt,
    int? passengerCount,
    String? couponCode,
    String? specialNote,
    FareQuote? quote,
    bool? useCurrentLocation,
  }) {
    return BookingDraft(
      pickupLabel: pickupLabel ?? this.pickupLabel,
      dropLabel: dropLabel,
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      dropLat: dropLat,
      dropLng: dropLng,
      tripType: tripType,
      vehicleCategoryId: vehicleCategoryId,
      vehicleName: vehicleName,
      pickupAt: pickupAt ?? this.pickupAt,
      returnAt: returnAt ?? this.returnAt,
      passengerCount: passengerCount ?? this.passengerCount,
      couponCode: couponCode ?? this.couponCode,
      specialNote: specialNote ?? this.specialNote,
      quote: quote ?? this.quote,
      useCurrentLocation: useCurrentLocation ?? this.useCurrentLocation,
    );
  }
}
