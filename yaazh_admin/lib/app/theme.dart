import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:yaazh_admin/app/constants.dart';

class AppTheme {
  static ThemeData light(Color primary) => _build(Brightness.light, primary);

  static ThemeData dark(Color primary) => _build(Brightness.dark, primary);

  static bool useLightIconsOn(Color color) {
    return ThemeData.estimateBrightnessForColor(color) == Brightness.dark;
  }

  static Color onPrimaryOf(Color primary) {
    return useLightIconsOn(primary) ? Colors.white : AppColors.textPrimaryLight;
  }

  static SystemUiOverlayStyle overlayFor(
    Color header, {
    Color? navBar,
  }) {
    final lightStatusIcons = useLightIconsOn(header);
    final nav = navBar ?? header;
    final lightNavIcons = useLightIconsOn(nav);
    return SystemUiOverlayStyle(
      statusBarColor: header,
      statusBarIconBrightness:
          lightStatusIcons ? Brightness.light : Brightness.dark,
      statusBarBrightness:
          lightStatusIcons ? Brightness.dark : Brightness.light,
      systemNavigationBarColor: nav,
      systemNavigationBarIconBrightness:
          lightNavIcons ? Brightness.light : Brightness.dark,
      systemNavigationBarDividerColor: nav,
    );
  }

  static ThemeData _build(Brightness brightness, Color primary) {
    final isDark = brightness == Brightness.dark;
    final onPrimary = onPrimaryOf(primary);
    final onSurface = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final muted = isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
    final bg = isDark ? AppColors.bgDark : AppColors.bgLight;
    final surface = isDark ? AppColors.cardDark : AppColors.cardLight;
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: brightness,
    ).copyWith(
      primary: primary,
      onPrimary: onPrimary,
      secondary: AppColors.supportBlue,
      onSecondary: Colors.white,
      tertiary: AppColors.supportPurple,
      onTertiary: Colors.white,
      error: AppColors.salmon,
      onError: Colors.white,
      surface: surface,
      onSurface: onSurface,
      onSurfaceVariant: muted,
      outline: border,
      outlineVariant: border,
      secondaryContainer: Color.alphaBlend(
        primary.withValues(alpha: isDark ? 0.28 : 0.16),
        surface,
      ),
      onSecondaryContainer: isDark ? AppColors.textPrimaryDark : primary,
    );

