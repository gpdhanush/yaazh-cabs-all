import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/constants.dart';
import 'app/router.dart';
import 'app/theme.dart';
import 'core/firebase/firebase_bootstrap.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initFirebase();
  SystemChrome.setSystemUIOverlayStyle(AppTheme.statusOverlay);
  runApp(
    const ProviderScope(
      child: YaazhDriverApp(),
    ),
  );
}

class YaazhDriverApp extends ConsumerWidget {
  const YaazhDriverApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppTheme.statusOverlay,
      child: MaterialApp.router(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        themeMode: ThemeMode.light,
        routerConfig: router,
      ),
    );
  }
}
