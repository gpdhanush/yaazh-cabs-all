import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:yaazh_cabs/app/constants.dart';

class AppTheme {
  /// Navy header + light status-bar icons so titles stay readable.
  static const SystemUiOverlayStyle statusOverlay = SystemUiOverlayStyle(
    statusBarColor: AppConstants.navy,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: AppConstants.white,
    systemNavigationBarIconBrightness: Brightness.dark,
    systemNavigationBarDividerColor: AppConstants.lightGrey,
  );

  static TextTheme _textTheme({
    required Color primary,
    required Color secondary,
  }) {
    final base = GoogleFonts.plusJakartaSansTextTheme(
      ThemeData(brightness: Brightness.light).textTheme,
    );
    return base.copyWith(
      displaySmall: base.displaySmall?.copyWith(
        fontSize: 28,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.6,
        height: 1.2,
        color: primary,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.4,
        height: 1.25,
        color: primary,
      ),
      headlineSmall: base.headlineSmall?.copyWith(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.3,
        height: 1.25,
        color: primary,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.2,
        height: 1.3,
        color: primary,
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        height: 1.35,
        color: primary,
      ),
      titleSmall: base.titleSmall?.copyWith(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        height: 1.35,
        color: primary,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        height: 1.45,
        color: primary,
      ),
      bodyMedium: base.bodyMedium?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        height: 1.45,
        color: primary,
      ),
      bodySmall: base.bodySmall?.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        height: 1.4,
        color: secondary,
      ),
      labelLarge: base.labelLarge?.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.3,
        color: primary,
      ),
      labelMedium: base.labelMedium?.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.5,
        color: secondary,
      ),
      labelSmall: base.labelSmall?.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.6,
        color: secondary,
      ),
    );
  }

  static ThemeData get lightTheme {
    final textTheme = _textTheme(
      primary: AppConstants.textPrimaryLight,
      secondary: AppConstants.textSecondaryLight,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppConstants.navy,
      scaffoldBackgroundColor: AppConstants.bgLight,
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      textTheme: textTheme,
      colorScheme: const ColorScheme.light(
        primary: AppConstants.navy,
        secondary: AppConstants.gold,
        surface: AppConstants.white,
        error: AppConstants.errorColor,
        onPrimary: AppConstants.white,
        onSecondary: AppConstants.black,
        onSurface: AppConstants.navy,
        outline: AppConstants.lightGrey,
      ),
      dividerColor: AppConstants.lightGrey,
      dividerTheme: const DividerThemeData(
        color: AppConstants.lightGrey,
        space: 1,
        thickness: 1,
      ),
      cardTheme: CardThemeData(
        color: AppConstants.white,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusL),
          side: const BorderSide(color: AppConstants.lightGrey),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppConstants.navy,
        foregroundColor: AppConstants.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle: statusOverlay,
        iconTheme: const IconThemeData(color: AppConstants.white),
        actionsIconTheme: const IconThemeData(color: AppConstants.white),
        titleTextStyle: textTheme.titleLarge?.copyWith(
          color: AppConstants.white,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppConstants.gold,
          foregroundColor: AppConstants.black,
          disabledBackgroundColor: AppConstants.lightGrey,
          disabledForegroundColor: AppConstants.textSecondaryLight,
          elevation: 0,
          minimumSize: const Size(double.infinity, 52),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          ),
          textStyle: textTheme.labelLarge?.copyWith(color: AppConstants.black),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppConstants.gold,
          foregroundColor: AppConstants.black,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppConstants.navy,
          minimumSize: const Size(double.infinity, 52),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          side: const BorderSide(color: AppConstants.navy, width: 1.4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppConstants.navy,
          textStyle: textTheme.titleSmall,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppConstants.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          borderSide: const BorderSide(color: AppConstants.lightGrey),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          borderSide: const BorderSide(color: AppConstants.lightGrey),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          borderSide: const BorderSide(color: AppConstants.gold, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          borderSide: const BorderSide(color: AppConstants.errorColor),
        ),
        labelStyle: textTheme.bodyMedium?.copyWith(
          color: AppConstants.textSecondaryLight,
        ),
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: AppConstants.textSecondaryLight,
        ),
        prefixIconColor: AppConstants.navy,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppConstants.white,
        selectedColor: AppConstants.gold,
        disabledColor: AppConstants.lightGrey,
        labelStyle: textTheme.titleSmall!,
        secondaryLabelStyle: textTheme.titleSmall!,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppConstants.lightGrey),
        ),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: AppConstants.navy,
        unselectedLabelColor: AppConstants.textSecondaryLight,
        indicatorColor: AppConstants.gold,
        labelStyle: textTheme.titleSmall,
        unselectedLabelStyle: textTheme.bodySmall,
        dividerColor: AppConstants.lightGrey,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppConstants.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusL),
        ),
        titleTextStyle: textTheme.titleLarge,
        contentTextStyle: textTheme.bodyMedium,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppConstants.navy,
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: AppConstants.white,
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppConstants.gold,
        foregroundColor: AppConstants.black,
        elevation: 2,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppConstants.white,
        selectedItemColor: AppConstants.gold,
        unselectedItemColor: AppConstants.textSecondaryLight,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppConstants.gold,
      ),
    );
  }

  static ThemeData get darkTheme {
    final textTheme = _textTheme(
      primary: AppConstants.textPrimaryDark,
      secondary: AppConstants.textSecondaryDark,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppConstants.gold,
      scaffoldBackgroundColor: AppConstants.bgDark,
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      textTheme: textTheme,
      colorScheme: const ColorScheme.dark(
        primary: AppConstants.gold,
        secondary: AppConstants.gold,
        surface: AppConstants.navy,
        error: AppConstants.errorColor,
        onPrimary: AppConstants.black,
        onSecondary: AppConstants.black,
        onSurface: AppConstants.white,
        outline: AppConstants.borderDark,
      ),
      dividerColor: AppConstants.borderDark,
      cardTheme: CardThemeData(
        color: AppConstants.navy,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusL),
          side: const BorderSide(color: AppConstants.borderDark),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppConstants.navy,
        foregroundColor: AppConstants.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle: statusOverlay,
        iconTheme: const IconThemeData(color: AppConstants.white),
        actionsIconTheme: const IconThemeData(color: AppConstants.white),
        titleTextStyle: textTheme.titleLarge?.copyWith(
          color: AppConstants.white,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppConstants.gold,
          foregroundColor: AppConstants.black,
          elevation: 0,
          minimumSize: const Size(double.infinity, 52),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          ),
          textStyle: textTheme.labelLarge?.copyWith(color: AppConstants.black),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppConstants.gold,
          minimumSize: const Size(double.infinity, 52),
          side: const BorderSide(color: AppConstants.gold, width: 1.4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppConstants.navy,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          borderSide: const BorderSide(color: AppConstants.borderDark),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          borderSide: const BorderSide(color: AppConstants.borderDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          borderSide: const BorderSide(color: AppConstants.gold, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusM),
          borderSide: const BorderSide(color: AppConstants.errorColor),
        ),
        labelStyle: textTheme.bodyMedium?.copyWith(
          color: AppConstants.textSecondaryDark,
        ),
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: AppConstants.textSecondaryDark,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppConstants.navy,
        selectedItemColor: AppConstants.gold,
        unselectedItemColor: AppConstants.textSecondaryDark,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppConstants.navy,
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: AppConstants.white,
        ),
        behavior: SnackBarBehavior.floating,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppConstants.gold,
      ),
    );
  }
}
