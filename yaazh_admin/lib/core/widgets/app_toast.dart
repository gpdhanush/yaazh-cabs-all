import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';

final GlobalKey<ScaffoldMessengerState> rootMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

enum AppSnackKind { success, error, info }

void showAppToast(String message, {AppSnackKind kind = AppSnackKind.info}) {
  final messenger = rootMessengerKey.currentState;
  if (messenger == null) return;
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: switch (kind) {
          AppSnackKind.success => AppColors.success,
          AppSnackKind.error => AppColors.salmon,
          AppSnackKind.info => AppColors.primary,
        },
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 88),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusField),
        ),
        duration: const Duration(seconds: 3),
      ),
    );
}

void showSuccessToast(String message) =>
    showAppToast(message, kind: AppSnackKind.success);

void showErrorToast(String message) =>
    showAppToast(message, kind: AppSnackKind.error);
