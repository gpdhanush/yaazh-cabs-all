import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/media_url.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/fleet/data/fleet_repository.dart';
import 'package:yaazh_admin/features/fleet/domain/vehicle.dart';

final categorySearchProvider = StateProvider<String>((ref) => '');

class VehicleCategoriesPage extends ConsumerWidget {
  const VehicleCategoriesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Vehicle categories')),
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            hideKeyboard();
            context.push('/vehicle-categories/new');
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
                    ref.read(categorySearchProvider.notifier).state = value,
                decoration: const InputDecoration(
                  hintText: 'Search name, slug, seats…',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
            ),
            const Expanded(child: _CategoryList()),
          ],
        ),
      ),
    );
  }
}

class _CategoryList extends ConsumerWidget {
  const _CategoryList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vehicleCategoriesProvider);
    final query = ref.watch(categorySearchProvider).trim().toLowerCase();

    return async.when(
      loading: () => const Center(child: YaLoader()),
      error: (err, _) => EmptyState(
        title: 'Could not load categories',
        subtitle: err.toString(),
        icon: Icons.cloud_off_rounded,
      ),
      data: (rows) {
        final filtered = rows.where((c) {
          if (query.isEmpty) return true;
          final hay = [
            c.name,
            c.slug,
            '${c.seatingCapacity}',
            '${c.displayOrder}',
          ].join(' ').toLowerCase();
          return hay.contains(query);
        }).toList()
          ..sort((a, b) {
            final order = a.displayOrder.compareTo(b.displayOrder);
            if (order != 0) return order;
            return a.name.compareTo(b.name);
          });

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(vehicleCategoriesProvider);
            await ref.read(vehicleCategoriesProvider.future);
          },
          child: filtered.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      title: 'No categories',
                      subtitle:
                          'Add fleet types and default per-km rates for the website.',
                      icon: Icons.category_outlined,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 88),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    return _CategoryCard(category: filtered[index]);
                  },
                ),
        );
      },
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final VehicleCategory category;

  const _CategoryCard({required this.category});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final url = resolveMediaUrl(category.imageUrl);
    final c = category;

    return Material(
      color: theme.colorScheme.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        onTap: () => context.push('/vehicle-categories/${c.id}/edit'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: 88,
                  height: 55,
                  child: url == null
                      ? ColoredBox(
                          color: theme.colorScheme.primary.withValues(alpha: 0.08),
                          child: const Icon(Icons.directions_car_outlined),
                        )
                      : CachedNetworkImage(
                          imageUrl: url,
                          fit: BoxFit.cover,
                          placeholder: (_, _) =>
                              const Center(child: YaLoader(size: 18)),
                          errorWidget: (_, _, _) =>
                              const Icon(Icons.broken_image_outlined),
                        ),
                ),
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
                            c.name,
                            style: theme.textTheme.titleSmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        StatusChip(
                          status: c.isActive ? 'active' : 'inactive',
                          label: c.isActive ? 'Active' : 'Inactive',
                          tone: c.isActive ? AppColors.success : AppColors.salmon,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${c.seatingCapacity} seats · Order ${c.displayOrder}',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'One-way ${formatInr(c.oneWayRatePerKm)}/km · Round ${formatInr(c.roundTripRatePerKm)}/km',
                      style: theme.textTheme.bodySmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
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
