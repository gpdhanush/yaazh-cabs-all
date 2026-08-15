import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:yaazh_admin/core/network/media_url.dart';
import 'package:yaazh_admin/features/auth/domain/admin_user.dart';

class AdminAvatar extends StatelessWidget {
  final AdminUser? user;
  final double radius;
  final int? cacheBust;

  const AdminAvatar({super.key, this.user, this.radius = 20, this.cacheBust});

  @override
  Widget build(BuildContext context) {
    var url = adminPhotoUrl(id: user?.id, avatarUrl: user?.avatarUrl);
    if (url != null && cacheBust != null) {
      url = '$url${url.contains('?') ? '&' : '?'}t=$cacheBust';
    }
    final size = radius * 2;
    final ringWidth = (radius * 0.14).clamp(2.0, 3.0);
    final secondary = Theme.of(context).colorScheme.secondary;

    return Container(
      padding: EdgeInsets.all(ringWidth),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: secondary,
      ),
      child: ClipOval(
        child: SizedBox(
          width: size,
          height: size,
          child: url == null
              ? _InitialsBadge(user: user, radius: radius)
              : CachedNetworkImage(
                  imageUrl: url,
                  width: size,
                  height: size,
                  fit: BoxFit.cover,
                  fadeInDuration: const Duration(milliseconds: 180),
                  memCacheWidth: (size * 3).round(),
                  errorListener: (err) {
                    if (kDebugMode) {
                      debugPrint(
                        '[PROFILE PHOTO] Image URL validation: decode failed for $url ($err)',
                      );
                    }
                  },
                  placeholder: (_, _) =>
                      _InitialsBadge(user: user, radius: radius),
                  errorWidget: (_, _, _) =>
                      _InitialsBadge(user: user, radius: radius),
                ),
        ),
      ),
    );
  }
}

class _InitialsBadge extends StatelessWidget {
  final AdminUser? user;
  final double radius;

  const _InitialsBadge({required this.user, required this.radius});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final letters = user?.initials ?? 'A';
    return ColoredBox(
      color: theme.colorScheme.primary,
      child: Center(
        child: Text(
          letters,
          style: TextStyle(
            color: theme.colorScheme.onPrimary,
            fontWeight: FontWeight.w800,
            fontSize: radius * (letters.length > 1 ? 0.72 : 0.82),
            height: 1,
          ),
        ),
      ),
    );
  }
}
