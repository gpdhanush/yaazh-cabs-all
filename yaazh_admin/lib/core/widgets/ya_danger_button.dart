import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';

class YaDangerButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final String label;
  final IconData? icon;
  final Color color;

  const YaDangerButton({
    super.key,
    required this.onPressed,
    required this.label,
    this.icon,
    this.color = AppColors.salmon,
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

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppConstants.radiusM),
    );

    if (isDark) {
      return OutlinedButton(
        style: OutlinedButton.styleFrom(
          foregroundColor: color,
          side: BorderSide(color: color, width: 1.4),
          minimumSize: const Size(double.infinity, 52),
          shape: shape,
          textStyle: theme.outlinedButtonTheme.style?.textStyle?.resolve({}),
        ),
        onPressed: onPressed,
        child: child,
      );
    }

    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        disabledBackgroundColor: color.withValues(alpha: 0.4),
        disabledForegroundColor: Colors.white.withValues(alpha: 0.7),
        elevation: 0,
        minimumSize: const Size(double.infinity, 52),
        shape: shape,
        textStyle: theme.elevatedButtonTheme.style?.textStyle?.resolve({}),
      ),
      onPressed: onPressed,
      child: child,
    );
  }
}
