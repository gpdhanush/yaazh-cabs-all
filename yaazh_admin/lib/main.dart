import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/app/router.dart';
import 'package:yaazh_admin/app/theme.dart';
import 'package:yaazh_admin/core/config/app_config.dart';
import 'package:yaazh_admin/core/firebase/firebase_bootstrap.dart';
import 'package:yaazh_admin/core/theme/theme_controller.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConfig.load();
  await initFirebase();
  _configureEasyLoading();
  SystemChrome.setSystemUIOverlayStyle(AppTheme.overlayFor(AppColors.primary));
  runApp(
    const ProviderScope(
      child: YaazhAdminApp(),
    ),
  );
}

void _configureEasyLoading() {
  EasyLoading.instance
    ..indicatorType = EasyLoadingIndicatorType.ring
    ..loadingStyle = EasyLoadingStyle.custom
    ..backgroundColor = AppColors.primary
    ..indicatorColor = Colors.white
    ..progressColor = Colors.white
    ..textColor = Colors.white
    ..textStyle = GoogleFonts.arimo(
      color: Colors.white,
      fontWeight: FontWeight.w600,
      fontSize: 14,
    )
    ..maskType = EasyLoadingMaskType.black
    ..userInteractions = false
    ..dismissOnTap = false
    ..radius = 5;
}

class YaazhAdminApp extends ConsumerWidget {
  const YaazhAdminApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeState = ref.watch(appThemeProvider);
    ref.watch(brandThemeBootstrapProvider);
    final platformDark =
        WidgetsBinding.instance.platformDispatcher.platformBrightness ==
            Brightness.dark;
    final isDark = switch (themeState.mode) {
      ThemeMode.dark => true,
      ThemeMode.light => false,
      ThemeMode.system => platformDark,
    };
    final header = themeState.primary;
    final navBar = isDark ? AppColors.cardDark : AppColors.cardLight;
    final overlay = AppTheme.overlayFor(header, navBar: navBar);

    EasyLoading.instance
      ..backgroundColor = header
      ..indicatorColor = Colors.white
      ..progressColor = Colors.white
      ..textColor = Colors.white
      ..textStyle = GoogleFonts.arimo(
        color: Colors.white,
        fontWeight: FontWeight.w600,
        fontSize: 14,
      );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlay,
      child: MaterialApp.router(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        scaffoldMessengerKey: rootMessengerKey,
        theme: AppTheme.light(themeState.primary, themeState.secondary),
        darkTheme: AppTheme.dark(themeState.primary, themeState.secondary),
        themeMode: themeState.mode,
        routerConfig: router,
        builder: EasyLoading.init(
          builder: (context, child) {
            return ColoredBox(
              color: header,
              child: SafeArea(
                top: true,
                bottom: false,
                child: child ?? const SizedBox.shrink(),
              ),
            );
          },
        ),
      ),
    );
  }
}
