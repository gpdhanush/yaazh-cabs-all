import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/location/location_service.dart';
import 'package:yaazh_customer/core/network/api_exception.dart';
import 'package:yaazh_customer/features/booking/data/booking_repository.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';
import 'package:yaazh_customer/features/trips/presentation/trips_viewmodel.dart';

class ConfirmBookingPage extends ConsumerStatefulWidget {
  final BookingDraft draft;

  const ConfirmBookingPage({super.key, required this.draft});

  @override
  ConsumerState<ConfirmBookingPage> createState() => _ConfirmBookingPageState();
}

class _ConfirmBookingPageState extends ConsumerState<ConfirmBookingPage> {
  late BookingDraft _draft;
  final _couponController = TextEditingController();
  final _noteController = TextEditingController();
  int _passengers = 1;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _draft = widget.draft;
    _passengers = widget.draft.passengerCount;
    _couponController.text = widget.draft.couponCode ?? '';
    _noteController.text = widget.draft.specialNote ?? '';
  }

  @override
  void dispose() {
    _couponController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusManager.instance.primaryFocus?.unfocus();
    final active = ref.read(upcomingTripProvider);
    if (active != null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('You already have an ongoing trip (${active.bookingReference}).')),
      );
      context.push('/trips/${active.id}');
      return;
    }
    setState(() => _submitting = true);
    try {
      var draft = _draft.copyWith(
        passengerCount: _passengers,
        couponCode: _couponController.text.trim(),
        specialNote: _noteController.text.trim(),
      );
      final here = await ref.read(locationServiceProvider).getCurrentLatLng();
      if (here != null && draft.useCurrentLocation) {
        draft = draft.copyWith(
          pickupLat: here.latitude,
          pickupLng: here.longitude,
        );
      } else if (here == null && draft.useCurrentLocation) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Turn on GPS so the driver can find your pickup.')),
        );
        setState(() => _submitting = false);
        return;
      }
      _draft = draft;
      final booking = await ref.read(bookingRepositoryProvider).createBooking(draft);
      await ref.read(tripListProvider.notifier).refresh();
      if (!mounted) return;
      context.go('/book/success', extra: booking);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : e.toString())),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final quote = _draft.quote;
    final when = DateFormat('EEE, d MMM yyyy · h:mm a').format(_draft.pickupAt);

    return Scaffold(
      appBar: AppBar(title: const Text('Confirm booking')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_draft.vehicleName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(_draft.tripType.replaceAll('_', ' ').toUpperCase(),
                    style: const TextStyle(color: AppConstants.textSecondaryLight, fontWeight: FontWeight.w700)),
                const SizedBox(height: 14),
                _Line(
                  icon: Icons.trip_origin_rounded,
                  color: const Color(0xFF16A34A),
                  text: _draft.useCurrentLocation
                      ? '${_draft.pickupLabel} · live GPS'
                      : _draft.pickupLabel,
                ),
                const SizedBox(height: 8),
                _Line(icon: Icons.location_on_rounded, color: AppConstants.errorColor, text: _draft.dropLabel),
                const SizedBox(height: 12),
                Text(when, style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Passengers', style: TextStyle(fontWeight: FontWeight.w800)),
                Row(
                  children: [
                    IconButton(
                      onPressed: _passengers > 1 ? () => setState(() => _passengers--) : null,
                      icon: const Icon(Icons.remove_circle_outline),
                    ),
                    Text('$_passengers', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    IconButton(
                      onPressed: _passengers < 8 ? () => setState(() => _passengers++) : null,
                      icon: const Icon(Icons.add_circle_outline),
                    ),
                  ],
                ),
                TextField(
                  controller: _couponController,
                  decoration: const InputDecoration(labelText: 'Coupon code (optional)'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _noteController,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Note for driver (optional)'),
                ),
              ],
            ),
          ),
          if (quote != null) ...[
            const SizedBox(height: 12),
            _Card(
              child: Column(
                children: [
                  _FareRow('Distance', '${quote.distanceKm.toStringAsFixed(1)} km'),
                  _FareRow('Base fare', '₹${quote.baseFare.toStringAsFixed(0)}'),
                  _FareRow('Driver batta', '₹${quote.driverBatta.toStringAsFixed(0)}'),
                  if (quote.discountAmount > 0)
                    _FareRow('Discount', '-₹${quote.discountAmount.toStringAsFixed(0)}'),
                  _FareRow('GST', '₹${quote.gstAmount.toStringAsFixed(0)}'),
                  const Divider(height: 20),
                  _FareRow('Estimated total', '₹${quote.estimatedTotal.toStringAsFixed(0)}', bold: true),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                  )
                : const Text('CONFIRM BOOKING'),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppConstants.borderLight),
      ),
      child: child,
    );
  }
}

class _Line extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String text;
  const _Line({required this.icon, required this.color, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600))),
      ],
    );
  }
}

class _FareRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _FareRow(this.label, this.value, {this.bold = false});

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w500, fontSize: bold ? 16 : 14);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: style),
          const Spacer(),
          Text(value, style: style),
        ],
      ),
    );
  }
}
