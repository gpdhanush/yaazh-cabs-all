import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

class AppColors {
  static const Color primary = Color(0xFF4B49AC);
  static const Color primaryLight = Color(0xFF98BDFF);
  static const Color supportBlue = Color(0xFF7DA0FA);
  static const Color supportPurple = Color(0xFF7978E9);
  static const Color salmon = Color(0xFFF3797E);

  static const Color bgLight = Color(0xFFF4F6FB);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color textPrimaryLight = Color(0xFF1F1E39);
  static const Color textSecondaryLight = Color(0xFF6B7289);
  static const Color borderLight = Color(0xFFE4E7F1);

  static const Color bgDark = Color(0xFF12122A);
  static const Color cardDark = Color(0xFF1C1C3A);
  static const Color textPrimaryDark = Color(0xFFF5F6FF);
  static const Color textSecondaryDark = Color(0xFFA4A7C1);
  static const Color borderDark = Color(0xFF2C2C52);

  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
}

class AppConstants {
  static const String appName = 'Yaazh Admin';
  static const String appVersion = '1.0.0+1';
  static const String appLogo = 'assets/img/app-logo-admin.png';
  static const String loginLogo = 'assets/img/logo-light.png';
  static const String brandMark = 'YZ';

  static const String defaultBaseUrl =
      'https://luxe-motion-ride-1.onrender.com/api/v1';

  static const String tokenKey = 'admin_access_token';
  static const String refreshTokenKey = 'admin_refresh_token';
  static const String profileCacheKey = 'admin_profile_cache';
  static const String themeModeKey = 'admin_theme_mode';
  static const String themePrimaryKey = 'admin_theme_primary';
  static const String themeSecondaryKey = 'admin_theme_secondary';

  static const String fallbackSupportPhone = '04252222222';

  static const List<({String name, Color color})> themeSwatches = [
    (name: 'Yaazh', color: AppColors.primary),
    (name: 'Red', color: Color(0xFFF44336)),
    (name: 'Pink', color: Color(0xFFE91E63)),
    (name: 'Purple', color: Color(0xFF9C27B0)),
    (name: 'Deep Purple', color: Color(0xFF673AB7)),
    (name: 'Indigo', color: Color(0xFF3F51B5)),
    (name: 'Blue', color: Color(0xFF2196F3)),
    (name: 'Light Blue', color: Color(0xFF03A9F4)),
    (name: 'Cyan', color: Color(0xFF00BCD4)),
    (name: 'Teal', color: Color(0xFF009688)),
    (name: 'Green', color: Color(0xFF4CAF50)),
    (name: 'Light Green', color: Color(0xFF8BC34A)),
    (name: 'Lime', color: Color(0xFFCDDC39)),
    (name: 'Yellow', color: Color(0xFFFFEB3B)),
    (name: 'Amber', color: Color(0xFFFFC107)),
    (name: 'Orange', color: Color(0xFFFF9800)),
    (name: 'Deep Orange', color: Color(0xFFFF5722)),
    (name: 'Brown', color: Color(0xFF795548)),
    (name: 'Grey', color: Color(0xFF9E9E9E)),
    (name: 'Blue Grey', color: Color(0xFF607D8B)),
  ];

  static const double radiusField = 5;
  static const double radiusS = 10;
  static const double radiusM = 14;
  static const double radiusL = 20;
  static const double radiusXL = 28;

  static const double paddingS = 8;
  static const double paddingM = 16;
  static const double paddingL = 24;

  static const double tabletBreakpoint = 840;

  static const LatLng defaultCenter = LatLng(10.5847, 77.2514);
  static const String osmUserAgent = 'com.yaazh.admin';
}

class Breakpoints {
  static bool isTablet(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= AppConstants.tabletBreakpoint;
}
