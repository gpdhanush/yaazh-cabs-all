import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/trip_repository.dart';
import '../../domain/booking.dart';

final tripListNotifierProvider =
    StateNotifierProvider<TripListNotifier, AsyncValue<List<Booking>>>((ref) {
  final repository = ref.watch(tripRepositoryProvider);
  return TripListNotifier(repository);
});

class TripListNotifier extends StateNotifier<AsyncValue<List<Booking>>> {
  final TripRepository _repository;

  TripListNotifier(this._repository) : super(const AsyncValue.loading()) {
    fetchTrips();
  }

  Future<void> fetchTrips() async {
    state = const AsyncValue.loading();
    try {
      final trips = await _repository.getAssignedTrips();
      state = AsyncValue.data(trips);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    try {
      final trips = await _repository.getAssignedTrips();
      state = AsyncValue.data(trips);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
