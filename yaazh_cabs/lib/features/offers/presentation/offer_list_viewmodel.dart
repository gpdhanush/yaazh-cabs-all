import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/features/offers/data/offer_repository.dart';
import 'package:yaazh_cabs/features/offers/domain/driver_offer.dart';

final offerListNotifierProvider =
    StateNotifierProvider<OfferListNotifier, AsyncValue<List<DriverOffer>>>(
        (ref) {
  return OfferListNotifier(ref.watch(offerRepositoryProvider));
});

class OfferListNotifier extends StateNotifier<AsyncValue<List<DriverOffer>>> {
  final OfferRepository _repository;

  OfferListNotifier(this._repository) : super(const AsyncValue.loading()) {
    refresh();
  }

  Future<void> refresh() async {
    try {
      final offers = await _repository.getOffers();
      state = AsyncValue.data(offers);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> accept(String offerId) async {
    try {
      await _repository.acceptOffer(offerId);
      await refresh();
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> reject(String offerId, {String? reason}) async {
    try {
      await _repository.rejectOffer(offerId, reason: reason);
      await refresh();
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}
