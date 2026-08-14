import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/media_url.dart';

class BookingParty {
  final String id;
  final String name;
  final String phone;
  final String? photoUrl;

  const BookingParty({
    required this.id,
    required this.name,
    required this.phone,
    this.photoUrl,
  });

  String? get resolvedPhoto => driverPhotoUrl(id: id, photoUrl: photoUrl);

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.length >= 2) {
      return (parts.first[0] + parts.elementAt(1)[0]).toUpperCase();
    }
    if (name.trim().isNotEmpty) return name.trim()[0].toUpperCase();
    return 'D';
  }

  factory BookingParty.fromJson(Map<String, dynamic> json) {
    return BookingParty(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      photoUrl: json['photo_url']?.toString() ?? json['profile_image_url']?.toString(),
    );
  }
}

class BookingVehicle {
  final String id;
  final String name;
  final String? registration;

  const BookingVehicle({
    required this.id,
    required this.name,
    this.registration,
  });

  factory BookingVehicle.fromJson(Map<String, dynamic> json) {
    return BookingVehicle(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? json['vehicle_name']?.toString() ?? '',
      registration: json['registration']?.toString() ?? json['registration_no']?.toString(),
    );
  }
}

class BookingHistoryItem {
  final String? oldStatus;
  final String newStatus;
  final String? note;
  final String changedAt;

  const BookingHistoryItem({
    this.oldStatus,
    required this.newStatus,
    this.note,
    required this.changedAt,
  });

  factory BookingHistoryItem.fromJson(Map<String, dynamic> json) {
    return BookingHistoryItem(
      oldStatus: json['old_status']?.toString(),
      newStatus: json['new_status']?.toString() ?? '',
      note: json['note']?.toString(),
      changedAt: json['changed_at']?.toString() ?? '',
    );
  }
}

class PaymentLine {
  final String id;
  final double amount;
  final String method;
  final String? paidAt;
  final String createdAt;

  const PaymentLine({
    required this.id,
    required this.amount,
    required this.method,
    this.paidAt,
    required this.createdAt,
  });

