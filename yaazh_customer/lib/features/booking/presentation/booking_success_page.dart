import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';

class BookingSuccessPage extends StatelessWidget {
  final Booking booking;

  const BookingSuccessPage({super.key, required this.booking});

  @override
  Widget build(BuildContext context) {
    final when = booking.pickupAt != null
        ? DateFormat('EEE, d MMM yyyy · h:mm a').format(booking.pickupAt!.toLocal())
        : 'Scheduled';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) context.go('/home');
      },
      child: Scaffold(
        backgroundColor: AppConstants.bgLight,
        appBar: AppBar(
          backgroundColor: AppConstants.bgLight,
          leading: IconButton(
            tooltip: 'Back to dashboard',
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => context.go('/home'),
          ),
          title: const Text('Booking confirmed'),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Column(
              children: [
                Expanded(
                  child: ListView(
                    children: [
                      const SizedBox(height: 12),
                      Center(
                        child: Container(
                          width: 88,
                          height: 88,
                          decoration: BoxDecoration(
                            color: AppConstants.successColor.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_rounded,
                            size: 48,
                            color: AppConstants.successColor,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'Your cab is booked',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.4),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'We will assign a driver shortly. Keep your phone handy.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          height: 1.45,
                          color: AppConstants.textSecondaryLight.withValues(alpha: 0.95),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: AppConstants.borderLight),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  booking.bookingReference,
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                                ),
                                const Spacer(),
                                Text(
                                  '₹${booking.estimatedTotal.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: AppConstants.accentHover,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              when,
                              style: const TextStyle(color: AppConstants.textSecondaryLight),
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 14),
                              child: Divider(height: 1),
                            ),
                            _Point(
                              color: const Color(0xFF16A34A),
                              icon: Icons.trip_origin_rounded,
                              label: 'Pickup',
                              value: booking.pickupLocation,
                            ),
                            const SizedBox(height: 14),
                            _Point(
                              color: AppConstants.errorColor,
                              icon: Icons.location_on_rounded,
                              label: 'Drop',
                              value: booking.dropLocation,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () => context.go('/home'),
                  child: const Text('GO TO DASHBOARD'),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: () => context.push('/trips/${booking.id}'),
                  child: const Text('VIEW TRIP'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Point extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String label;
  final String value;

  const _Point({
    required this.color,
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                  color: AppConstants.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w600, height: 1.3)),
            ],
          ),
        ),
      ],
    );
  }
}
