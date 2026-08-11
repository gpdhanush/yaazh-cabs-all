import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/firebase/analytics_service.dart';
import 'package:yaazh_cabs/core/notifications/push_notification_service.dart';
import 'package:yaazh_cabs/features/auth/presentation/auth_viewmodel.dart';

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
    await ref.read(authNotifierProvider.notifier).checkAuthSession();
    if (!mounted) return;

    final status = ref.read(authNotifierProvider).status;
    if (status == AuthStatus.authenticated) {
      final user = ref.read(authNotifierProvider).user;
      if (user != null) {
        await ref.read(analyticsServiceProvider).setDriver(user.id);
      }
      await ref.read(pushNotificationServiceProvider).start();
      if (!mounted) return;
      context.go('/home');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.navy,
      body: SafeArea(
        child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppConstants.gold,
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Icon(
                Icons.local_taxi_rounded,
                size: 48,
                color: AppConstants.black,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Yaazh Cabs',
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    color: AppConstants.white,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'DRIVER',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppConstants.gold,
                    letterSpacing: 2.4,
                  ),
            ),
            const SizedBox(height: 40),
            const SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: AppConstants.gold,
              ),
            ),
          ],
        ),
        ),
      ),
    );
  }
}