  factory PaymentLine.fromJson(Map<String, dynamic> json) {
    return PaymentLine(
      id: json['id']?.toString() ?? '',
      amount: parseDouble(json['amount']) ?? 0,
      method: json['method']?.toString() ?? '',
      paidAt: json['paid_at']?.toString(),
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}

class BookingPayment {
  final String paymentStatus;
  final double fareDue;
  final double amountPaid;
  final double balanceDue;
  final List<PaymentLine> payments;

  const BookingPayment({
    required this.paymentStatus,
    required this.fareDue,
    required this.amountPaid,
    required this.balanceDue,
    required this.payments,
  });

  factory BookingPayment.fromJson(Map<String, dynamic> json) {
    return BookingPayment(
      paymentStatus: json['payment_status']?.toString() ?? '',
      fareDue: parseDouble(json['fare_due']) ?? 0,
      amountPaid: parseDouble(json['amount_paid']) ?? 0,
      balanceDue: parseDouble(json['balance_due']) ?? 0,
      payments: asMapList(json['payments']).map(PaymentLine.fromJson).toList(),
    );
  }
}

class Booking {
  final String id;
  final String bookingReference;
  final String status;
  final String tripType;
  final String paymentStatus;
  final String customerName;
  final String customerPhone;
  final String? customerEmail;
  final String pickupLocation;
  final String dropLocation;
  final String pickupAt;
  final String estimatedTotal;
  final double discountAmount;
  final String? finalTotal;
  final String? assignedDriverId;
  final double? estimatedDistanceKm;
  final double? startOdometerKm;
  final double? endOdometerKm;
  final double? actualDistanceKm;
  final double? odometerDifferenceKm;
  final String? createdAt;
  final bool? emailSent;
  final String? emailTo;
  final BookingParty? driver;
  final BookingVehicle? vehicle;
  final BookingPayment? payment;
  final List<BookingHistoryItem> history;

  const Booking({
    required this.id,
    required this.bookingReference,
    required this.status,
    required this.tripType,
    required this.paymentStatus,
    required this.customerName,
    required this.customerPhone,
    this.customerEmail,
    required this.pickupLocation,
    required this.dropLocation,
    required this.pickupAt,
    required this.estimatedTotal,
    this.discountAmount = 0,
    this.finalTotal,
    this.assignedDriverId,
    this.estimatedDistanceKm,
    this.startOdometerKm,
    this.endOdometerKm,
    this.actualDistanceKm,
    this.odometerDifferenceKm,
    this.createdAt,
    this.emailSent,
    this.emailTo,
    this.driver,
    this.vehicle,
    this.payment,
    this.history = const [],
  });

  double? get tripKm =>
      odometerDifferenceKm ??
      actualDistanceKm ??
      ((startOdometerKm != null && endOdometerKm != null)
          ? endOdometerKm! - startOdometerKm!
          : null);

  bool get isFullyPaid {
    final status = (payment?.paymentStatus.isNotEmpty == true
            ? payment!.paymentStatus
            : paymentStatus)
        .toLowerCase();
    if (status == 'paid') return true;
    if (payment != null && payment!.fareDue > 0 && payment!.balanceDue <= 0) {
      return true;
    }
    return false;
  }

  factory Booking.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? asMap(dynamic raw) {
      if (raw is Map) return Map<String, dynamic>.from(raw);
      return null;
    }

    return Booking(
      id: json['id']?.toString() ?? '',
      bookingReference: json['booking_reference']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      tripType: json['trip_type']?.toString() ?? '',
      paymentStatus: json['payment_status']?.toString() ?? '',
      customerName: json['customer_name']?.toString() ?? '',
      customerPhone: json['customer_phone']?.toString() ?? '',
      customerEmail: json['customer_email']?.toString(),
      pickupLocation: json['pickup_location']?.toString() ?? '',
      dropLocation: json['drop_location']?.toString() ?? '',
      pickupAt: json['pickup_at']?.toString() ?? '',
      estimatedTotal: json['estimated_total']?.toString() ?? '0',
      discountAmount: parseDouble(json['discount_amount']) ??
          parseDouble(asMap(json['payment'])?['discount_amount']) ??
          0,
      finalTotal: json['final_total']?.toString(),
      assignedDriverId: json['assigned_driver_id']?.toString(),
      estimatedDistanceKm: parseDouble(json['estimated_distance_km']),
      startOdometerKm: parseDouble(json['start_odometer_km']),
      endOdometerKm: parseDouble(json['end_odometer_km']),
      actualDistanceKm: parseDouble(json['actual_distance_km']),
      odometerDifferenceKm: parseDouble(json['odometer_difference_km']),
      createdAt: json['created_at']?.toString(),
      emailSent: json['email_sent'] == true,
      emailTo: json['email_to']?.toString(),
      driver: asMap(json['driver']) != null ? BookingParty.fromJson(asMap(json['driver'])!) : null,
      vehicle: asMap(json['vehicle']) != null ? BookingVehicle.fromJson(asMap(json['vehicle'])!) : null,
      payment: asMap(json['payment']) != null ? BookingPayment.fromJson(asMap(json['payment'])!) : null,
      history: asMapList(json['history']).map(BookingHistoryItem.fromJson).toList(),
    );
  }
}

class AdminDriver {
  final String id;
  final String name;
  final String phone;
  final String? availabilityStatus;
  final bool isActive;
  final String? photoUrl;

  const AdminDriver({
    required this.id,
    required this.name,
    required this.phone,
    this.availabilityStatus,
    required this.isActive,
    this.photoUrl,
  });

  String get label => '$name · $phone';

  factory AdminDriver.fromJson(Map<String, dynamic> json) {
    return AdminDriver(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Driver',
      phone: json['phone']?.toString() ?? '',
      availabilityStatus: json['availability_status']?.toString(),
      isActive: json['is_active'] != false,
      photoUrl: json['photo_url']?.toString() ?? json['profile_image_url']?.toString(),
    );
  }
}

class AdminVehicle {
  final String id;
  final String name;
  final String? registration;
  final bool isActive;

  const AdminVehicle({
    required this.id,
    required this.name,
    this.registration,
    required this.isActive,
  });

  String get label =>
      registration == null || registration!.isEmpty ? name : '$name · $registration';

