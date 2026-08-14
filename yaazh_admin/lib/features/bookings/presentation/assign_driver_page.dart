import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/network/media_url.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/bookings/domain/booking.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';

class AssignDriverPage extends ConsumerStatefulWidget {
  final String bookingId;

  const AssignDriverPage({super.key, required this.bookingId});

  @override
  ConsumerState<AssignDriverPage> createState() => _AssignDriverPageState();
}

class _AssignDriverPageState extends ConsumerState<AssignDriverPage> {
  String? _driverId;
  String _vehicleId = '';
  String _query = '';
  bool _saving = false;

  Future<void> _submit() async {
    hideKeyboard();
    if (_driverId == null) {
      showErrorToast('Select a driver');
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(bookingRepositoryProvider).assignDriver(
            bookingId: widget.bookingId,
            driverId: _driverId!,
            vehicleId: _vehicleId.isEmpty ? null : _vehicleId,
          );
      ref.invalidate(bookingDetailProvider(widget.bookingId));
      ref.invalidate(bookingsProvider);
      ref.invalidate(dashboardStatsProvider);
      ref.invalidate(liveTripsProvider);
      showSuccessToast('Driver assigned. Customer and driver notified.');
      if (mounted) context.pop();
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingAsync = ref.watch(bookingDetailProvider(widget.bookingId));
    final driversAsync = ref.watch(driversProvider);
    final vehiclesAsync = ref.watch(vehiclesProvider);
    final theme = Theme.of(context);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Assign driver')),
        body: bookingAsync.when(
          loading: () => const Center(child: YaLoader()),
          error: (err, _) => EmptyState(
            title: 'Could not load booking',
            subtitle: err.toString(),
            icon: Icons.cloud_off_rounded,
          ),
          data: (booking) {
            if (!BookingStatus.canAssign(booking.status)) {
              return EmptyState(
                title: 'Cannot assign',
                subtitle: 'This booking is ${BookingStatus.label(booking.status).toLowerCase()}.',
                icon: Icons.lock_outline_rounded,
              );
            }

            final drivers = driversAsync.valueOrNull
                    ?.where((d) => d.isActive)
                    .where((d) {
                      if (_query.trim().isEmpty) return true;
                      final q = _query.toLowerCase();
                      return d.name.toLowerCase().contains(q) ||
                          d.phone.contains(q);
                    })
                    .toList() ??
                const <AdminDriver>[];
            final vehicles = vehiclesAsync.valueOrNull ?? const <AdminVehicle>[];

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                Text(
                  booking.bookingReference,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
                Text(
                  '${booking.customerName} · ${booking.pickupLocation} → ${booking.dropLocation}',
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                TextField(
                  onChanged: (v) => setState(() => _query = v),
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                    hintText: 'Search driver name or phone',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
                const SizedBox(height: 12),
                if (driversAsync.isLoading)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: YaLoader()),
                  )
                else if (drivers.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Text('No matching drivers.'),
                  )
                else
                  ...drivers.map((d) {
                    final selected = _driverId == d.id;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Material(
                        color: selected
                            ? theme.colorScheme.primary.withValues(alpha: 0.08)
                            : theme.colorScheme.surface,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: BorderSide(
                            color: selected ? theme.colorScheme.primary : theme.dividerColor,
                            width: selected ? 1.6 : 1,
                          ),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () {
                            hideKeyboard();
                            setState(() => _driverId = d.id);
                          },
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.14),
                              backgroundImage: driverPhotoUrl(id: d.id, photoUrl: d.photoUrl) != null
                                  ? NetworkImage(driverPhotoUrl(id: d.id, photoUrl: d.photoUrl)!)
                                  : null,
                              child: driverPhotoUrl(id: d.id, photoUrl: d.photoUrl) == null
                                  ? Text(d.name.isNotEmpty ? d.name[0].toUpperCase() : 'D')
                                  : null,
                            ),
                            title: Text(d.name),
                            subtitle: Text(
                              [
                                d.phone,
                                if (d.availabilityStatus != null)
                                  d.availabilityStatus!.replaceAll('_', ' '),
                              ].join(' · '),
                            ),
                            trailing: selected
                                ? Icon(Icons.check_circle_rounded, color: theme.colorScheme.primary)
                                : const Icon(Icons.circle_outlined),
                          ),
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 8),
                YaDropdown<String>(
                  label: 'Vehicle',
                  hint: 'No vehicle',
                  value: _vehicleId,
                  items: [
                    const DropdownMenuItem(value: '', child: Text('No vehicle')),
                    for (final v in vehicles)
                      DropdownMenuItem(value: v.id, child: Text(v.label)),
                  ],
                  onChanged: (v) {
                    hideKeyboard();
                    setState(() => _vehicleId = v ?? '');
                  },
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  child: Text(_saving ? 'SAVING…' : 'ASSIGN DRIVER'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
