import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';

const _sheetRadius = BorderRadius.vertical(top: Radius.circular(28));

Future<T?> showYaSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool isScrollControlled = true,
}) {
  final theme = Theme.of(context);
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: isScrollControlled,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: theme.colorScheme.surface,
    barrierColor: Colors.black.withValues(alpha: 0.45),
    shape: const RoundedRectangleBorder(borderRadius: _sheetRadius),
    clipBehavior: Clip.antiAlias,
    builder: (ctx) {
      final bottom = MediaQuery.viewInsetsOf(ctx).bottom;
      return Material(
        color: theme.colorScheme.surface,
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + bottom),
          child: builder(ctx),
        ),
      );
    },
  );
}

class YaSheetAction<T> {
  final T value;
  final String label;
  final IconData icon;
  final bool destructive;

  const YaSheetAction({
    required this.value,
    required this.label,
    required this.icon,
    this.destructive = false,
  });
}

Future<T?> showYaActionSheet<T>({
  required BuildContext context,
  String? title,
  required List<YaSheetAction<T>> actions,
}) {
  return showYaSheet<T>(
    context: context,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Text(title, style: theme.textTheme.titleLarge),
            const SizedBox(height: 8),
          ],
          for (final action in actions) _ActionRow(action: action),
          const SizedBox(height: 4),
        ],
      );
    },
  );
}

class _ActionRow<T> extends StatelessWidget {
  final YaSheetAction<T> action;

  const _ActionRow({required this.action});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final color = action.destructive ? AppColors.salmon : theme.colorScheme.primary;
    final destructiveFill = action.destructive && !isDark;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: destructiveFill ? color : color.withValues(alpha: isDark && action.destructive ? 0 : 0.08),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: action.destructive
              ? BorderSide(color: color, width: 1.4)
              : BorderSide.none,
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => Navigator.of(context).pop(action.value),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: destructiveFill
                        ? Colors.white.withValues(alpha: 0.18)
                        : theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: action.destructive
                        ? Border.all(color: isDark ? color : Colors.white.withValues(alpha: 0.35))
                        : null,
                  ),
                  child: Icon(
                    action.icon,
                    color: destructiveFill ? Colors.white : color,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    action.label,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: action.destructive
                          ? (destructiveFill ? Colors.white : color)
                          : null,
                    ),
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  color: action.destructive
                      ? (destructiveFill ? Colors.white70 : color)
                      : theme.textTheme.bodySmall?.color,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
