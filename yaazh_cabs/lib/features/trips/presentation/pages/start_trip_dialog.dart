import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/location/trip_location_tracker.dart';
import 'package:yaazh_cabs/features/trips/domain/trip_lifecycle.dart';
import 'package:yaazh_cabs/features/trips/presentation/viewmodels/active_trip_viewmodel.dart';

class StartTripDialog extends ConsumerStatefulWidget {
  final String bookingId;

  const StartTripDialog({
    super.key,
    required this.bookingId,
  });

  @override
  ConsumerState<StartTripDialog> createState() => _StartTripDialogState();
}

class _StartTripDialogState extends ConsumerState<StartTripDialog> {
  final _formKey = GlobalKey<FormState>();
  final _odoController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _odoController.dispose();
    super.dispose();
  }

  void _onConfirmStart() async {
    if (!_formKey.currentState!.validate()) return;

    final odo = double.tryParse(_odoController.text.trim());
    if (odo == null) return;

    setState(() {
      _submitting = true;
    });

    final success = await ref
        .read(activeTripNotifierProvider.notifier)
        .startTrip(widget.bookingId, odo);

    if (mounted) {
      setState(() {
        _submitting = false;
      });
      if (success) {
        await ref.read(tripLocationTrackerProvider).start(widget.bookingId);
        if (!mounted) return;
        Navigator.of(context).pop();
        context.push('/active-trip/${widget.bookingId}');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to start trip. Check odometer reading.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Start Trip'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter the initial vehicle odometer reading (in KM) before beginning the journey.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _odoController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Start Odometer (KM)',
                suffixText: 'km',
                prefixIcon: Icon(Icons.speed_rounded),
              ),
              validator: (value) {
                final numVal = double.tryParse(value?.trim() ?? '');
                return OdometerValidator.validateStart(numVal);
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _submitting ? null : () => Navigator.of(context).pop(),
          child: const Text('CANCEL'),
        ),
        ElevatedButton(
          onPressed: _submitting ? null : _onConfirmStart,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppConstants.accentColor,
            foregroundColor: Colors.black,
            minimumSize: const Size(120, 44),
          ),
          child: _submitting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                )
              : const Text('START RIDE'),
        ),
      ],
    );
  }
}
