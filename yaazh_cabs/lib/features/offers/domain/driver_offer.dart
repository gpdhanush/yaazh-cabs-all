import 'package:yaazh_cabs/features/trips/domain/booking.dart';

class DriverOffer {
  final String id;
  final String bookingId;
  final String status;
  final double? offeredFare;
  final DateTime? expiresAt;
  final Booking? booking;

  const DriverOffer({
    required this.id,
    required this.bookingId,
    required this.status,
    this.offeredFare,
    this.expiresAt,
    this.booking,
  });

  factory DriverOffer.fromJson(Map<String, dynamic> json) {
    final bookingJson = json['booking'];
    return DriverOffer(
      id: json['id']?.toString() ?? '',
      bookingId: json['booking_id']?.toString() ??
          (bookingJson is Map ? bookingJson['id']?.toString() ?? '' : ''),
      status: json['status']?.toString() ?? 'sent',
      offeredFare: json['offered_fare'] != null
          ? double.tryParse(json['offered_fare'].toString())
          : null,
      expiresAt: json['expires_at'] != null
          ? DateTime.tryParse(json['expires_at'].toString())
          : null,
      booking: bookingJson is Map<String, dynamic>
          ? Booking.fromJson(bookingJson)
          : null,
    );
  }

  bool get isActionable => status == 'sent' || status == 'seen';
}
