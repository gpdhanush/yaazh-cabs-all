import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/widgets/ya_bottom_sheet.dart';
import 'package:yaazh_admin/core/widgets/ya_danger_button.dart';

Future<bool> showConfirmSheet(
  BuildContext context, {
  required String title,
  required String message,
  required String actionLabel,
  String cancelLabel = 'Cancel',
  IconData icon = Icons.warning_amber_rounded,
  Color? dangerColor,
  bool destructive = true,
}) async {
  final result = await showYaSheet<bool>(
    context: context,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      final color = destructive
          ? (dangerColor ?? AppColors.salmon)
          : (dangerColor ?? theme.colorScheme.primary);
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 30),
          ),
          const SizedBox(height: 16),
          Text(title, textAlign: TextAlign.center, style: theme.textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.textTheme.bodySmall?.color,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: destructive
                ? YaDangerButton(
                    onPressed: () {
                      FocusManager.instance.primaryFocus?.unfocus();
                      Navigator.of(ctx).pop(true);
                    },
                    label: actionLabel,
                    color: color,
                  )
                : ElevatedButton(
                    onPressed: () {
                      FocusManager.instance.primaryFocus?.unfocus();
                      Navigator.of(ctx).pop(true);
                    },
                    child: Text(actionLabel),
                  ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(cancelLabel),
            ),
          ),
        ],
      );
    },
  );
  return result == true;
}

Future<void> showNoticeSheet(
  BuildContext context, {
  required String title,
  required String message,
  String actionLabel = 'Got it',
  IconData icon = Icons.info_rounded,
  Color? color,
  String? highlightLabel,
  String? highlightValue,
}) {
  return showYaSheet<void>(
    context: context,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      final tone = color ?? AppColors.warning;
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: tone.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: tone, size: 30),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall,
          ),
          if (highlightValue != null && highlightValue.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: tone.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: tone.withValues(alpha: 0.28)),
              ),
              child: Column(
                children: [
                  if (highlightLabel != null)
                    Text(
                      highlightLabel,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: tone,
                      ),
                    ),
                  const SizedBox(height: 2),
                  Text(
                    highlightValue,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: tone,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.textTheme.bodySmall?.color,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text(actionLabel),
            ),
          ),
        ],
      );
    },
  );
}
