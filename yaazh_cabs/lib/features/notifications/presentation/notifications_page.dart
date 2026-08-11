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
  List<dynamic> _notifications = [];
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
          _notifications = res is List ? res : [];
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
    final theme = Theme.of(context);

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

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchNotifications,
          ),
        ],
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
          : ListView.separated(
              padding: const EdgeInsets.all(AppConstants.paddingM),
              itemCount: _notifications.length,
              separatorBuilder: (ctx, i) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) {
                final item = _notifications[i];
                final title = item['title'] ?? 'Notification';
                final body = item['body'] ?? '';
                final createdAtStr = item['created_at'] != null
                    ? DateFormat('dd MMM, hh:mm a')
                        .format(DateTime.parse(item['created_at'].toString()))
                    : '';

                return AppSurfaceCard(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        backgroundColor:
                            AppConstants.gold.withValues(alpha: 0.18),
                        child: const Icon(
                          Icons.notifications_active_rounded,
                          color: AppConstants.navy,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title.toString(),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.titleMedium,
                            ),
                            if (body.toString().isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                body.toString(),
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: AppConstants.textSecondaryLight,
                                ),
                              ),
                            ],
                            if (createdAtStr.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                createdAtStr,
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
      ),
    );
  }
}
