import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/notifications/data/notification_repository.dart';
import 'package:yaazh_admin/features/notifications/domain/notification_log.dart';

final notificationSearchProvider = StateProvider<String>((ref) => '');

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 3,
      child: KeyboardDismiss(
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Push alerts'),
            bottom: const TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(text: 'All'),
                Tab(text: 'Customers'),
                Tab(text: 'Drivers'),
              ],
            ),
          ),
          floatingActionButton: FloatingActionButton(
            onPressed: () {
              hideKeyboard();
              context.push('/notifications/new');
            },
            child: const Icon(Icons.campaign_rounded),
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  textInputAction: TextInputAction.search,
                  onChanged: (value) =>
                      ref.read(notificationSearchProvider.notifier).state = value,
                  decoration: const InputDecoration(
                    hintText: 'Search title, recipient…',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
              ),
              const Expanded(
                child: TabBarView(
                  children: [
                    _NotificationList(tab: _NotifyTab.all),
                    _NotificationList(tab: _NotifyTab.customers),
                    _NotificationList(tab: _NotifyTab.drivers),
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

enum _NotifyTab { all, customers, drivers }

class _NotificationList extends ConsumerWidget {
  final _NotifyTab tab;

  const _NotificationList({required this.tab});

  Color _statusColor(String? status) {
    return switch (status) {
      'sent' || 'delivered' => AppColors.success,
      'failed' => AppColors.salmon,
      'queued' => AppColors.warning,
      _ => AppColors.textSecondaryLight,
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    final query = ref.watch(notificationSearchProvider).trim().toLowerCase();

    return async.when(
      loading: () => const Center(child: YaLoader()),
      error: (err, _) => EmptyState(
        title: 'Could not load alerts',
        subtitle: err.toString(),
        icon: Icons.cloud_off_rounded,
      ),
      data: (rows) {
        final filtered = rows.where((n) {
          final inTab = switch (tab) {
            _NotifyTab.all => true,
            _NotifyTab.customers => n.recipientType == 'customer',
            _NotifyTab.drivers => n.recipientType == 'driver',
          };
          if (!inTab) return false;
          if (query.isEmpty) return true;
          final hay = [
            n.title,
            n.body,
            n.recipientName,
            n.recipientPhone,
            n.recipientType,
            n.deliveryStatus,
          ].join(' ').toLowerCase();
          return hay.contains(query);
        }).toList();

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(notificationsProvider);
            await ref.read(notificationsProvider.future);
          },
          child: filtered.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      title: 'No notifications',
                      subtitle: 'Compose a push to customers or drivers.',
                      icon: Icons.notifications_none_rounded,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 88),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    return _NotificationCard(
                      item: filtered[index],
                      statusColor: _statusColor(filtered[index].deliveryStatus),
                    );
                  },
                ),
        );
      },
    );
  }
}

class _NotificationCard extends ConsumerWidget {
  final NotificationLog item;
  final Color statusColor;

  const _NotificationCard({required this.item, required this.statusColor});

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Delete this notification?',
      message:
          '“${item.title?.isNotEmpty == true ? item.title : 'Notification'}” for ${item.recipientName ?? item.recipientType} will be removed from the log.',
      actionLabel: 'Delete',
      icon: Icons.delete_outline_rounded,
    );
    if (!ok) return;
    try {
      await ref.read(notificationRepositoryProvider).delete(item.id);
      invalidateNotificationCaches(ref);
      showSuccessToast('Notification deleted');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final n = item;

    return Material(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    n.title?.isNotEmpty == true ? n.title! : 'Notification',
                    style: theme.textTheme.titleSmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                StatusChip(
                  status: n.deliveryStatus ?? 'unknown',
                  label: capitalizeWords(n.deliveryStatus ?? '—'),
                  tone: statusColor,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              n.body,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        [
                          n.recipientName ?? capitalizeWords(n.recipientType),
                          if (n.recipientPhone?.isNotEmpty == true) n.recipientPhone,
                        ].join(' · '),
                        style: theme.textTheme.bodySmall,
                      ),
                      const SizedBox(height: 4),
                      Text(formatDateTime(n.createdAt), style: theme.textTheme.bodySmall),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Delete',
                  onPressed: () => _delete(context, ref),
                  color: const Color(0xFFE53935),
                  icon: const Icon(Icons.delete_outline_rounded),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
