import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/widgets/app_logo.dart';
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
    if (!mounted) return;
    await ref.read(authNotifierProvider.notifier).checkAuthSession();
    // Router redirect leaves /splash as soon as auth status settles.
    // Do not use ref or context after this await — the widget may already
    // be disposed, which is what Crashlytics was reporting.
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
            const AppLogo(size: 112),
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
