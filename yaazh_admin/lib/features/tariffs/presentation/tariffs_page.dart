import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/tariffs/data/tariff_repository.dart';
import 'package:yaazh_admin/features/tariffs/domain/tariff.dart';

final tariffSearchProvider = StateProvider<String>((ref) => '');

class TariffsPage extends ConsumerWidget {
  const TariffsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Tariffs')),
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            hideKeyboard();
            context.push('/tariffs/new');
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
                    ref.read(tariffSearchProvider.notifier).state = value,
                decoration: const InputDecoration(
                  hintText: 'Search category, trip, route…',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
            ),
            const Expanded(child: _TariffList()),
          ],
        ),
      ),
    );
  }
}

class _TariffList extends ConsumerWidget {
  const _TariffList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(tariffsProvider);
    final query = ref.watch(tariffSearchProvider).trim().toLowerCase();

    return async.when(
      loading: () => const Center(child: YaLoader()),
      error: (err, _) => EmptyState(
        title: 'Could not load tariffs',
        subtitle: err.toString(),
        icon: Icons.cloud_off_rounded,
      ),
      data: (rows) {
        final filtered = rows.where((t) {
          if (query.isEmpty) return true;
          final hay = [
            t.categoryName,
            t.tripTypeLabel,
            t.routeLabel,
            t.tripType,
          ].join(' ').toLowerCase();
          return hay.contains(query);
        }).toList();

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(tariffsProvider);
            await ref.read(tariffsProvider.future);
          },
          child: filtered.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      title: 'No tariffs',
                      subtitle:
                          'Add rates used to estimate fare when a customer books.',
                      icon: Icons.payments_outlined,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 88),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    return _TariffCard(tariff: filtered[index]);
                  },
                ),
        );
      },
    );
  }
}

class _TariffCard extends StatelessWidget {
  final TariffPlan tariff;

  const _TariffCard({required this.tariff});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = tariff;

    return Material(
      color: theme.colorScheme.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        onTap: () => context.push('/tariffs/${t.id}/edit'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            t.categoryName?.isNotEmpty == true
                                ? t.categoryName!
                                : 'Category',
                            style: theme.textTheme.titleSmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        StatusChip(
                          status: t.isActive ? 'active' : 'inactive',
                          label: t.isActive ? 'Active' : 'Inactive',
                          tone: t.isActive ? AppColors.success : AppColors.salmon,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      t.tripTypeLabel,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(t.routeLabel, style: theme.textTheme.bodySmall),
                    const SizedBox(height: 6),
                    Text(
                      '${formatInr(t.ratePerKm)}/km · Base ${formatInr(t.baseFare)} · Batta ${formatInr(t.driverBatta)}',
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
