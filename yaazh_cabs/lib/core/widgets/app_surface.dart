import 'package:flutter/material.dart';
import 'package:yaazh_cabs/app/constants.dart';

class AppSurfaceCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;
  final Gradient? gradient;
  final Border? border;

  const AppSurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.color,
    this.gradient,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final decoration = BoxDecoration(
      color: gradient == null
          ? (color ?? (isDark ? AppConstants.navy : AppConstants.white))
          : null,
      gradient: gradient,
      borderRadius: BorderRadius.circular(AppConstants.borderRadiusL),
      border: border ??
          Border.all(
            color: isDark ? AppConstants.borderDark : AppConstants.lightGrey,
          ),
    );

    final content = DefaultTextStyle.merge(
      style: const TextStyle(
        color: AppConstants.navy,
        decoration: TextDecoration.none,
      ),
      child: IconTheme.merge(
        data: const IconThemeData(color: AppConstants.navy),
        child: Padding(padding: padding, child: child),
      ),
    );

    if (onTap == null) {
      return DecoratedBox(decoration: decoration, child: content);
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppConstants.borderRadiusL),
        child: Ink(decoration: decoration, child: content),
      ),
    );
  }
}

class AppSectionLabel extends StatelessWidget {
  final String text;

  const AppSectionLabel(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: AppConstants.textSecondaryLight,
            letterSpacing: 0.7,
          ),
    );
  }
}
