import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
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
  String? get _name => driver?.name ?? name;
  String? get _photo => driver?.photoUrl ?? photoUrl;

  String get _initials {
    if (driver != null) return driver!.initials;
    final parts = (_name ?? '').trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.length >= 2) {
      return (parts.first[0] + parts.elementAt(1)[0]).toUpperCase();
    }
    if ((_name ?? '').trim().isNotEmpty) return _name!.trim()[0].toUpperCase();
    return 'D';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    var url = driverPhotoUrl(id: _id, photoUrl: _photo);
    if (url != null && cacheBust != null) {
      url = '$url${url.contains('?') ? '&' : '?'}t=$cacheBust';
    }
    return CircleAvatar(
      radius: radius,
      backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.15),
      backgroundImage: url != null ? CachedNetworkImageProvider(url) : null,
      child: url == null
          ? Text(
              _initials,
              style: TextStyle(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w700,
                fontSize: radius * 0.7,
              ),
            )
          : null,
    );
  }
}
