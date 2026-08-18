import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/fleet/data/fleet_repository.dart';
import 'package:yaazh_admin/features/fleet/domain/vehicle.dart';

final fleetSearchProvider = StateProvider<String>((ref) => '');

class FleetPage extends ConsumerWidget {
  const FleetPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Vehicles')),
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            hideKeyboard();
            context.push('/fleet/new');
          },
          child: const Icon(Icons.add_rounded),
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                textInputAction: TextInputAction.search,
                onChanged: (value) =>
                    ref.read(fleetSearchProvider.notifier).state = value,
                decoration: const InputDecoration(
                  hintText: 'Search name, registration, category…',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
            ),
            const Expanded(child: _FleetList()),
          ],
        ),
      ),
    );
  }
}

class _FleetList extends ConsumerWidget {
  const _FleetList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(fleetListProvider);
    final query = ref.watch(fleetSearchProvider).trim().toLowerCase();

    return async.when(
      loading: () => const Center(child: YaLoader()),
      error: (err, _) => EmptyState(
        title: 'Could not load fleet',
        subtitle: err.toString(),
        icon: Icons.directions_car_outlined,
      ),
      data: (rows) {
        final filtered = rows.where((v) {
          if (query.isEmpty) return true;
          final hay = [
            v.vehicleName,
            v.registrationNo,
            v.modelName,
            v.categoryName,
            v.color,
            v.fuelType,
          ].join(' ').toLowerCase();
          return hay.contains(query);
        }).toList();

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(fleetListProvider);
            await ref.read(fleetListProvider.future);
          },
          child: filtered.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      title: 'No vehicles',
                      subtitle: 'Add a vehicle to manage the Yaazh fleet.',
                      icon: Icons.directions_car_outlined,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 88),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    return _VehicleCard(vehicle: filtered[index]);
                  },
                ),
        );
      },
    );
  }
}

class _VehicleCard extends StatelessWidget {
  final FleetVehicle vehicle;

  const _VehicleCard({required this.vehicle});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final v = vehicle;
    final subtitle = [
      if ((v.registrationNo ?? '').isNotEmpty) v.registrationNo,
      if ((v.categoryName ?? '').isNotEmpty) v.categoryName,
    ].join(' · ');

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppConstants.radiusField),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppConstants.radiusField),
        onTap: () => context.push('/fleet/${v.id}/edit'),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppConstants.radiusField),
            border: Border.all(color: theme.dividerColor, width: 1),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(v.vehicleName, style: theme.textTheme.titleSmall),
                    if (subtitle.isNotEmpty)
                      Text(subtitle, style: theme.textTheme.bodySmall),
                    if ((v.modelName ?? '').isNotEmpty)
                      Text(
                        '${v.modelName} · ${v.fuelType}',
                        style: theme.textTheme.bodySmall,
                      ),
                  ],
                ),
              ),
              StatusChip(
                status: v.isActive ? 'active' : 'inactive',
                label: v.isActive ? 'Active' : 'Inactive',
                tone: v.isActive ? AppColors.success : AppColors.salmon,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
