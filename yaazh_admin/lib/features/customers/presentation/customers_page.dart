import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
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
    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Customers')),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                textInputAction: TextInputAction.search,
                onChanged: (value) =>
                    ref.read(customerSearchProvider.notifier).state = value,
                decoration: const InputDecoration(
                  hintText: 'Search name, phone, city…',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
            ),
            const Expanded(child: _CustomerList()),
          ],
        ),
      ),
    );
  }
}

class _CustomerList extends ConsumerWidget {
  const _CustomerList();

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

  String get _initials {
    final parts =
        customer.name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.length >= 2) {
      return (parts.first[0] + parts.elementAt(1)[0]).toUpperCase();
    }
    if (customer.name.trim().isNotEmpty) {
      return customer.name.trim()[0].toUpperCase();
    }
    return 'C';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = customer;
    final blocked = c.appStatus == 'blocked';
    final bookings = c.bookingCount;
    final displayName =
        c.name.isNotEmpty ? capitalizeWords(c.name) : 'Customer';

    return Material(
      color: theme.colorScheme.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        onTap: () => context.push('/customers/${c.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: theme.colorScheme.primary.withValues(
                  alpha: 0.14,
                ),
                child: Text(
                  _initials,
                  style: TextStyle(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      style: theme.textTheme.titleSmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(c.phone, style: theme.textTheme.bodySmall),
                    if ((c.city != null && c.city!.isNotEmpty) ||
                        bookings != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        [
                          if (c.city != null && c.city!.isNotEmpty) c.city!,
                          if (bookings != null)
                            '$bookings booking${bookings == 1 ? '' : 's'}',
                        ].join(' · '),
                        style: theme.textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (blocked) ...[
                      const SizedBox(height: 8),
                      StatusChip(
                        status: c.appStatus,
                        label: c.appStatusLabel,
                        tone: CustomerMeta.color(c.appStatus),
                      ),
                    ],
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
