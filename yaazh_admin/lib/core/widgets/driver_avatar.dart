import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/network/media_url.dart';
import 'package:yaazh_admin/features/bookings/domain/booking.dart';

class DriverAvatar extends StatelessWidget {
  final BookingParty? driver;
  final String? id;
  final String? name;
  final String? photoUrl;
  final double radius;
  final int? cacheBust;

  const DriverAvatar({
    super.key,
    this.driver,
    this.id,
    this.name,
    this.photoUrl,
    this.radius = 20,
    this.cacheBust,
  });

  String? get _id => driver?.id ?? id;
  String? get _photo => driver?.photoUrl ?? photoUrl;

  @override
  Widget build(BuildContext context) {
    var url = driverPhotoUrl(id: _id, photoUrl: _photo);
    if (url != null && cacheBust != null) {
      url = '$url${url.contains('?') ? '&' : '?'}t=$cacheBust';
    }
    final size = radius * 2;

    return ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: url == null
            ? _DefaultDriverImage(size: size)
            : CachedNetworkImage(
                imageUrl: url,
                width: size,
                height: size,
                fit: BoxFit.cover,
                fadeInDuration: const Duration(milliseconds: 180),
                memCacheWidth: (size * 3).round(),
                errorListener: (_) {},
                placeholder: (_, _) => _DefaultDriverImage(size: size),
                errorWidget: (_, _, _) => _DefaultDriverImage(size: size),
              ),
      ),
    );
  }
}

class _DefaultDriverImage extends StatelessWidget {
  final double size;

  const _DefaultDriverImage({required this.size});

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      AppConstants.driverDefaultImage,
      width: size,
      height: size,
      fit: BoxFit.cover,
    );
  }
}
