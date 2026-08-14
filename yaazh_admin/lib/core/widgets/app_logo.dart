import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';

class AppLogo extends StatelessWidget {
  final double size;
  final bool clip;

  const AppLogo({super.key, this.size = 96, this.clip = false});

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      AppConstants.appLogo,
      width: size,
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
    );
    if (!clip) return image;
    return ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.22),
      child: image,
    );
  }
}
