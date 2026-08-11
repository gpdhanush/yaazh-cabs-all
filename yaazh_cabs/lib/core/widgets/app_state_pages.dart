import 'package:flutter/material.dart';
import 'package:yaazh_cabs/app/constants.dart';

/// Full-page offline state.
class OfflinePage extends StatelessWidget {
  final VoidCallback? onRetry;
  final bool embedded;

  const OfflinePage({
    super.key,
    this.onRetry,
    this.embedded = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = _StateScaffold(
      icon: Icons.wifi_off_rounded,
      iconColor: AppConstants.warningColor,
      title: 'No internet connection',
      message:
          'Check your mobile data or Wi‑Fi, then try again. Trip actions need a live connection.',
      primaryLabel: 'Try again',
      onPrimary: onRetry,
      secondaryLabel: embedded ? null : 'Go back',
      onSecondary: embedded ? null : () => Navigator.of(context).maybePop(),
    );

    if (embedded) return content;
    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      body: SafeArea(child: content),
    );
  }
}

/// Full-page generic error.
class ErrorPage extends StatelessWidget {
  final String? message;
  final VoidCallback? onRetry;
  final VoidCallback? onHome;
  final bool embedded;

  const ErrorPage({
    super.key,
    this.message,
    this.onRetry,
    this.onHome,
    this.embedded = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = _StateScaffold(
      icon: Icons.error_outline_rounded,
      iconColor: AppConstants.errorColor,
      title: 'Something went wrong',
      message: message?.trim().isNotEmpty == true
          ? message!
          : 'We could not complete that request. Please try again in a moment.',
      primaryLabel: 'Try again',
      onPrimary: onRetry,
      secondaryLabel: onHome != null ? 'Back to home' : null,
      onSecondary: onHome,
    );

    if (embedded) return content;
    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      body: SafeArea(child: content),
    );
  }
}

/// Full-page 404 / route not found.
class NotFoundPage extends StatelessWidget {
  final VoidCallback? onHome;

  const NotFoundPage({super.key, this.onHome});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      body: SafeArea(
        child: _StateScaffold(
          icon: Icons.map_outlined,
          iconColor: AppConstants.infoColor,
          title: 'Page not found',
          message:
              'This screen does not exist or the trip link is invalid. Head back to your dashboard.',
          primaryLabel: 'Go to home',
          onPrimary: onHome,
          codeBadge: '404',
        ),
      ),
    );
  }
}

class AppEmptyView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const AppEmptyView({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return _StateScaffold(
      icon: icon,
      iconColor: AppConstants.textSecondaryLight,
      title: title,
      message: message,
      primaryLabel: actionLabel,
      onPrimary: onAction,
    );
  }
}

class _StateScaffold extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String message;
  final String? primaryLabel;
  final VoidCallback? onPrimary;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final String? codeBadge;

  const _StateScaffold({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.message,
    this.primaryLabel,
    this.onPrimary,
    this.secondaryLabel,
    this.onSecondary,
    this.codeBadge,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppConstants.paddingL),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (codeBadge != null) ...[
                Text(
                  codeBadge!,
                  style: TextStyle(
                    fontSize: 56,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -2,
                    color: iconColor.withValues(alpha: 0.25),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 40, color: iconColor),
              ),
              const SizedBox(height: 24),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 15,
                  height: 1.45,
                  color: AppConstants.textSecondaryLight,
                ),
              ),
              if (primaryLabel != null && onPrimary != null) ...[
                const SizedBox(height: 28),
                ElevatedButton(
                  onPressed: onPrimary,
                  child: Text(primaryLabel!),
                ),
              ],
              if (secondaryLabel != null && onSecondary != null) ...[
                const SizedBox(height: 10),
                TextButton(
                  onPressed: onSecondary,
                  child: Text(secondaryLabel!),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
