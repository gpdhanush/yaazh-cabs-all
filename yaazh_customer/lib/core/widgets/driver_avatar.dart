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
    final initial = driver.name.trim().isNotEmpty ? driver.name.trim()[0].toUpperCase() : 'D';
    return CircleAvatar(
      radius: radius,
      backgroundColor: AppConstants.accentColor,
      backgroundImage: url != null ? CachedNetworkImageProvider(url) : null,
      child: url == null
          ? Text(
              initial,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: radius * 0.72,
                color: Colors.black,
              ),
            )
          : null,
    );
  }
}
