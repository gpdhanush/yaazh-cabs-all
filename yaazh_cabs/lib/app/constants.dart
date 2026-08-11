import 'package:flutter/material.dart';

class AppConstants {
  static const String appName = 'Yaazh Cabs Driver';
  static const String appLogo = 'assets/img/playstore-icon.png';

  // API Config
  static const String defaultBaseUrl =
      'https://luxe-motion-ride-1.onrender.com/api/v1';

  // Storage keys
  static const String tokenKey = 'driver_access_token';
  static const String refreshTokenKey = 'driver_refresh_token';
  static const String driverProfileKey = 'driver_profile_cache';
  static const String themeModeKey = 'app_theme_mode';

  // Black & Gold Elegance
  static const Color white = Color(0xFFFFFFFF);
  static const Color lightGrey = Color(0xFFE5E5E5);
  static const Color gold = Color(0xFFFCA311);
  static const Color navy = Color(0xFF14213D);
  static const Color black = Color(0xFF000000);

  // Branding
  static const Color primaryColor = navy;
  static const Color primaryLight = Color(0xFF1E3358);
  static const Color accentColor = gold;
  static const Color accentHover = Color(0xFFE08E0A);
  static const Color successColor = Color(0xFF1B7F4E);
  static const Color errorColor = Color(0xFFC0392B);
  static const Color warningColor = gold;
  static const Color infoColor = navy;

  // Surfaces — light
  static const Color bgLight = Color(0xFFF4F4F4);
  static const Color cardLight = white;
  static const Color borderLight = lightGrey;
  static const Color textPrimaryLight = navy;
  static const Color textSecondaryLight = Color(0xFF5C6578);

  // Surfaces — dark
  static const Color bgDark = black;
  static const Color cardDark = navy;
  static const Color borderDark = Color(0xFF2A3A5C);
  static const Color textPrimaryDark = white;
  static const Color textSecondaryDark = Color(0xFFB8BDC8);

  // Layout
  static const double borderRadiusS = 8.0;
  static const double borderRadiusM = 14.0;
  static const double borderRadiusL = 18.0;
  static const double borderRadiusXL = 24.0;

  static const double paddingS = 8.0;
  static const double paddingM = 16.0;
  static const double paddingL = 24.0;
}
