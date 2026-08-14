import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:yaazh_admin/core/network/media_url.dart';
import 'package:yaazh_admin/features/auth/domain/admin_user.dart';

class AdminAvatar extends StatelessWidget {
  final AdminUser? user;
  final double radius;
  final int? cacheBust;

  const AdminAvatar({
    super.key,
    this.user,
    this.radius = 20,
    this.cacheBust,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    var url = resolveMediaUrl(user?.avatarUrl);
    if (url != null && cacheBust != null) {
      url = '$url${url.contains('?') ? '&' : '?'}t=$cacheBust';
    }
    return CircleAvatar(
      radius: radius,
      backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.18),
      backgroundImage: url != null ? CachedNetworkImageProvider(url) : null,
      child: url == null
          ? Text(
              user?.initials ?? 'YA',
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
