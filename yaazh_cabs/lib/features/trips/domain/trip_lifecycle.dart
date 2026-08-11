/// Maps backend booking statuses to driver-facing lifecycle steps.
enum TripLifecycleStep {
  assigned,
  onTheWay,
  reachedPickup,
  rideStarted,
  completed,
  cancelled,
  unknown,
}

class TripStatusMapper {
  static TripLifecycleStep fromBackend(String? status) {
    switch (status) {
      case 'driver_assigned':
      case 'driver_accepted':
      case 'driver_notified':
      case 'confirmed':
      case 'pending':
        return TripLifecycleStep.assigned;
      case 'on_the_way':
        return TripLifecycleStep.onTheWay;
      case 'arrived':
        return TripLifecycleStep.reachedPickup;
      case 'trip_started':
        return TripLifecycleStep.rideStarted;
      case 'completed':
        return TripLifecycleStep.completed;
      case 'cancelled':
      case 'rejected':
      case 'no_show':
        return TripLifecycleStep.cancelled;
      default:
        return TripLifecycleStep.unknown;
    }
  }

  static String label(String? status) {
    switch (status) {
      case 'driver_assigned':
        return 'Assigned';
      case 'on_the_way':
        return 'On the way';
      case 'arrived':
        return 'At pickup';
      case 'trip_started':
        return 'In progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'rejected':
        return 'Rejected';
      case 'no_show':
        return 'No show';
      case 'unpaid':
        return 'Unpaid';
      case 'partial':
        return 'Partial';
      case 'paid':
        return 'Paid';
      default:
        if (status == null || status.isEmpty) return 'Unknown';
        return status.replaceAll('_', ' ');
    }
  }

  /// Driver-allowed next action for UI (null = none).
  static String? nextAction(String status) {
    switch (status) {
      case 'driver_assigned':
        return 'on_the_way';
      case 'on_the_way':
        return 'arrived';
      case 'arrived':
        return 'start';
      case 'trip_started':
        return 'complete';
      case 'completed':
        return 'payment';
      default:
        return null;
    }
  }

  static bool canTransition(String from, String to) {
    const allowed = <String, Set<String>>{
      'driver_assigned': {'on_the_way', 'cancelled', 'no_show'},
      'on_the_way': {'arrived', 'cancelled', 'no_show'},
      'arrived': {'trip_started', 'cancelled', 'no_show'},
      'trip_started': {'completed', 'cancelled'},
    };
    return allowed[from]?.contains(to) ?? false;
  }
}

class OdometerValidator {
  static String? validateStart(double? value) {
    if (value == null) return 'Start odometer is required';
    if (value < 0) return 'Odometer cannot be negative';
    return null;
  }

  static String? validateEnd({
    required double? endKm,
    required double? startKm,
  }) {
    if (endKm == null) return 'End odometer is required';
    if (endKm < 0) return 'Odometer cannot be negative';
    if (startKm != null && endKm < startKm) {
      return 'End odometer must be greater than or equal to start ($startKm km)';
    }
    return null;
  }
}