    final baseText = GoogleFonts.arimoTextTheme(
      ThemeData(brightness: brightness).textTheme,
    );
    final textTheme = baseText.copyWith(
      displaySmall: baseText.displaySmall?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: -0.4,
        color: onSurface,
      ),
      headlineMedium: baseText.headlineMedium?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
        color: onSurface,
      ),
      headlineSmall: baseText.headlineSmall?.copyWith(
        fontWeight: FontWeight.w700,
        color: onSurface,
      ),
      titleLarge: baseText.titleLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: onSurface,
      ),
      titleMedium: baseText.titleMedium?.copyWith(
        fontWeight: FontWeight.w700,
        color: onSurface,
      ),
      titleSmall: baseText.titleSmall?.copyWith(
        fontWeight: FontWeight.w600,
        color: onSurface,
      ),
      bodyLarge: baseText.bodyLarge?.copyWith(color: onSurface, height: 1.4),
      bodyMedium: baseText.bodyMedium?.copyWith(color: onSurface, height: 1.45),
      bodySmall: baseText.bodySmall?.copyWith(color: muted, height: 1.4),
      labelLarge: baseText.labelLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: onSurface,
      ),
      labelMedium: baseText.labelMedium?.copyWith(color: muted),
      labelSmall: baseText.labelSmall?.copyWith(color: muted),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      textTheme: textTheme,
      primaryColor: primary,
      scaffoldBackgroundColor: bg,
      canvasColor: surface,
      dividerColor: border,
      splashFactory: InkRipple.splashFactory,
      iconTheme: IconThemeData(color: onSurface),
      primaryIconTheme: IconThemeData(color: onPrimary),
      appBarTheme: AppBarTheme(
        backgroundColor: primary,
        foregroundColor: onPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        systemOverlayStyle: overlayFor(
          primary,
          navBar: surface,
        ),
        iconTheme: IconThemeData(color: onPrimary),
        actionsIconTheme: IconThemeData(color: onPrimary),
        titleTextStyle: textTheme.titleLarge?.copyWith(color: onPrimary),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusL),
          side: BorderSide(color: border),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          disabledBackgroundColor: primary.withValues(alpha: 0.4),
          disabledForegroundColor: onPrimary.withValues(alpha: 0.7),
          elevation: 0,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.radiusM),
          ),
          textStyle: GoogleFonts.arimo(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: isDark ? AppColors.primaryLight : primary,
          minimumSize: const Size(double.infinity, 52),
          side: BorderSide(
            color: isDark ? AppColors.primaryLight : primary,
            width: 1.4,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.radiusM),
          ),
          textStyle: GoogleFonts.arimo(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: isDark ? AppColors.primaryLight : primary,
          textStyle: GoogleFonts.arimo(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.radiusM),
          ),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: primary,
        foregroundColor: onPrimary,
        elevation: 2,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return onPrimary;
          return isDark ? AppColors.textSecondaryDark : Colors.white;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return primary;
          return isDark ? AppColors.borderDark : const Color(0xFFCBD5E1);
        }),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: muted,
        textColor: onSurface,
        subtitleTextStyle: textTheme.bodySmall,
        titleTextStyle: textTheme.titleSmall,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF161632) : Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        floatingLabelBehavior: FloatingLabelBehavior.never,
        prefixIconColor: muted,
        suffixIconColor: muted,
        iconColor: muted,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusField),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusField),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusField),
          borderSide: BorderSide(color: primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusField),
          borderSide: const BorderSide(color: AppColors.salmon),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusField),
          borderSide: const BorderSide(color: AppColors.salmon, width: 1.6),
        ),
        hintStyle: TextStyle(color: muted.withValues(alpha: 0.85)),
        helperStyle: TextStyle(color: muted),
        errorStyle: const TextStyle(color: AppColors.salmon, fontSize: 12),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: isDark ? AppColors.bgDark : const Color(0xFFF3F4FB),
        selectedColor: primary,
        disabledColor: border,
        labelStyle: GoogleFonts.arimo(fontWeight: FontWeight.w600, color: onSurface),
        secondaryLabelStyle: GoogleFonts.arimo(
          fontWeight: FontWeight.w700,
          color: onPrimary,
        ),
        checkmarkColor: onPrimary,
        deleteIconColor: onSurface,
        side: BorderSide(color: border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(99),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: isDark ? AppColors.primaryLight : primary,
        unselectedItemColor: muted,
        selectedLabelStyle: GoogleFonts.arimo(fontWeight: FontWeight.w700, fontSize: 12),
        unselectedLabelStyle: GoogleFonts.arimo(fontWeight: FontWeight.w500, fontSize: 12),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: Colors.transparent,
        overlayColor: WidgetStateProperty.all(Colors.transparent),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected
                ? (isDark ? AppColors.primaryLight : primary)
                : muted,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.arimo(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected
                ? (isDark ? AppColors.primaryLight : primary)
                : muted,
          );
        }),
      ),
      drawerTheme: DrawerThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      dividerTheme: DividerThemeData(color: border, space: 1),
      tabBarTheme: TabBarThemeData(
        labelColor: onPrimary,
        unselectedLabelColor: onPrimary.withValues(alpha: 0.72),
        indicatorColor: onPrimary,
        labelStyle: GoogleFonts.arimo(fontWeight: FontWeight.w700, fontSize: 14),
        unselectedLabelStyle: GoogleFonts.arimo(fontWeight: FontWeight.w500, fontSize: 14),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.primary,
        contentTextStyle: GoogleFonts.arimo(color: Colors.white, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusField),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.titleLarge,
        contentTextStyle: textTheme.bodyMedium,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: surface,
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: surface,
        surfaceTintColor: Colors.transparent,
        textStyle: textTheme.bodyMedium,
      ),
      dropdownMenuTheme: DropdownMenuThemeData(
        textStyle: textTheme.bodyMedium,
        menuStyle: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(surface),
          surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
        ),
      ),
      datePickerTheme: DatePickerThemeData(
        backgroundColor: surface,
        headerBackgroundColor: primary,
        headerForegroundColor: onPrimary,
        dayForegroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return onPrimary;
          if (states.contains(WidgetState.disabled)) {
            return muted.withValues(alpha: 0.5);
          }
          return onSurface;
        }),
        dayBackgroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return primary;
          return Colors.transparent;
        }),
        yearForegroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return onPrimary;
          return onSurface;
        }),
        todayForegroundColor: WidgetStatePropertyAll(primary),
        todayBorder: BorderSide(color: primary),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primary,
      ),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: primary,
        selectionColor: primary.withValues(alpha: 0.28),
        selectionHandleColor: primary,
      ),
    );
  }
}
