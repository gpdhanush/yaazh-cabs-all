import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/features/booking/data/booking_repository.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';

final tripListProvider =
    StateNotifierProvider<TripListNotifier, AsyncValue<List<Booking>>>((ref) {
  return TripListNotifier(ref.watch(bookingRepositoryProvider));
});

class TripListNotifier extends StateNotifier<AsyncValue<List<Booking>>> {
  final BookingRepository _repository;

  TripListNotifier(this._repository) : super(const AsyncValue.loading()) {
    refresh();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      final rows = await _repository.listBookings();
      state = AsyncValue.data(rows);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final upcomingTripProvider = Provider<Booking?>((ref) {
  return ref.watch(tripListProvider).maybeWhen(
        data: (rows) {
          final active = rows.where((b) => b.isActive).toList();
          if (active.isEmpty) return null;
          active.sort((a, b) {
            final aAt = a.pickupAt ?? DateTime.fromMillisecondsSinceEpoch(0);
            final bAt = b.pickupAt ?? DateTime.fromMillisecondsSinceEpoch(0);
            return aAt.compareTo(bAt);
          });
          return active.first;
        },
        orElse: () => null,
      );
});
