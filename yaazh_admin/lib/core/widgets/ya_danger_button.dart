import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';

class YaDangerButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final String label;
  final IconData? icon;
  final Color color;
  final bool expand;

  const YaDangerButton({
    super.key,
    required this.onPressed,
    required this.label,
    this.icon,
    this.color = AppColors.salmon,
    this.expand = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final theme = Theme.of(context);
    final child = icon == null
        ? Text(label)
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20),
              const SizedBox(width: 8),
              Text(label),
            ],
          );

    final minSize = expand ? const Size(double.infinity, 52) : const Size(0, 40);
    final padding = expand
        ? const EdgeInsets.symmetric(horizontal: 16)
        : const EdgeInsets.symmetric(horizontal: 12);
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppConstants.radiusM),
    );
    final border = BorderSide(color: color, width: 1.4);

    final button = isDark
        ? OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: color,
              backgroundColor: Colors.transparent,
              side: border,
              minimumSize: minSize,
              padding: padding,
              visualDensity: expand ? VisualDensity.standard : VisualDensity.compact,
              shape: shape,
              textStyle: theme.outlinedButtonTheme.style?.textStyle?.resolve({}),
            ),
            onPressed: onPressed,
            child: child,
          )
        : ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              foregroundColor: Colors.white,
              disabledBackgroundColor: color.withValues(alpha: 0.4),
              disabledForegroundColor: Colors.white.withValues(alpha: 0.7),
              elevation: 0,
              shadowColor: Colors.transparent,
              side: border,
              minimumSize: minSize,
              padding: padding,
              visualDensity: expand ? VisualDensity.standard : VisualDensity.compact,
              shape: shape,
              textStyle: theme.elevatedButtonTheme.style?.textStyle?.resolve({}),
            ),
            onPressed: onPressed,
            child: child,
          );

    if (expand) return button;
    return Align(alignment: Alignment.centerRight, child: button);
  }
}

class YaDangerIconButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final String tooltip;
  final IconData icon;
  final Color color;

  const YaDangerIconButton({
    super.key,
    required this.onPressed,
    required this.tooltip,
    this.icon = Icons.delete_outline_rounded,
    this.color = AppColors.salmon,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: isDark ? Colors.transparent : color,
        shape: CircleBorder(side: BorderSide(color: color, width: 1.4)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(
              icon,
              size: 20,
              color: isDark ? color : Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
