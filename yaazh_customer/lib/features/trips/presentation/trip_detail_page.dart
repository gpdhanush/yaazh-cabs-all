import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/network/api_exception.dart';
import 'package:yaazh_customer/core/widgets/app_error_view.dart';
import 'package:yaazh_customer/core/widgets/app_loading_view.dart';
import 'package:yaazh_customer/core/widgets/status_chip.dart';
import 'package:yaazh_customer/features/booking/data/booking_repository.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';
import 'package:yaazh_customer/features/trips/presentation/trips_viewmodel.dart';

class TripDetailPage extends ConsumerStatefulWidget {
  final String bookingId;

  const TripDetailPage({super.key, required this.bookingId});

  @override
  ConsumerState<TripDetailPage> createState() => _TripDetailPageState();
}

class _TripDetailPageState extends ConsumerState<TripDetailPage> {
  Booking? _booking;
  DriverLocation? _driverLoc;
  Object? _error;
  Timer? _poll;
  int _rating = 5;
  final _reviewController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _poll?.cancel();
    _reviewController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final booking = await ref.read(bookingRepositoryProvider).getBooking(widget.bookingId);
      if (!mounted) return;
      setState(() {
        _booking = booking;
        _error = null;
      });
      if (booking.isActive) {
        _poll?.cancel();
        _poll = Timer.periodic(const Duration(seconds: 8), (_) => _pollLocation());
        await _pollLocation();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _pollLocation() async {
    try {
      final loc = await ref.read(bookingRepositoryProvider).getDriverLocation(widget.bookingId);
      if (!mounted) return;
      setState(() => _driverLoc = loc);
    } catch (_) {}
  }

  Future<void> _cancel() async {
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Cancel trip?'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(labelText: 'Reason (optional)'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Keep trip')),
            TextButton(onPressed: () => Navigator.pop(ctx, controller.text), child: const Text('Cancel trip')),
          ],
        );
      },
    );
    if (reason == null) return;
    try {
      await ref.read(bookingRepositoryProvider).cancel(widget.bookingId, reason: reason);
      await ref.read(tripListProvider.notifier).refresh();
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : e.toString())),
      );
    }
  }

  Future<void> _rate() async {
    try {
      await ref.read(bookingRepositoryProvider).rate(
            widget.bookingId,
            rating: _rating,
            review: _reviewController.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Thanks for the rating')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : e.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null && _booking == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Trip')),
        body: AppErrorView(message: _error.toString(), onRetry: _load),
      );
    }
    final booking = _booking;
    if (booking == null) {
      return const Scaffold(body: AppLoadingView(message: 'Loading trip…'));
    }

    final pickup = booking.pickupLat != null && booking.pickupLng != null
        ? LatLng(booking.pickupLat!, booking.pickupLng!)
        : null;
    final drop = booking.dropLat != null && booking.dropLng != null
        ? LatLng(booking.dropLat!, booking.dropLng!)
        : null;
    final driverPoint = _driverLoc?.latitude != null && _driverLoc?.longitude != null
        ? LatLng(_driverLoc!.latitude!, _driverLoc!.longitude!)
        : null;

    return Scaffold(
      appBar: AppBar(title: Text(booking.bookingReference)),
      body: ListView(
        children: [
          SizedBox(
            height: 240,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: pickup ?? driverPoint ?? AppConstants.defaultCenter,
                initialZoom: 13,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: AppConstants.osmUserAgent,
                ),
                MarkerLayer(
                  markers: [
                    if (pickup != null)
                      Marker(
                        point: pickup,
                        width: 36,
                        height: 36,
                        child: const Icon(Icons.trip_origin_rounded, color: Color(0xFF16A34A)),
                      ),
                    if (drop != null)
                      Marker(
                        point: drop,
                        width: 36,
                        height: 36,
                        child: const Icon(Icons.location_on_rounded, color: AppConstants.errorColor),
                      ),
                    if (driverPoint != null)
                      Marker(
                        point: driverPoint,
                        width: 42,
                        height: 42,
                        child: const Icon(Icons.local_taxi_rounded, color: AppConstants.accentHover, size: 34),
                      ),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    StatusChip.forStatus(booking.status),
                    const Spacer(),
                    Text(
                      '₹${(booking.finalTotal ?? booking.estimatedTotal).toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text('${booking.pickupLocation} → ${booking.dropLocation}',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                if (booking.pickupAt != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      DateFormat('EEE, d MMM yyyy · h:mm a').format(booking.pickupAt!.toLocal()),
                      style: const TextStyle(color: AppConstants.textSecondaryLight),
                    ),
                  ),
                if (booking.driver != null) ...[
                  const SizedBox(height: 16),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: AppConstants.accentColor,
                      child: Text(booking.driver!.name.isNotEmpty ? booking.driver!.name[0] : 'D'),
                    ),
                    title: Text(booking.driver!.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text(booking.vehicle?.registration ?? booking.vehicle?.name ?? 'Assigned cab'),
                    trailing: booking.driver!.phone.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.phone_rounded),
                            onPressed: () => launchUrl(Uri.parse('tel:${booking.driver!.phone}')),
                          ),
                  ),
                ],
                if (booking.statusHistory.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text('Status timeline', style: TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  for (final item in booking.statusHistory)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        '${item.newStatus.replaceAll('_', ' ')}'
                        '${item.changedAt != null ? ' · ${DateFormat('d MMM, h:mm a').format(item.changedAt!.toLocal())}' : ''}',
                        style: const TextStyle(color: AppConstants.textSecondaryLight),
                      ),
                    ),
                ],
                if (booking.canCancel) ...[
                  const SizedBox(height: 16),
                  OutlinedButton(
                    onPressed: _cancel,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppConstants.errorColor,
                      side: const BorderSide(color: AppConstants.errorColor),
                    ),
                    child: const Text('CANCEL TRIP'),
                  ),
                ],
                if (booking.isCompleted) ...[
                  const SizedBox(height: 20),
                  const Text('Rate this trip', style: TextStyle(fontWeight: FontWeight.w800)),
                  Row(
                    children: [
                      for (var i = 1; i <= 5; i++)
                        IconButton(
                          onPressed: () => setState(() => _rating = i),
                          icon: Icon(
                            i <= _rating ? Icons.star_rounded : Icons.star_border_rounded,
                            color: AppConstants.accentColor,
                          ),
                        ),
                    ],
                  ),
                  TextField(
                    controller: _reviewController,
                    decoration: const InputDecoration(labelText: 'Review (optional)'),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(onPressed: _rate, child: const Text('SUBMIT RATING')),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
