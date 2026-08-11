import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/network/media_url.dart';

class DriverAvatar extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final double radius;

  const DriverAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.radius = 24,
  });

  @override
  Widget build(BuildContext context) {
    final resolved = resolveMediaUrl(imageUrl);
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : 'D';

    return CircleAvatar(
      radius: radius,
      backgroundColor: AppConstants.gold,
      foregroundImage: resolved == null
          ? null
          : CachedNetworkImageProvider(resolved),
      child: Text(
        initial,
        style: TextStyle(
          color: AppConstants.black,
          fontWeight: FontWeight.w800,
          fontSize: radius * 0.72,
        ),
      ),
    );
  }
}
