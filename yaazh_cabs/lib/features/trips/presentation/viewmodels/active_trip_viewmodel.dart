import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/trip_repository.dart';
import '../../domain/booking.dart';

final activeTripNotifierProvider =
    StateNotifierProvider<ActiveTripNotifier, AsyncValue<Booking?>>((ref) {
  final repository = ref.watch(tripRepositoryProvider);
  return ActiveTripNotifier(repository);
});

class ActiveTripNotifier extends StateNotifier<AsyncValue<Booking?>> {
  final TripRepository _repository;

  ActiveTripNotifier(this._repository) : super(const AsyncValue.data(null));

  Future<void> loadTripDetails(String bookingId) async {
    state = const AsyncValue.loading();
    try {
      final trip = await _repository.getTripDetails(bookingId);
      state = AsyncValue.data(trip);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> markOnTheWay(String bookingId) async {
    try {
      await _repository.markOnTheWay(bookingId);
      await loadTripDetails(bookingId);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> markArrived(String bookingId) async {
    try {
      await _repository.markArrived(bookingId);
      await loadTripDetails(bookingId);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> startTrip(String bookingId, double odometerKm) async {
    try {
      await _repository.startTrip(bookingId, odometerKm);
      await loadTripDetails(bookingId);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> completeTrip(String bookingId, double odometerKm) async {
    try {
      await _repository.completeTrip(bookingId, odometerKm);
      await loadTripDetails(bookingId);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> collectPayment({
    required String bookingId,
    required double amount,
    String method = 'cash',
    String? note,
  }) async {
    try {
      await _repository.collectPayment(
        bookingId: bookingId,
        amount: amount,
        method: method,
        note: note,
      );
      await loadTripDetails(bookingId);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}
