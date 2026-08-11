import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/core/network/api_client.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  return BookingRepository(ref.watch(apiClientProvider));
});

class BookingRepository {
  final ApiClient _api;

  BookingRepository(this._api);

  Future<List<Booking>> listBookings({int page = 1}) async {
    final data = await _api.get(
      '/customer/bookings',
      queryParameters: {'page': page, 'per_page': 20},
    );
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => Booking.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Booking> getBooking(String id) async {
    final data = await _api.get('/customer/bookings/$id');
    return Booking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<FareQuote> estimateFare({
    required String vehicleCategoryId,
    required String tripType,
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
    String? couponCode,
  }) async {
    final data = await _api.post('/public/fare/estimate', data: {
      'vehicle_category_id': vehicleCategoryId,
      'trip_type': tripType,
      'pickup_latitude': pickupLat,
      'pickup_longitude': pickupLng,
      'drop_latitude': dropLat,
      'drop_longitude': dropLng,
      if (couponCode != null && couponCode.isNotEmpty) 'coupon_code': couponCode,
    });
    return FareQuote.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Booking> createBooking(BookingDraft draft) async {
    final data = await _api.post('/customer/bookings', data: {
      'vehicle_category_id': draft.vehicleCategoryId,
      'trip_type': draft.tripType,
      'pickup_location': draft.pickupLabel,
      'drop_location': draft.dropLabel,
      'pickup_latitude': draft.pickupLat,
      'pickup_longitude': draft.pickupLng,
      'drop_latitude': draft.dropLat,
      'drop_longitude': draft.dropLng,
      'pickup_at': draft.pickupAt.toUtc().toIso8601String(),
      if (draft.returnAt != null) 'return_at': draft.returnAt!.toUtc().toIso8601String(),
      'passenger_count': draft.passengerCount,
      if (draft.couponCode != null && draft.couponCode!.isNotEmpty)
        'coupon_code': draft.couponCode,
      if (draft.specialNote != null && draft.specialNote!.isNotEmpty)
        'special_note': draft.specialNote,
    });
    return Booking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Booking> cancel(String id, {String? reason}) async {
    final data = await _api.post('/customer/bookings/$id/cancel', data: {
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
    return Booking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> rate(String id, {required int rating, String? review}) async {
    await _api.post('/customer/bookings/$id/rating', data: {
      'rating': rating,
      if (review != null && review.isNotEmpty) 'review': review,
    });
  }

  Future<DriverLocation?> getDriverLocation(String id) async {
    final data = await _api.get('/customer/bookings/$id/location');
    if (data == null || data is! Map) return null;
    return DriverLocation.fromJson(Map<String, dynamic>.from(data));
  }
}
