import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/enquiries/data/enquiry_repository.dart';
import 'package:yaazh_admin/features/enquiries/domain/enquiry.dart';
import 'package:yaazh_admin/features/shell/admin_shell.dart';

final enquirySearchProvider = StateProvider<String>((ref) => '');

class EnquiriesPage extends ConsumerWidget {
  const EnquiriesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          leading: const YaDrawerButton(),
          title: const Text('Enquiries'),
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                textInputAction: TextInputAction.search,
                onChanged: (value) =>
                    ref.read(enquirySearchProvider.notifier).state = value,
                decoration: const InputDecoration(
                  hintText: 'Search name, phone, subject…',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
            ),
            const Expanded(child: _EnquiryList()),
          ],
        ),
      ),
    );
  }
}

class _EnquiryList extends ConsumerWidget {
  const _EnquiryList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(enquiriesProvider);
    final query = ref.watch(enquirySearchProvider).trim().toLowerCase();

    return async.when(
      loading: () => const Center(child: YaLoader()),
      error: (err, _) => EmptyState(
        title: 'Could not load enquiries',
        subtitle: err.toString(),
        icon: Icons.cloud_off_rounded,
      ),
      data: (rows) {
        final filtered = rows.where((e) {
          if (query.isEmpty) return true;
          final hay = [
            e.name,
            e.phone,
            e.email,
            e.subject,
            e.message,
            e.status,
          ].join(' ').toLowerCase();
          return hay.contains(query);
        }).toList();

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(enquiriesProvider);
            await ref.read(enquiriesProvider.future);
          },
          child: filtered.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      title: 'No enquiries',
                      subtitle: 'Website contact messages will show up here.',
                      icon: Icons.mail_outline_rounded,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    return _EnquiryCard(enquiry: filtered[index]);
                  },
                ),
        );
      },
    );
  }
}

class _EnquiryCard extends StatelessWidget {
  final Enquiry enquiry;

  const _EnquiryCard({required this.enquiry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final e = enquiry;
    final subject =
        e.subject?.isNotEmpty == true ? e.subject! : 'General enquiry';
    final contact = [
      if (e.phone?.isNotEmpty == true) e.phone,
      if (e.email?.isNotEmpty == true) e.email,
    ].join(' · ');

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(AppConstants.radiusField),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppConstants.radiusField),
        onTap: () => context.push('/enquiries/${e.id}'),
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
                      titleCase(e.name),
                      style: theme.textTheme.titleSmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  StatusChip(
                    status: e.status,
                    label: EnquiryMeta.label(e.status),
                    tone: EnquiryMeta.color(e.status),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                subject,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium,
              ),
              if (contact.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  contact,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 6),
              Text(
                formatDateTime(e.createdAt),
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
