import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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

  Future<void> _goDashboard() async {
    if (!mounted) return;
    context.go('/home');
  }

  Future<bool> _confirmExit() async {
    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Leave trip details?'),
        content: const Text(
          'Your booking will keep running. You can open it again from Trips anytime.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Stay'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Go to dashboard'),
          ),
        ],
      ),
    );
    return leave == true;
  }

  Future<void> _onBackPressed() async {
    final leave = await _confirmExit();
    if (!leave || !mounted) return;
    await _goDashboard();
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
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: _onBackPressed,
          ),
          title: const Text('Trip'),
        ),
        body: AppErrorView(message: _error.toString(), onRetry: _load),
      );
    }
    final booking = _booking;
    if (booking == null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: _onBackPressed,
          ),
          title: const Text('Trip'),
        ),
        body: const AppLoadingView(message: 'Loading trip…'),
      );
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

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _onBackPressed();
      },
      child: Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: IconButton(
          tooltip: 'Back',
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _onBackPressed,
        ),
        title: Text(booking.bookingReference),
      ),
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
                  const SizedBox(height: 20),
                  _StatusTimeline(items: booking.statusHistory),
                ],
                const SizedBox(height: 16),
                if (booking.canCancel)
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _cancel,
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 50),
                            foregroundColor: AppConstants.errorColor,
                            side: const BorderSide(color: AppConstants.errorColor),
                          ),
                          child: const Text('CANCEL TRIP'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _goDashboard,
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size(0, 50),
                          ),
                          child: const Text('DASHBOARD'),
                        ),
                      ),
                    ],
                  )
                else
                  ElevatedButton(
                    onPressed: _goDashboard,
                    child: const Text('GO TO DASHBOARD'),
                  ),
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
    ),
    );
  }
}

class _StatusTimeline extends StatelessWidget {
  final List<StatusHistoryItem> items;

  const _StatusTimeline({required this.items});

  @override
  Widget build(BuildContext context) {
    final steps = items.reversed.toList();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppConstants.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'STATUS TIMELINE',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: AppConstants.textSecondaryLight,
            ),
          ),
          const SizedBox(height: 16),
          for (var i = 0; i < steps.length; i++)
            _TimelineStep(
              item: steps[i],
              isLatest: i == 0,
              isLast: i == steps.length - 1,
            ),
        ],
      ),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  final StatusHistoryItem item;
  final bool isLatest;
  final bool isLast;

  const _TimelineStep({
    required this.item,
    required this.isLatest,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    final style = _timelineStyle(item.newStatus, isLatest);
    final time = item.changedAt == null
        ? ''
        : DateFormat('d MMM · h:mm a').format(item.changedAt!.toLocal());

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 28,
            child: Column(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: style.dot,
                    shape: BoxShape.circle,
                    boxShadow: isLatest
                        ? [
                            BoxShadow(
                              color: style.dot.withValues(alpha: 0.28),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ]
                        : null,
                  ),
                  child: Icon(style.icon, size: 15, color: style.iconColor),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 8 : 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _statusLabel(item.newStatus),
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: style.title,
                          ),
                        ),
                      ),
                      if (time.isNotEmpty)
                        Text(
                          time,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppConstants.textSecondaryLight,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    style.caption,
                    style: const TextStyle(
                      fontSize: 12,
                      height: 1.35,
                      color: AppConstants.textSecondaryLight,
                    ),
                  ),
                  if (item.note != null && item.note!.trim().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      item.note!.trim(),
                      style: const TextStyle(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: AppConstants.textSecondaryLight,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineStyle {
  final Color dot;
  final Color iconColor;
  final Color title;
  final IconData icon;
  final String caption;

  const _TimelineStyle({
    required this.dot,
    required this.iconColor,
    required this.title,
    required this.icon,
    required this.caption,
  });
}

_TimelineStyle _timelineStyle(String status, bool isLatest) {
  final key = status.toLowerCase();
  final past = !isLatest;

  switch (key) {
    case 'completed':
    case 'paid':
      return _TimelineStyle(
        dot: const Color(0xFF16A34A),
        iconColor: Colors.white,
        title: const Color(0xFF166534),
        icon: Icons.check_rounded,
        caption: 'Trip completed successfully',
      );
    case 'cancelled':
    case 'rejected':
    case 'no_show':
    case 'driver_rejected':
      return _TimelineStyle(
        dot: AppConstants.errorColor,
        iconColor: Colors.white,
        title: const Color(0xFFB91C1C),
        icon: Icons.close_rounded,
        caption: 'This booking was closed',
      );
    case 'confirmed':
      return _TimelineStyle(
        dot: past ? const Color(0xFF16A34A) : AppConstants.accentColor,
        iconColor: past ? Colors.white : Colors.black,
        title: AppConstants.textPrimaryLight,
        icon: past ? Icons.check_rounded : Icons.verified_rounded,
        caption: 'Booking confirmed',
      );
    case 'driver_notified':
    case 'driver_accepted':
    case 'driver_assigned':
      return _TimelineStyle(
        dot: past ? const Color(0xFF16A34A) : const Color(0xFF2563EB),
        iconColor: Colors.white,
        title: AppConstants.textPrimaryLight,
        icon: past ? Icons.check_rounded : Icons.local_taxi_rounded,
        caption: 'A driver has been assigned',
      );
    case 'on_the_way':
      return _TimelineStyle(
        dot: past ? const Color(0xFF16A34A) : const Color(0xFF2563EB),
        iconColor: Colors.white,
        title: AppConstants.textPrimaryLight,
        icon: past ? Icons.check_rounded : Icons.near_me_rounded,
        caption: 'Driver is heading to pickup',
      );
    case 'arrived':
      return _TimelineStyle(
        dot: past ? const Color(0xFF16A34A) : AppConstants.accentColor,
        iconColor: past ? Colors.white : Colors.black,
        title: AppConstants.textPrimaryLight,
        icon: past ? Icons.check_rounded : Icons.place_rounded,
        caption: 'Driver has arrived',
      );
    case 'trip_started':
      return _TimelineStyle(
        dot: past ? const Color(0xFF16A34A) : AppConstants.accentColor,
        iconColor: past ? Colors.white : Colors.black,
        title: AppConstants.textPrimaryLight,
        icon: past ? Icons.check_rounded : Icons.directions_car_rounded,
        caption: 'Your ride is in progress',
      );
    case 'pending':
    default:
      return _TimelineStyle(
        dot: past ? const Color(0xFF16A34A) : AppConstants.accentColor,
        iconColor: past ? Colors.white : Colors.black,
        title: AppConstants.textPrimaryLight,
        icon: past ? Icons.check_rounded : Icons.schedule_rounded,
        caption: 'Waiting for confirmation',
      );
  }
}

String _statusLabel(String status) {
  return status
      .split('_')
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}
