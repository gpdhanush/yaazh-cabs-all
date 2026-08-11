/// Domain model mapped from backend `serializeBooking` + optional payment nest.
class Booking {
  final String id;
  final String bookingCode;
  final String status;
  final String tripType;
  final String customerName;
  final String customerPhone;
  final String pickupAddress;
  final String dropAddress;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropLat;
  final double? dropLng;
  final DateTime? pickupAt;
  final double estimatedTotal;
  final double? finalTotal;
  final double? estimatedDistanceKm;
  final double? startOdometerKm;
  final double? endOdometerKm;
  final double? actualDistanceKm;
  final double? odometerDifferenceKm;
  final String? vehicleCategoryName;
  final String? registrationNo;
  final String paymentStatus;
  final double fareDue;
  final double amountPaid;
  final double balanceDue;

  const Booking({
    required this.id,
    required this.bookingCode,
    required this.status,
    this.tripType = 'one_way',
    required this.customerName,
    required this.customerPhone,
    required this.pickupAddress,
    required this.dropAddress,
    this.pickupLat,
    this.pickupLng,
    this.dropLat,
    this.dropLng,
    this.pickupAt,
    required this.estimatedTotal,
    this.finalTotal,
    this.estimatedDistanceKm,
    this.startOdometerKm,
    this.endOdometerKm,
    this.actualDistanceKm,
    this.odometerDifferenceKm,
    this.vehicleCategoryName,
    this.registrationNo,
    required this.paymentStatus,
    required this.fareDue,
    required this.amountPaid,
    required this.balanceDue,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    final payment = json['payment'] as Map<String, dynamic>?;
    final customer = json['customer'] as Map<String, dynamic>?;

    return Booking(
      id: json['id']?.toString() ?? '',
      bookingCode: _string(
            json['booking_reference'] ?? json['booking_code'],
          ) ??
          (json['id'] != null ? 'BK-${json['id']}' : ''),
      status: _string(json['status']) ?? 'driver_assigned',
      tripType: _string(json['trip_type']) ?? 'one_way',
      customerName: _string(json['customer_name'] ?? customer?['name']) ??
          'Passenger',
      customerPhone:
          _string(json['customer_phone'] ?? customer?['phone']) ?? '',
      pickupAddress: _string(
            json['pickup_location'] ?? json['pickup_address'],
          ) ??
          'Pickup location',
      dropAddress: _string(
            json['drop_location'] ?? json['drop_address'],
          ) ??
          'Drop location',
      pickupLat: _double(json['pickup_latitude']),
      pickupLng: _double(json['pickup_longitude']),
      dropLat: _double(json['drop_latitude']),
      dropLng: _double(json['drop_longitude']),
      pickupAt: json['pickup_at'] != null
          ? DateTime.tryParse(json['pickup_at'].toString())
          : null,
      estimatedTotal: _double(json['estimated_total']) ?? 0.0,
      finalTotal: _double(json['final_total']),
      estimatedDistanceKm: _double(json['estimated_distance_km']),
      startOdometerKm: _double(json['start_odometer_km']),
      endOdometerKm: _double(json['end_odometer_km']),
      actualDistanceKm: _double(json['actual_distance_km']),
      odometerDifferenceKm: _double(json['odometer_difference_km']),
      vehicleCategoryName: _string(json['vehicle_category_name']),
      registrationNo: _string(json['registration_no']),
      paymentStatus: _string(
            payment?['payment_status'] ?? json['payment_status'],
          ) ??
          'unpaid',
      fareDue: _double(payment?['fare_due'] ?? json['fare_due']) ??
          _double(json['estimated_total']) ??
          0.0,
      amountPaid: _double(payment?['amount_paid'] ?? json['amount_paid']) ?? 0.0,
      balanceDue: _double(payment?['balance_due'] ?? json['balance_due']) ??
          _double(json['estimated_total']) ??
          0.0,
    );
  }

  bool get isActive =>
      status == 'driver_assigned' ||
      status == 'on_the_way' ||
      status == 'arrived' ||
      status == 'trip_started';

  bool get isCompleted => status == 'completed';
  bool get isCancelled =>
      status == 'cancelled' || status == 'rejected' || status == 'no_show';

  bool get needsPayment =>
      isCompleted &&
      balanceDue > 0 &&
      paymentStatus != 'paid' &&
      paymentStatus != 'refunded';

  static String? _string(dynamic value) {
    if (value == null) return null;
    final s = value.toString().trim();
    return s.isEmpty ? null : s;
  }

  static double? _double(dynamic value) {
    if (value == null) return null;
    return double.tryParse(value.toString());
  }
}
