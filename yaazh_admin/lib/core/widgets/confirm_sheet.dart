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
