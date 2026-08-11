import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/notifications/push_notification_service.dart';
import 'package:yaazh_customer/core/widgets/app_logo.dart';
import 'package:yaazh_customer/features/auth/presentation/auth_viewmodel.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(_boot);
  }

  Future<void> _boot() async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    await ref.read(authNotifierProvider.notifier).checkAuthSession();
    if (!mounted) return;

    final status = ref.read(authNotifierProvider).status;
    if (status == AuthStatus.authenticated) {
      await ref.read(pushNotificationServiceProvider).start();
      if (!mounted) return;
      context.go('/home');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: AppConstants.splashColor,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
        systemNavigationBarColor: AppConstants.splashColor,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: AppConstants.splashColor,
        body: SizedBox.expand(
          child: Column(
            children: [
              const Spacer(flex: 5),
              const AppLogo(size: 168),
              const SizedBox(height: 20),
              const Text(
                AppConstants.appName,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Book your ride',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.58),
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 28),
              const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: AppConstants.accentColor,
                ),
              ),
              const Spacer(flex: 4),
              Text(
                'Version ${AppConstants.appVersion}',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.42),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.4,
                ),
              ),
              SizedBox(height: 16 + bottom),
            ],
          ),
        ),
      ),
    );
  }
}
