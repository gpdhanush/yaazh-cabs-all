import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/app/router.dart';
import 'package:yaazh_customer/app/theme.dart';
import 'package:yaazh_customer/core/firebase/firebase_bootstrap.dart';
import 'package:yaazh_customer/features/settings/presentation/theme_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initFirebase();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: AppConstants.primaryColor,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
    ),
  );
  runApp(
    const ProviderScope(
      child: YaazhCustomerApp(),
    ),
  );
}

class YaazhCustomerApp extends ConsumerWidget {
  const YaazhCustomerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);

    const overlay = SystemUiOverlayStyle(
      statusBarColor: AppConstants.primaryColor,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlay,
      child: MaterialApp.router(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: themeMode,
        routerConfig: router,
        builder: (context, child) {
          return ColoredBox(
            color: AppConstants.splashColor,
            child: SafeArea(
              top: true,
              bottom: false,
              child: child ?? const SizedBox.shrink(),
            ),
          );
        },
      ),
    );
  }
}
