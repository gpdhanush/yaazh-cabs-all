import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/bookings/domain/booking.dart';

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  return BookingRepository(ref.watch(apiClientProvider));
});

final bookingsProvider = FutureProvider.autoDispose<List<Booking>>((ref) {
  return ref.watch(bookingRepositoryProvider).list();
});

final bookingDetailProvider =
    FutureProvider.autoDispose.family<Booking, String>((ref, id) {
  return ref.watch(bookingRepositoryProvider).getById(id);
});

final driversProvider = FutureProvider.autoDispose<List<AdminDriver>>((ref) {
  return ref.watch(bookingRepositoryProvider).listDrivers();
});

final vehiclesProvider = FutureProvider.autoDispose<List<AdminVehicle>>((ref) {
  return ref.watch(bookingRepositoryProvider).listVehicles();
});

final liveTripsProvider = FutureProvider.autoDispose<List<LiveTrip>>((ref) {
  return ref.watch(bookingRepositoryProvider).liveTracking();
});

class BookingRepository {
  final ApiClient _api;

  BookingRepository(this._api);

  Future<List<Booking>> list({String? status}) async {
    final data = await _api.get('/admin/bookings', queryParameters: {
      'page': 1,
      'per_page': 200,
      if (status != null && status.isNotEmpty) 'status': status,
    });
    return asMapList(data).map(Booking.fromJson).toList();
  }

  Future<Booking> getById(String id) async {
    final data = await _api.get('/admin/bookings/$id');
    return Booking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Booking> confirm(String id) async {
    final data = await _api.post('/admin/bookings/$id/confirm');
    return Booking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Booking> reject(String id, {String? reason}) async {
    final data = await _api.post('/admin/bookings/$id/reject', data: {
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
    return Booking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Booking> cancel(String id, {String? reason}) async {
    final data = await _api.post('/admin/bookings/$id/cancel', data: {
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
    return Booking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Booking> assignDriver({
    required String bookingId,
    required String driverId,
    String? vehicleId,
  }) async {
    final data = await _api.post(
      '/admin/bookings/$bookingId/assign-driver',
      data: {
        'driver_id': driverId,
        if (vehicleId != null && vehicleId.isNotEmpty) 'vehicle_id': vehicleId,
      },
    );
    return Booking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> recordPayment({
    required String bookingId,
    required double amount,
    required String method,
  }) async {
    await _api.post('/admin/bookings/$bookingId/payment', data: {
      'amount': amount,
      'method': method,
      'note': 'Recorded by admin',
    });
  }

  Future<void> markPaid(String bookingId) async {
    await _api.put('/admin/bookings/$bookingId/payment-status', data: {
      'payment_status': 'paid',
      'note': 'Marked paid by admin',
    });
  }

  Future<WhatsAppShare> sendInvoiceWhatsApp(String bookingId) async {
    final data = await _api.post('/admin/bookings/$bookingId/invoice/whatsapp');
    return WhatsAppShare.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<WhatsAppShare> sendFeedbackLink(String bookingId) async {
    final data = await _api.post('/admin/bookings/$bookingId/feedback-link');
    return WhatsAppShare.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<List<AdminDriver>> listDrivers() async {
    final data = await _api.get('/admin/drivers', queryParameters: {
      'page': 1,
      'per_page': 200,
    });
    return asMapList(data).map(AdminDriver.fromJson).toList();
  }

  Future<List<AdminVehicle>> listVehicles() async {
    final data = await _api.get('/admin/vehicles');
    return asMapList(data)
        .map(AdminVehicle.fromJson)
        .where((v) => v.isActive)
        .toList();
  }

  Future<List<LiveTrip>> liveTracking({bool silent = false}) async {
    final data = await _api.get('/admin/live-tracking', silent: silent);
    return asMapList(data).map(LiveTrip.fromJson).toList();
  }
}
