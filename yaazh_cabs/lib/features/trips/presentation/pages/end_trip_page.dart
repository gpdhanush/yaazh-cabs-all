import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/location/trip_location_tracker.dart';
import 'package:yaazh_cabs/features/trips/domain/booking.dart';
import 'package:yaazh_cabs/features/trips/domain/trip_lifecycle.dart';
import 'package:yaazh_cabs/features/trips/presentation/viewmodels/active_trip_viewmodel.dart';

class EndTripPage extends ConsumerStatefulWidget {
  final Booking booking;

  const EndTripPage({
    super.key,
    required this.booking,
  });

  @override
  ConsumerState<EndTripPage> createState() => _EndTripPageState();
}

class _EndTripPageState extends ConsumerState<EndTripPage> {
  final _formKey = GlobalKey<FormState>();
  final _endOdoController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _endOdoController.dispose();
    super.dispose();
  }

  void _onCompleteTrip() async {
    if (!_formKey.currentState!.validate()) return;

    final endOdo = double.tryParse(_endOdoController.text.trim());
    if (endOdo == null) return;

    final startOdo = widget.booking.startOdometerKm;
    final validation = OdometerValidator.validateEnd(
      endKm: endOdo,
      startKm: startOdo,
    );
    if (validation != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(validation)),
      );
      return;
    }

    setState(() => _submitting = true);

    final success = await ref
        .read(activeTripNotifierProvider.notifier)
        .completeTrip(widget.booking.id, endOdo);

    if (mounted) {
      setState(() => _submitting = false);

      if (success) {
        await ref.read(tripLocationTrackerProvider).stop();
        final trip = ref.read(activeTripNotifierProvider).valueOrNull;
        if (trip != null && trip.needsPayment) {
          context.go('/payment/${widget.booking.id}');
        } else {
          context.go('/summary/${widget.booking.id}');
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to complete ride. Please try again.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final startOdo = widget.booking.startOdometerKm ?? 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('End Ride & Meter Reading'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.paddingL),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Final Odometer Reading',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Record the vehicle meter reading upon reaching destination to calculate actual trip distance.',
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(height: 24),

                // Start Odometer reference
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Start Odometer',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                      ),
                      Text(
                        '$startOdo km',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppConstants.accentHover,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // End Odometer input
                TextFormField(
                  controller: _endOdoController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'End Odometer Reading (KM)',
                    suffixText: 'km',
                    prefixIcon: Icon(Icons.speed_rounded),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'End odometer reading is required';
                    }
                    final numVal = double.tryParse(value.trim());
                    if (numVal == null || numVal <= 0) {
                      return 'Enter a valid numeric odometer reading';
                    }
                    if (numVal < startOdo) {
                      return 'Reading must be >= $startOdo km';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 32),

                ElevatedButton(
                  onPressed: _submitting ? null : _onCompleteTrip,
                  child: _submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.black,
                          ),
                        )
                      : const Text('SUBMIT & COMPLETE RIDE'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
