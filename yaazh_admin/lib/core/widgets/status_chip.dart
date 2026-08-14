import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';

class BookingStatus {
  static const pending = 'pending';
  static const confirmed = 'confirmed';
  static const driverNotified = 'driver_notified';
  static const driverAccepted = 'driver_accepted';
  static const driverRejected = 'driver_rejected';
  static const driverAssigned = 'driver_assigned';
  static const onTheWay = 'on_the_way';
  static const arrived = 'arrived';
  static const tripStarted = 'trip_started';
  static const completed = 'completed';
  static const cancelled = 'cancelled';
  static const rejected = 'rejected';
  static const noShow = 'no_show';

  static const active = [
    confirmed,
    driverNotified,
    driverAccepted,
    driverRejected,
    driverAssigned,
    onTheWay,
    arrived,
    tripStarted,
  ];

  static const history = [completed, cancelled, rejected, noShow];

  static const assignable = [
    confirmed,
    driverNotified,
    driverAccepted,
    driverRejected,
  ];

  static String label(String status) {
    const map = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      driverNotified: 'Driver notified',
      driverAccepted: 'Driver accepted',
      driverRejected: 'Driver rejected',
      driverAssigned: 'Driver assigned',
      onTheWay: 'On the way',
      arrived: 'Arrived',
      tripStarted: 'Trip started',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
      noShow: 'No show',
    };
    return map[status] ?? status.replaceAll('_', ' ');
  }

  static bool canAssign(String status) => assignable.contains(status);

  static bool canConfirm(String status) => status == pending;

  static bool canCancel(String status) =>
      status != completed && status != cancelled && status != rejected;

  static IconData icon(String status) {
    return switch (status) {
      pending => Icons.schedule_rounded,
      confirmed => Icons.check_circle_rounded,
      driverNotified => Icons.notifications_rounded,
      driverAccepted => Icons.thumb_up_rounded,
      driverRejected => Icons.thumb_down_rounded,
      driverAssigned => Icons.badge_rounded,
      onTheWay => Icons.directions_car_rounded,
      arrived => Icons.location_on_rounded,
      tripStarted => Icons.play_arrow_rounded,
      completed => Icons.done_all_rounded,
      cancelled => Icons.cancel_rounded,
      rejected => Icons.block_rounded,
      noShow => Icons.person_off_rounded,
      _ => Icons.circle,
    };
  }

  static Color color(String status) {
    if ([pending, driverNotified].contains(status)) return AppColors.warning;
    if (active.contains(status)) return AppColors.supportBlue;
    if (status == completed) return AppColors.success;
    if ([cancelled, rejected, noShow, driverRejected].contains(status)) {
      return AppColors.salmon;
    }
    return AppColors.textSecondaryLight;
  }
}

class StatusChip extends StatelessWidget {
  final String status;
  final String? label;
  final Color? tone;

  const StatusChip({super.key, required this.status, this.label, this.tone});

  @override
  Widget build(BuildContext context) {
    final color = tone ?? BookingStatus.color(status);
    return UnconstrainedBox(
      alignment: Alignment.centerLeft,
      constrainedAxis: Axis.vertical,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(
          label ?? BookingStatus.label(status),
          style: TextStyle(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
