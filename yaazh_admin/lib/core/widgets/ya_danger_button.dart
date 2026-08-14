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

    if (isDark) {
      return OutlinedButton(
        style: OutlinedButton.styleFrom(
          foregroundColor: color,
          side: BorderSide(color: color, width: 1.4),
          minimumSize: const Size.fromHeight(40),
        ),
        onPressed: onPressed,
        child: child,
      );
    }

    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(40),
      ),
      onPressed: onPressed,
      child: child,
    );
  }
}
