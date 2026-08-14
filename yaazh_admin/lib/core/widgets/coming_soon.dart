import 'package:flutter/material.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';

void showComingSoon(String feature) {
  showAppToast('$feature is coming in the next update.');
}

class EmptyState extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const EmptyState({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(icon, size: 36, color: theme.colorScheme.primary),
            ),
            const SizedBox(height: 20),
            Text(title, style: theme.textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.textTheme.bodySmall?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PlaceholderListPage extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool showAppBar;

  const PlaceholderListPage({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.showAppBar = true,
  });

  @override
  Widget build(BuildContext context) {
    final body = EmptyState(title: title, subtitle: subtitle, icon: icon);
    if (!showAppBar) return body;
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: body,
    );
  }
}
