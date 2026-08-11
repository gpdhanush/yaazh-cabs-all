import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/network/media_url.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';

class DriverAvatar extends StatelessWidget {
  final BookingParty driver;
  final double radius;

  const DriverAvatar({super.key, required this.driver, this.radius = 24});

  @override
  Widget build(BuildContext context) {
    final url = resolveMediaUrl(driver.photoUrl);
    final size = radius * 2;
    return ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: url == null
            ? _Initial(name: driver.name, radius: radius)
            : CachedNetworkImage(
                imageUrl: url,
                width: size,
                height: size,
                fit: BoxFit.cover,
                placeholder: (_, _) => _Initial(name: driver.name, radius: radius),
                errorWidget: (_, _, _) => _Initial(name: driver.name, radius: radius),
              ),
      ),
    );
  }
}

class DriverNameLine extends StatelessWidget {
  final BookingParty driver;
  final double avatarRadius;
  final String? subtitle;
  final TextStyle? nameStyle;
  final Color? nameColor;
  final Widget? trailing;

  const DriverNameLine({
    super.key,
    required this.driver,
    this.avatarRadius = 18,
    this.subtitle,
    this.nameStyle,
    this.nameColor,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        DriverAvatar(driver: driver, radius: avatarRadius),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                driver.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: nameStyle ??
                    TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: nameColor,
                    ),
              ),
              if (subtitle != null && subtitle!.isNotEmpty)
                Text(
                  subtitle!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: nameColor?.withValues(alpha: 0.7) ?? AppConstants.textSecondaryLight,
                  ),
                ),
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}

class _Initial extends StatelessWidget {
  final String name;
  final double radius;

  const _Initial({required this.name, required this.radius});

  @override
  Widget build(BuildContext context) {
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : 'D';
    return ColoredBox(
      color: AppConstants.accentColor,
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: radius * 0.72,
            color: Colors.black,
          ),
        ),
      ),
    );
  }
}
