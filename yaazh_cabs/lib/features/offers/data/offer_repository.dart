import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/core/network/api_client.dart';
import 'package:yaazh_cabs/features/offers/domain/driver_offer.dart';
import 'package:yaazh_cabs/features/trips/domain/booking.dart';

final offerRepositoryProvider = Provider<OfferRepository>((ref) {
  return OfferRepository(ref.watch(apiClientProvider));
});

class OfferRepository {
  final ApiClient _apiClient;

  OfferRepository(this._apiClient);

  Future<List<DriverOffer>> getOffers() async {
    final response = await _apiClient.get('/driver/offers');
    if (response is List) {
      return response
          .map((e) => DriverOffer.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<DriverOffer> getOffer(String offerId) async {
    final response = await _apiClient.get('/driver/offers/$offerId');
    return DriverOffer.fromJson(response as Map<String, dynamic>);
  }

  Future<Booking> acceptOffer(String offerId) async {
    final response = await _apiClient.post('/driver/offers/$offerId/accept');
    return Booking.fromJson(response as Map<String, dynamic>);
  }

  Future<void> rejectOffer(String offerId, {String? reason}) async {
    await _apiClient.post(
      '/driver/offers/$offerId/reject',
      data: {if (reason != null) 'reason': reason},
    );
  }
}