  factory AdminVehicle.fromJson(Map<String, dynamic> json) {
    return AdminVehicle(
      id: json['id']?.toString() ?? '',
      name: json['vehicle_name']?.toString() ?? json['name']?.toString() ?? 'Vehicle',
      registration: json['registration_no']?.toString() ?? json['registration']?.toString(),
      isActive: json['is_active'] != false,
    );
  }
}

class LiveTrip {
  final String id;
  final String bookingReference;
  final String status;
  final String customerName;
  final String pickupLocation;
  final String dropLocation;
  final double? pickupLatitude;
  final double? pickupLongitude;
  final double? dropLatitude;
  final double? dropLongitude;
  final int progress;
  final int? etaMin;
  final BookingParty? driver;
  final BookingVehicle? vehicle;
  final LiveLocation? location;

  const LiveTrip({
    required this.id,
    required this.bookingReference,
    required this.status,
    required this.customerName,
    required this.pickupLocation,
    required this.dropLocation,
    this.pickupLatitude,
    this.pickupLongitude,
    this.dropLatitude,
    this.dropLongitude,
    required this.progress,
    this.etaMin,
    this.driver,
    this.vehicle,
    this.location,
  });

  factory LiveTrip.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? asMap(dynamic raw) {
      if (raw is Map) return Map<String, dynamic>.from(raw);
      return null;
    }

    return LiveTrip(
      id: json['id']?.toString() ?? '',
      bookingReference: json['booking_reference']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      customerName: json['customer_name']?.toString() ?? '',
      pickupLocation: json['pickup_location']?.toString() ?? '',
      dropLocation: json['drop_location']?.toString() ?? '',
      pickupLatitude: parseDouble(json['pickup_latitude']),
      pickupLongitude: parseDouble(json['pickup_longitude']),
      dropLatitude: parseDouble(json['drop_latitude']),
      dropLongitude: parseDouble(json['drop_longitude']),
      progress: parseInt(json['progress']) ?? 0,
      etaMin: parseInt(json['eta_min']),
      driver: asMap(json['driver']) != null ? BookingParty.fromJson(asMap(json['driver'])!) : null,
      vehicle: asMap(json['vehicle']) != null ? BookingVehicle.fromJson(asMap(json['vehicle'])!) : null,
      location: asMap(json['location']) != null ? LiveLocation.fromJson(asMap(json['location'])!) : null,
    );
  }
}

class WhatsAppShare {
  final String whatsappUrl;
  final String? pdfUrl;
  final String? feedbackUrl;
  final String? message;

  const WhatsAppShare({
    required this.whatsappUrl,
    this.pdfUrl,
    this.feedbackUrl,
    this.message,
  });

  factory WhatsAppShare.fromJson(Map<String, dynamic> json) {
    final message = json['message']?.toString();
    return WhatsAppShare(
      whatsappUrl: rewriteWhatsAppShareUrl(json['whatsapp_url']?.toString() ?? ''),
      pdfUrl: resolveMediaUrl(json['pdf_url']?.toString()),
      feedbackUrl: json['feedback_url']?.toString(),
      message: message == null ? null : rewriteLoopbackUrls(message),
    );
  }
}

class InvoiceEmailResult {
  final String? emailTo;
  final bool sent;

  const InvoiceEmailResult({this.emailTo, required this.sent});

  factory InvoiceEmailResult.fromJson(Map<String, dynamic> json) {
    return InvoiceEmailResult(
      emailTo: json['email_to']?.toString(),
      sent: json['email_sent'] == true,
    );
  }
}

class LiveLocation {
  final double latitude;
  final double longitude;
  final double? heading;
  final double? speedKmph;
  final String? recordedAt;
  final bool stale;

  const LiveLocation({
    required this.latitude,
    required this.longitude,
    this.heading,
    this.speedKmph,
    this.recordedAt,
    required this.stale,
  });

  factory LiveLocation.fromJson(Map<String, dynamic> json) {
    return LiveLocation(
      latitude: parseDouble(json['latitude']) ?? 0,
      longitude: parseDouble(json['longitude']) ?? 0,
      heading: parseDouble(json['heading']),
      speedKmph: parseDouble(json['speed_kmph']),
      recordedAt: json['recorded_at']?.toString(),
      stale: json['stale'] == true,
    );
  }
}

List<Booking> decodeBookings(List<Map<String, dynamic>> raw) =>
    raw.map(Booking.fromJson).toList();

List<LiveTrip> decodeLiveTrips(List<Map<String, dynamic>> raw) =>
    raw.map(LiveTrip.fromJson).toList();

