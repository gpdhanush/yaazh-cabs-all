import 'package:flutter/material.dart';
import 'package:yaazh_customer/core/widgets/app_state_pages.dart';

class AppErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const AppErrorView({
    super.key,
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return ErrorPage(
      message: message,
      onRetry: onRetry,
      embedded: true,
    );
  }
}
