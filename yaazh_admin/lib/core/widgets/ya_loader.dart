import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';

class YaLoader extends StatelessWidget {
  final double size;
  final double strokeWidth;

  const YaLoader({super.key, this.size = 28, this.strokeWidth = 2.2});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CircularProgressIndicator(
        strokeWidth: strokeWidth,
        color: AppColors.primary,
      ),
    );
  }
}
