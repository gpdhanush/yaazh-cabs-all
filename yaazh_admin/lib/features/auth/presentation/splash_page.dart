import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/app/theme.dart';
import 'package:yaazh_admin/core/widgets/app_logo.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  String _version = AppConstants.appVersion;
  String _build = '1';
  @override
  void initState() {
    super.initState();
    Future.microtask(_boot);
  }

  Future<void> _boot() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (mounted) {
        setState(() {
          _version = info.version;
          _build = info.buildNumber;
        });
      }
    } catch (_) {}

    await Future<void>.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    await ref.read(authNotifierProvider.notifier).checkAuthSession();
    if (!mounted) return;

    final status = ref.read(authNotifierProvider).status;
    if (status == AuthStatus.authenticated) {
      context.go('/home');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final header = Theme.of(context).colorScheme.primary;
    // final onHeader = AppTheme.onPrimaryOf(header);
    final overlay = AppTheme.overlayFor(header, navBar: header);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlay,
      child: Scaffold(
        // backgroundColor: header,
        body: SafeArea(
          top: false,
          bottom: true,
          child: SizedBox.expand(
            child: Column(
              children: [
                const Spacer(flex: 5),
                const AppLogo(size: 250),
                const SizedBox(height: 150),
                Text(
                  AppConstants.appName,
                  style: TextStyle(
                    color: header,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Admin Console',
                  style: TextStyle(
                    color: header,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: header,
                    // color: onHeader,
                  ),
                ),
                const Spacer(flex: 4),
                Text(
                  'Version $_version+$_build',
                  style: TextStyle(
                    color: header,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 50),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
