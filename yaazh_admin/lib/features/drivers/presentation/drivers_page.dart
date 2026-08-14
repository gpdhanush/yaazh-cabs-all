import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/driver_avatar.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/features/drivers/data/driver_repository.dart';
import 'package:yaazh_admin/features/drivers/domain/driver.dart';

final driverSearchProvider = StateProvider<String>((ref) => '');

class DriversPage extends ConsumerWidget {
  const DriversPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 4,
      child: KeyboardDismiss(
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Drivers'),
            bottom: const TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(text: 'All'),
                Tab(text: 'Available'),
                Tab(text: 'On ride'),
                Tab(text: 'Leave'),
              ],
            ),
          ),
          floatingActionButton: FloatingActionButton(
            onPressed: () {
              hideKeyboard();
              context.push('/drivers/new');
            },
            child: const Icon(Icons.person_add_alt_1_rounded),
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  textInputAction: TextInputAction.search,
                  onChanged: (value) =>
                      ref.read(driverSearchProvider.notifier).state = value,
                  decoration: const InputDecoration(
                    hintText: 'Search name, phone, license…',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
              ),
              const Expanded(
                child: TabBarView(
                  children: [
                    _DriverList(tab: _DriverTab.all),
                    _DriverList(tab: _DriverTab.available),
                    _DriverList(tab: _DriverTab.onTrip),
                    _DriverList(tab: _DriverTab.leave),
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

enum _DriverTab { all, available, onTrip, leave }

class _DriverList extends ConsumerWidget {
  final _DriverTab tab;

  const _DriverList({required this.tab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(driversListProvider);
    final query = ref.watch(driverSearchProvider).trim().toLowerCase();

    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => EmptyState(
        title: 'Could not load drivers',
        subtitle: err.toString(),
        icon: Icons.cloud_off_rounded,
      ),
      data: (rows) {
        final filtered = rows.where((d) {
          final inTab = switch (tab) {
            _DriverTab.all => true,
            _DriverTab.available => d.availabilityStatus == 'available',
            _DriverTab.onTrip => d.availabilityStatus == 'on_trip',
            _DriverTab.leave =>
              d.availabilityStatus == 'on_leave' || d.availabilityStatus == 'suspended',
          };
          if (!inTab) return false;
          if (query.isEmpty) return true;
          final hay = [
            d.name,
            d.phone,
            d.email,
            d.licenseNo,
            d.verificationStatus,
            d.availabilityStatus,
          ].join(' ').toLowerCase();
          return hay.contains(query);
        }).toList();

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(driversListProvider);
            await ref.read(driversListProvider.future);
          },
          child: filtered.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      title: 'No drivers',
                      subtitle: 'Add a driver to assign bookings from the fleet.',
                      icon: Icons.badge_outlined,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 88),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    return _DriverCard(driver: filtered[index]);
                  },
                ),
        );
      },
    );
  }
}

class _DriverCard extends StatelessWidget {
  final Driver driver;

  const _DriverCard({required this.driver});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final d = driver;

    return Material(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        onTap: () => context.push('/drivers/${d.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              DriverAvatar(
                id: d.id,
                name: d.name,
                photoUrl: d.photoUrl,
                radius: 26,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            d.name,
                            style: theme.textTheme.titleSmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (!d.isActive)
                          Text(
                            'Inactive',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.salmon,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(d.phone, style: theme.textTheme.bodySmall),
                    if (d.licenseNo != null && d.licenseNo!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Lic. ${d.licenseNo}',
                        style: theme.textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        StatusChip(
                          status: d.availabilityStatus,
                          label: DriverMeta.availabilityLabel(d.availabilityStatus),
                          tone: DriverMeta.availabilityColor(d.availabilityStatus),
                        ),
                        StatusChip(
                          status: d.verificationStatus,
                          label: DriverMeta.verificationLabel(d.verificationStatus),
                          tone: DriverMeta.verificationColor(d.verificationStatus),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}
