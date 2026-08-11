import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

class AppConstants {
  static const String appName = 'Yaazh Cabs';
  static const String appVersion = '1.0.0';
  static const String appLogo = 'assets/img/app-logo.png';

  static const String defaultBaseUrl =
      'https://luxe-motion-ride-1.onrender.com/api/v1';

  static const String tokenKey = 'customer_access_token';
  static const String refreshTokenKey = 'customer_refresh_token';
  static const String profileCacheKey = 'customer_profile_cache';
  static const String themeModeKey = 'app_theme_mode';

  static const Color splashColor = Color(0xFF0B0E1B);
  static const Color primaryColor = Color(0xFF0F172A);
  static const Color primaryLight = Color(0xFF1E293B);
  static const Color accentColor = Color(0xFFF59E0B);
  static const Color accentHover = Color(0xFFD97706);
  static const Color successColor = Color(0xFF10B981);
  static const Color errorColor = Color(0xFFEF4444);
  static const Color warningColor = Color(0xFFF97316);
  static const Color infoColor = Color(0xFF3B82F6);

  static const Color bgLight = Color(0xFFF8FAFC);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF64748B);
  static const Color borderLight = Color(0xFFE2E8F0);

  static const Color bgDark = Color(0xFF0B0F19);
  static const Color cardDark = Color(0xFF161E2E);
  static const Color textPrimaryDark = Color(0xFFF8FAFC);
  static const Color textSecondaryDark = Color(0xFF94A3B8);
  static const Color borderDark = Color(0xFF1E293B);

  static const double borderRadiusS = 8.0;
  static const double borderRadiusM = 12.0;
  static const double borderRadiusL = 16.0;
  static const double borderRadiusXL = 24.0;

  static const double paddingS = 8.0;
  static const double paddingM = 16.0;
  static const double paddingL = 24.0;

  static const LatLng defaultCenter = LatLng(10.5847, 77.2514);
  static const String osmUserAgent = 'com.gk.yaazh_customer';
}
