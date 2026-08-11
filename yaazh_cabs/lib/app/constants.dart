import 'package:flutter/material.dart';

class AppConstants {
  static const String appName = 'Yaazh Cabs Driver';
  
  // API Config
  // Default to localhost for Android emulator / desktop
  static const String defaultBaseUrl = 'https://luxe-motion-ride-1.onrender.com/api/v1';
  
  // Storage keys
  static const String tokenKey = 'driver_access_token';
  static const String refreshTokenKey = 'driver_refresh_token';
  static const String driverProfileKey = 'driver_profile_cache';
  static const String themeModeKey = 'app_theme_mode';

  // Branding Colors
  static const Color primaryColor = Color(0xFF0F172A); // Slate 900
  static const Color primaryLight = Color(0xFF1E293B); // Slate 800
  static const Color accentColor = Color(0xFFF59E0B); // Amber 500
  static const Color accentHover = Color(0xFFD97706); // Amber 600
  static const Color successColor = Color(0xFF10B981); // Emerald 500
  static const Color errorColor = Color(0xFFEF4444); // Red 500
  static const Color warningColor = Color(0xFFF97316); // Orange 500
  static const Color infoColor = Color(0xFF3B82F6); // Blue 500
  
  // Surface Colors - Light
  static const Color bgLight = Color(0xFFF8FAFC);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF64748B);

  // Surface Colors - Dark
  static const Color bgDark = Color(0xFF0B0F19);
  static const Color cardDark = Color(0xFF161E2E);
  static const Color textPrimaryDark = Color(0xFFF8FAFC);
  static const Color textSecondaryDark = Color(0xFF94A3B8);

  // Layout Tokens
  static const double borderRadiusS = 8.0;
  static const double borderRadiusM = 12.0;
  static const double borderRadiusL = 16.0;
  static const double borderRadiusXL = 24.0;

  static const double paddingS = 8.0;
  static const double paddingM = 16.0;
  static const double paddingL = 24.0;
}
