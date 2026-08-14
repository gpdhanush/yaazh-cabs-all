import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yaazh_admin/app/constants.dart';

class AppThemeState {
  final ThemeMode mode;
  final Color primary;

  const AppThemeState({
    required this.mode,
    required this.primary,
  });

  AppThemeState copyWith({ThemeMode? mode, Color? primary}) {
    return AppThemeState(
      mode: mode ?? this.mode,
      primary: primary ?? this.primary,
    );
  }
}

final appThemeProvider =
    StateNotifierProvider<AppThemeController, AppThemeState>((ref) {
  return AppThemeController();
});

class AppThemeController extends StateNotifier<AppThemeState> {
  AppThemeController()
      : super(const AppThemeState(
          mode: ThemeMode.light,
          primary: AppColors.primary,
        )) {
    _hydrate();
  }

  Future<void> _hydrate() async {
    final prefs = await SharedPreferences.getInstance();
    final modeName = prefs.getString(AppConstants.themeModeKey);
    final colorValue = prefs.getInt(AppConstants.themePrimaryKey);
    state = AppThemeState(
      mode: switch (modeName) {
        'dark' => ThemeMode.dark,
        'system' => ThemeMode.system,
        _ => ThemeMode.light,
      },
      primary: colorValue != null ? Color(colorValue) : AppColors.primary,
    );
  }

  Future<void> setMode(ThemeMode mode) async {
    state = state.copyWith(mode: mode);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.themeModeKey, mode.name);
  }

  Future<void> setPrimary(Color color) async {
    state = state.copyWith(primary: color);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(AppConstants.themePrimaryKey, color.toARGB32());
  }
}
