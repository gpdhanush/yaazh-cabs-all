import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/core/network/api_client.dart';
import 'package:yaazh_cabs/features/trips/domain/booking.dart';

final tripRepositoryProvider = Provider<TripRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return TripRepository(apiClient);
});

class TripRepository {
  final ApiClient _apiClient;

  TripRepository(this._apiClient);

  Future<List<Booking>> getAssignedTrips() async {
    final response = await _apiClient.get('/driver/trips');
    if (response is List) {
      return response
          .map((item) => Booking.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<Booking> getTripDetails(String bookingId) async {
    final response = await _apiClient.get('/driver/trips/$bookingId');
    return Booking.fromJson(response as Map<String, dynamic>);
  }

  Future<void> markOnTheWay(String bookingId) async {
    await _apiClient.post('/driver/trips/$bookingId/on-the-way');
  }

  Future<void> markArrived(String bookingId) async {
    await _apiClient.post('/driver/trips/$bookingId/arrived');
  }

  Future<void> startTrip(String bookingId, double odometerKm) async {
    await _apiClient.post('/driver/trips/$bookingId/start', data: {
      'odometer_km': odometerKm,
    });
  }

  Future<void> completeTrip(String bookingId, double odometerKm) async {
    await _apiClient.post('/driver/trips/$bookingId/complete', data: {
      'odometer_km': odometerKm,
    });
  }

  Future<Map<String, dynamic>> getPaymentSummary(String bookingId) async {
    final response = await _apiClient.get('/driver/trips/$bookingId/payment');
    return response as Map<String, dynamic>;
  }

  Future<void> collectPayment({
    required String bookingId,
    required double amount,
    String method = 'cash',
    String? note,
  }) async {
    await _apiClient.post('/driver/trips/$bookingId/payment', data: {
      'amount': amount,
      'method': method,
      'note': note,
    });
  }

  Future<void> updateDriverLocation({
    required double latitude,
    required double longitude,
    double? heading,
    double? speed,
    double? accuracy,
    int? battery,
    String? bookingId,
    String? recordedAt,
  }) async {
    await _apiClient.post('/driver/location', data: {
      'latitude': latitude,
      'longitude': longitude,
      if (heading != null) 'heading': heading,
      if (speed != null) 'speed': speed,
      if (accuracy != null) 'accuracy': accuracy,
      if (battery != null) 'battery': battery,
      if (bookingId != null) 'booking_id': bookingId,
      if (recordedAt != null) 'recorded_at': recordedAt,
    });
  }

  Future<void> updateDriverStatus({
    String? onlineStatus,
    String? availabilityStatus,
  }) async {
    await _apiClient.put('/driver/status', data: {
      if (onlineStatus != null) 'online_status': onlineStatus,
      if (availabilityStatus != null) 'availability_status': availabilityStatus,
    });
  }
}
