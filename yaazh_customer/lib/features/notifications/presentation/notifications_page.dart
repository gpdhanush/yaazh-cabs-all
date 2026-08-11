import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/widgets/app_error_view.dart';
import 'package:yaazh_customer/core/widgets/app_loading_view.dart';
import 'package:yaazh_customer/core/widgets/app_state_pages.dart';
import 'package:yaazh_customer/features/notifications/data/notification_repository.dart';

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(title: const Text('Notifications')),
      body: items.when(
        loading: () => const AppLoadingView(),
        error: (e, _) => AppErrorView(
          message: e.toString(),
          onRetry: () => ref.invalidate(notificationsProvider),
        ),
        data: (rows) {
          if (rows.isEmpty) {
            return const AppEmptyView(
              icon: Icons.notifications_none_rounded,
              title: 'All caught up',
              message: 'Trip alerts and booking updates will appear here.',
            );
          }

          final groups = _groupByDay(rows);
          return RefreshIndicator(
            color: AppConstants.accentColor,
            onRefresh: () async => ref.invalidate(notificationsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              itemCount: groups.length,
              itemBuilder: (context, i) {
                final group = groups[i];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: EdgeInsets.only(top: i == 0 ? 4 : 18, bottom: 8, left: 4),
                      child: Text(
                        group.label,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                          color: AppConstants.textSecondaryLight,
                        ),
                      ),
                    ),
                    ...group.items.map((n) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _NotificationCard(notification: n),
                        )),
                  ],
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final AppNotification notification;

  const _NotificationCard({required this.notification});

  @override
  Widget build(BuildContext context) {
    final style = _styleFor(notification);
    final time = notification.createdAt == null
        ? ''
        : _relativeTime(notification.createdAt!);

    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppConstants.borderLight),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: style.color.withValues(alpha: 0.14),
              child: Icon(style.icon, color: style.color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            height: 1.3,
                          ),
                        ),
                      ),
                      if (time.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Text(
                          time,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppConstants.textSecondaryLight,
                          ),
                        ),
                      ],
                    ],
                  ),
                  if ((notification.body ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      notification.body!,
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        color: AppConstants.textSecondaryLight,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DayGroup {
  final String label;
  final List<AppNotification> items;
  const _DayGroup(this.label, this.items);
}

List<_DayGroup> _groupByDay(List<AppNotification> rows) {
  final map = <String, List<AppNotification>>{};
  final order = <String>[];
  for (final item in rows) {
    final label = item.createdAt == null ? 'Earlier' : _dayLabel(item.createdAt!);
    if (!map.containsKey(label)) {
      map[label] = [];
      order.add(label);
    }
    map[label]!.add(item);
  }
  return order.map((label) => _DayGroup(label, map[label]!)).toList();
}

String _dayLabel(DateTime dt) {
  final local = dt.toLocal();
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final date = DateTime(local.year, local.month, local.day);
  final diff = today.difference(date).inDays;
  if (diff == 0) return 'TODAY';
  if (diff == 1) return 'YESTERDAY';
  return DateFormat('dd MMM yyyy').format(local).toUpperCase();
}

String _relativeTime(DateTime dt) {
  final local = dt.toLocal();
  final diff = DateTime.now().difference(local);
  if (diff.inMinutes < 1) return 'Now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m';
  if (diff.inHours < 24) return '${diff.inHours}h';
  return DateFormat('hh:mm a').format(local);
}

({IconData icon, Color color}) _styleFor(AppNotification n) {
  final hay = '${n.channel ?? ''} ${n.title} ${n.body ?? ''}'.toLowerCase();
  if (hay.contains('cancel')) {
    return (icon: Icons.cancel_outlined, color: AppConstants.errorColor);
  }
  if (hay.contains('complete') || hay.contains('ended') || hay.contains('drop')) {
    return (icon: Icons.check_circle_outline_rounded, color: AppConstants.successColor);
  }
  if (hay.contains('assign') || hay.contains('driver') || hay.contains('accepted')) {
    return (icon: Icons.local_taxi_outlined, color: AppConstants.infoColor);
  }
  if (hay.contains('payment') || hay.contains('paid') || hay.contains('wallet')) {
    return (icon: Icons.payments_outlined, color: AppConstants.accentHover);
  }
  if (hay.contains('book') || hay.contains('confirm')) {
    return (icon: Icons.event_available_outlined, color: AppConstants.accentColor);
  }
  return (icon: Icons.notifications_outlined, color: AppConstants.primaryColor);
}
