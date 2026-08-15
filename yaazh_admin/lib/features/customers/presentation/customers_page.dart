import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/customers/data/customer_repository.dart';
import 'package:yaazh_admin/features/customers/domain/customer.dart';

final customerSearchProvider = StateProvider<String>((ref) => '');

class CustomersPage extends ConsumerWidget {
  const CustomersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 3,
      child: KeyboardDismiss(
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Customers'),
            bottom: const TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(text: 'All'),
                Tab(text: 'Active'),
                Tab(text: 'Blocked'),
              ],
            ),
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  textInputAction: TextInputAction.search,
                  onChanged: (value) =>
                      ref.read(customerSearchProvider.notifier).state = value,
                  decoration: const InputDecoration(
                    hintText: 'Search name, phone, email…',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
              ),
              const Expanded(
                child: TabBarView(
                  children: [
                    _CustomerList(tab: _CustomerTab.all),
                    _CustomerList(tab: _CustomerTab.active),
                    _CustomerList(tab: _CustomerTab.blocked),
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

enum _CustomerTab { all, active, blocked }

class _CustomerList extends ConsumerWidget {
  final _CustomerTab tab;

  const _CustomerList({required this.tab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customersProvider);
    final query = ref.watch(customerSearchProvider).trim().toLowerCase();

    return async.when(
      loading: () => const Center(child: YaLoader()),
      error: (err, _) => EmptyState(
        title: 'Could not load customers',
        subtitle: err.toString(),
        icon: Icons.cloud_off_rounded,
      ),
      data: (rows) {
        final filtered = rows.where((c) {
          final inTab = switch (tab) {
            _CustomerTab.all => true,
            _CustomerTab.active => c.appStatus == 'active',
            _CustomerTab.blocked => c.appStatus == 'blocked',
          };
          if (!inTab) return false;
          if (query.isEmpty) return true;
          final hay = [
            c.name,
            c.phone,
            c.email,
            c.city,
            c.appStatus,
          ].join(' ').toLowerCase();
          return hay.contains(query);
        }).toList();

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(customersProvider);
            await ref.read(customersProvider.future);
          },
          child: filtered.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      title: 'No customers',
                      subtitle:
                          'People who book via the website or app will appear here.',
                      icon: Icons.groups_outlined,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    return _CustomerCard(customer: filtered[index]);
                  },
                ),
        );
      },
    );
  }
}

class _CustomerCard extends StatelessWidget {
  final Customer customer;

  const _CustomerCard({required this.customer});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = customer;

    return Material(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        onTap: () => context.push('/customers/${c.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: theme.colorScheme.primary.withValues(
                  alpha: 0.14,
                ),
                child: Text(
                  c.name.isNotEmpty ? c.name[0].toUpperCase() : 'C',
                  style: TextStyle(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      c.name,
                      style: theme.textTheme.titleSmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(c.phone, style: theme.textTheme.bodySmall),
                    if (c.city != null && c.city!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        c.city!,
                        style: theme.textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    // const SizedBox(height: 8),
                    // StatusChip(
                    //   status: c.appStatus,
                    //   label: c.appStatusLabel,
                    //   tone: CustomerMeta.color(c.appStatus),
                    // ),
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
