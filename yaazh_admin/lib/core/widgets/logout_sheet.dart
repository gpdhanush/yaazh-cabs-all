import 'package:flutter/material.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';

Future<bool> showLogoutSheet(BuildContext context) {
  return showConfirmSheet(
    context,
    title: 'Sign out?',
    message: 'You will need your email and password to access Yaazh Admin again.',
    actionLabel: 'SIGN OUT',
    cancelLabel: 'Stay signed in',
    icon: Icons.logout_rounded,
  );
}
