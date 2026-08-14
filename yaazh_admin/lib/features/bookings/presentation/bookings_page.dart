import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_danger_button.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/bookings/domain/booking.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';
import 'package:yaazh_admin/features/shell/admin_shell.dart';

final bookingSearchProvider = StateProvider<String>((ref) => '');
final bookingMonthProvider = StateProvider<String>((ref) => 'all');

final _monthLabel = DateFormat('MMM yyyy');

String _monthKey(DateTime dt) =>
    '${dt.year.toString().padLeft(4, '0')}-${dt.month.toString().padLeft(2, '0')}';

class BookingsPage extends ConsumerWidget {
  const BookingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 4,
      child: KeyboardDismiss(
        child: Scaffold(
          appBar: AppBar(
            leading: const YaDrawerButton(),
            title: const Text('Bookings'),
            bottom: const TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(text: 'All'),
                Tab(text: 'Pending'),
                Tab(text: 'Active'),
                Tab(text: 'History'),
              ],
            ),
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        textInputAction: TextInputAction.search,
                        onChanged: (value) =>
                            ref.read(bookingSearchProvider.notifier).state = value,
                        decoration: const InputDecoration(
                          hintText: 'Search reference, customer, route…',
                          prefixIcon: Icon(Icons.search_rounded),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const _MonthDropdown(),
                  ],
                ),
              ),
              const Expanded(
                child: TabBarView(
                  children: [
                    _BookingList(tab: _BookingTab.all),
                    _BookingList(tab: _BookingTab.pending),
                    _BookingList(tab: _BookingTab.active),
                    _BookingList(tab: _BookingTab.history),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MonthDropdown extends ConsumerWidget {
  const _MonthDropdown();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(bookingMonthProvider);
    final bookings = ref.watch(bookingsProvider).valueOrNull ?? const <Booking>[];
    final keys = <String>{};
    for (final b in bookings) {
      final dt = DateTime.tryParse(b.pickupAt)?.toLocal();
      if (dt != null) keys.add(_monthKey(dt));
    }
    keys.add(_monthKey(DateTime.now()));
    final months = keys.toList()..sort((a, b) => b.compareTo(a));

    return SizedBox(
      width: 128,
      child: DropdownButtonFormField<String>(
        initialValue: selected,
        isExpanded: true,
        decoration: const InputDecoration(
          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        ),
        items: [
          const DropdownMenuItem(value: 'all', child: Text('All')),
          for (final key in months)
            DropdownMenuItem(
              value: key,
              child: Text(
                _monthLabel.format(DateTime.parse('$key-01')),
                overflow: TextOverflow.ellipsis,
              ),
            ),
        ],
        onChanged: (value) {
          if (value == null) return;
          ref.read(bookingMonthProvider.notifier).state = value;
        },
      ),
    );
  }
}

enum _BookingTab { all, pending, active, history }

class _BookingList extends ConsumerWidget {
  final _BookingTab tab;

  const _BookingList({required this.tab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(bookingsProvider);
    final query = ref.watch(bookingSearchProvider).trim().toLowerCase();
    final month = ref.watch(bookingMonthProvider);

    return async.when(
      loading: () => const Center(child: YaLoader()),
      error: (err, _) => EmptyState(
        title: 'Could not load bookings',
        subtitle: err.toString(),
        icon: Icons.cloud_off_rounded,
      ),
      data: (rows) {
        final filtered = rows.where((b) {
          final inTab = switch (tab) {
            _BookingTab.all => true,
            _BookingTab.pending => b.status == BookingStatus.pending,
            _BookingTab.active => BookingStatus.active.contains(b.status),
            _BookingTab.history => BookingStatus.history.contains(b.status),
          };
          if (!inTab) return false;
          if (month != 'all') {
            final dt = DateTime.tryParse(b.pickupAt)?.toLocal();
            if (dt == null || _monthKey(dt) != month) return false;
          }
          if (query.isEmpty) return true;
          final hay = [
            b.bookingReference,
            b.customerName,
            b.pickupLocation,
            b.dropLocation,
            b.status,
          ].join(' ').toLowerCase();
          return hay.contains(query);
        }).toList();

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(bookingsProvider);
            await ref.read(bookingsProvider.future);
          },
          child: filtered.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      title: 'No bookings',
                      subtitle: 'New website bookings will show up here.',
                      icon: Icons.local_taxi_outlined,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    return _BookingCard(booking: filtered[index]);
                  },
                ),
        );
      },
    );
  }
}

class _BookingCard extends ConsumerWidget {
  final Booking booking;

  const _BookingCard({required this.booking});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final b = booking;
    final route = '${b.pickupLocation} → ${b.dropLocation}';

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppConstants.radiusField),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppConstants.radiusField),
        onTap: () => context.push('/bookings/${b.id}'),
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppConstants.radiusField),
            border: Border.all(color: theme.dividerColor, width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      b.bookingReference,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  StatusChip(status: b.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(b.customerName, style: theme.textTheme.titleSmall),
              const SizedBox(height: 2),
              Text(
                route,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      formatDateTime(b.pickupAt),
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                  Text(formatInr(b.estimatedTotal), style: theme.textTheme.titleSmall),
                ],
              ),
              if (BookingStatus.canConfirm(b.status) || BookingStatus.canAssign(b.status)) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    if (BookingStatus.canConfirm(b.status)) ...[
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => _confirm(context, ref, b),
                          child: const Text('CONFIRM'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: YaDangerButton(
                          onPressed: () {
                            hideKeyboard();
                            context.push('/bookings/${b.id}/reject');
                          },
                          label: 'REJECT',
                          color: const Color(0xFFE53935),
                        ),
                      ),
                    ] else if (BookingStatus.canAssign(b.status))
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            hideKeyboard();
                            context.push('/bookings/${b.id}/assign');
                          },
                          child: const Text('ASSIGN DRIVER'),
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirm(BuildContext context, WidgetRef ref, Booking b) async {
    hideKeyboard();
    try {
      final res = await ref.read(bookingRepositoryProvider).confirm(b.id);
      ref.invalidate(bookingsProvider);
      ref.invalidate(dashboardStatsProvider);
      if (res.emailSent == true) {
        showSuccessToast('Confirmed · invoice emailed to ${res.emailTo}');
      } else {
        showSuccessToast('Booking ${b.bookingReference} confirmed');
      }
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }
}
