import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../app/constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/app_error_view.dart';
import '../../../core/widgets/app_loading_view.dart';
import '../../../core/widgets/app_state_pages.dart';
import '../../../core/widgets/app_surface.dart';

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  List<Map<String, dynamic>> _notifications = [];
  bool _loading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final client = ref.read(apiClientProvider);
      final res = await client.get('/driver/notifications');
      if (mounted) {
        setState(() {
          _notifications = res is List
              ? res
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList()
              : [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: AppLoadingView(message: 'Loading notifications...'),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Notifications')),
        body: AppErrorView(
          message: _errorMessage!,
          onRetry: _fetchNotifications,
        ),
      );
    }

    final groups = _groupByDay(_notifications);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: const Text('Notifications'),
      ),
      body: SafeArea(
        top: false,
        child: _notifications.isEmpty
            ? const AppEmptyView(
                icon: Icons.notifications_off_outlined,
                title: 'No notifications',
                message:
                    'System notifications, booking assignments, and admin alerts will appear here.',
              )
            : RefreshIndicator(
                color: AppConstants.gold,
                onRefresh: _fetchNotifications,
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                  itemCount: groups.length,
                  itemBuilder: (context, i) {
                    final group = groups[i];
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: EdgeInsets.only(
                            top: i == 0 ? 4 : 18,
                            bottom: 8,
                            left: 4,
                          ),
                          child: Text(
                            group.label,
                            style: Theme.of(context).textTheme.labelMedium,
                          ),
                        ),
                        ...group.items.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _DriverNotificationCard(item: item),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
      ),
    );
  }
}

class _DriverNotificationCard extends StatelessWidget {
  final Map<String, dynamic> item;

  const _DriverNotificationCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = item['title']?.toString() ?? 'Notification';
    final body = item['body']?.toString() ?? '';
    final createdAt = DateTime.tryParse(item['created_at']?.toString() ?? '');
    final style = _styleFor('$title $body');

    return AppSurfaceCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: style.color.withValues(alpha: 0.16),
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
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium,
                      ),
                    ),
                    if (createdAt != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        _relativeTime(createdAt),
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
                if (body.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    body,
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppConstants.textSecondaryLight,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DayGroup {
  final String label;
  final List<Map<String, dynamic>> items;
  const _DayGroup(this.label, this.items);
}

List<_DayGroup> _groupByDay(List<Map<String, dynamic>> rows) {
  final map = <String, List<Map<String, dynamic>>>{};
  final order = <String>[];
  for (final item in rows) {
    final createdAt = DateTime.tryParse(item['created_at']?.toString() ?? '');
    final label = createdAt == null ? 'EARLIER' : _dayLabel(createdAt);
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

({IconData icon, Color color}) _styleFor(String haystack) {
  final hay = haystack.toLowerCase();
  if (hay.contains('cancel')) {
    return (icon: Icons.cancel_outlined, color: AppConstants.errorColor);
  }
  if (hay.contains('complete') || hay.contains('ended') || hay.contains('drop')) {
    return (icon: Icons.check_circle_outline_rounded, color: AppConstants.successColor);
  }
  if (hay.contains('assign') || hay.contains('new trip') || hay.contains('booking')) {
    return (icon: Icons.local_taxi_outlined, color: AppConstants.navy);
  }
  if (hay.contains('payment') || hay.contains('payout') || hay.contains('wallet')) {
    return (icon: Icons.payments_outlined, color: AppConstants.gold);
  }
  return (icon: Icons.notifications_active_rounded, color: AppConstants.navy);
}
