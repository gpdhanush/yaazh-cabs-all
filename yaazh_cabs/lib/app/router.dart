import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/app/theme.dart';
import 'package:yaazh_cabs/core/firebase/analytics_service.dart';
import 'package:yaazh_cabs/core/network/connectivity_provider.dart';
import 'package:yaazh_cabs/core/widgets/app_bottom_nav.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
import 'package:yaazh_cabs/core/widgets/offline_banner.dart';
import 'package:yaazh_cabs/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_cabs/features/auth/presentation/forgot_password_page.dart';
import 'package:yaazh_cabs/features/auth/presentation/login_page.dart';
import 'package:yaazh_cabs/features/auth/presentation/splash_page.dart';
import 'package:yaazh_cabs/features/dashboard/presentation/dashboard_page.dart';
import 'package:yaazh_cabs/features/documents/presentation/document_upload_page.dart';
import 'package:yaazh_cabs/features/documents/presentation/documents_page.dart';
import 'package:yaazh_cabs/features/history/presentation/history_page.dart';
import 'package:yaazh_cabs/features/notifications/presentation/notifications_page.dart';
import 'package:yaazh_cabs/features/offers/presentation/offers_page.dart';
import 'package:yaazh_cabs/features/profile/presentation/profile_edit_page.dart';
import 'package:yaazh_cabs/features/profile/presentation/profile_page.dart';
import 'package:yaazh_cabs/features/settings/presentation/settings_page.dart';
import 'package:yaazh_cabs/features/support/presentation/support_page.dart';
import 'package:yaazh_cabs/features/trips/presentation/pages/active_trip_page.dart';
import 'package:yaazh_cabs/features/trips/presentation/pages/assigned_trips_page.dart';
import 'package:yaazh_cabs/features/trips/presentation/pages/payment_collection_page.dart';
import 'package:yaazh_cabs/features/trips/presentation/pages/trip_details_page.dart';
import 'package:yaazh_cabs/features/trips/presentation/pages/trip_summary_page.dart';
import 'package:yaazh_cabs/features/wallet/presentation/wallet_page.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _shellNavigatorKey =
    GlobalKey<NavigatorState>();
final pendingNotificationLocationProvider = StateProvider<String?>((ref) => null);

class _AuthRefreshListenable extends ChangeNotifier {
  void ping() => notifyListeners();
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefreshListenable();

  ref.listen<AuthState>(authNotifierProvider, (previous, next) {
    if (previous?.status != next.status) {
      refresh.ping();
    }
  });
  ref.listen<String?>(pendingNotificationLocationProvider, (previous, next) {
    if (next != null && next.isNotEmpty) {
      refresh.ping();
    }
  });

  final analyticsObserver = ref.read(analyticsServiceProvider).observer();

  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    observers: [
      if (analyticsObserver != null) analyticsObserver,
    ],
    initialLocation: '/splash',
    refreshListenable: refresh,
    errorBuilder: (context, state) => NotFoundPage(
      onHome: () => context.go('/home'),
    ),
    redirect: (context, state) {
      final status = ref.read(authNotifierProvider).status;
      final loc = state.matchedLocation;
      final isSplash = loc == '/splash';
      final isLoggingIn = loc == '/login' || loc == '/forgot-password';
      final isPublicError = loc == '/offline' || loc == '/error';

      if (status == AuthStatus.initial || status == AuthStatus.loading) {
        if (!isSplash && !isLoggingIn) return '/splash';
        return null;
      }

      if (status == AuthStatus.unauthenticated &&
          !isLoggingIn &&
          !isPublicError) {
        return '/login';
      }

      if (status == AuthStatus.authenticated && (isLoggingIn || isSplash)) {
        final pending = ref.read(pendingNotificationLocationProvider);
        if (pending != null && pending.isNotEmpty) {
          ref.read(pendingNotificationLocationProvider.notifier).state = null;
          return pending;
        }
        return '/home';
      }

      if (status == AuthStatus.authenticated) {
        final pending = ref.read(pendingNotificationLocationProvider);
        if (pending != null && pending.isNotEmpty && loc != pending) {
          ref.read(pendingNotificationLocationProvider.notifier).state = null;
          return pending;
        }
      }

      if (status == AuthStatus.error && !isLoggingIn) {
        return '/login';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: '/offline',
        builder: (context, state) => OfflinePage(
          onRetry: () => context.go('/home'),
        ),
      ),
      GoRoute(
        path: '/error',
        builder: (context, state) {
          final msg = state.uri.queryParameters['message'];
          return ErrorPage(
            message: msg,
            onRetry: () => context.go('/home'),
            onHome: () => context.go('/home'),
          );
        },
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return ScaffoldWithBottomNavBar(child: child);
        },
        routes: [
          GoRoute(
            path: '/home',
            builder: (context, state) => const DashboardPage(),
          ),
          GoRoute(
            path: '/trips',
            builder: (context, state) => const AssignedTripsPage(),
          ),
          GoRoute(
            path: '/history',
            builder: (context, state) => const HistoryPage(),
          ),
          GoRoute(
            path: '/wallet',
            builder: (context, state) => const WalletPage(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfilePage(),
          ),
        ],
      ),
      GoRoute(
        path: '/trips/:bookingId',
        builder: (context, state) {
          final bookingId = state.pathParameters['bookingId']!;
          return TripDetailsPage(bookingId: bookingId);
        },
      ),
      GoRoute(
        path: '/active-trip/:bookingId',
        builder: (context, state) {
          final bookingId = state.pathParameters['bookingId']!;
          return ActiveTripPage(bookingId: bookingId);
        },
      ),
      GoRoute(
        path: '/payment/:bookingId',
        builder: (context, state) {
          final bookingId = state.pathParameters['bookingId']!;
          return PaymentCollectionPage(bookingId: bookingId);
        },
      ),
      GoRoute(
        path: '/summary/:bookingId',
        builder: (context, state) {
          final bookingId = state.pathParameters['bookingId']!;
          return TripSummaryPage(bookingId: bookingId);
        },
      ),
      GoRoute(
        path: '/offers',
        builder: (context, state) => const OffersPage(),
      ),
      GoRoute(
        path: '/documents',
        builder: (context, state) => const DocumentsPage(),
      ),
      GoRoute(
        path: '/documents/upload',
        builder: (context, state) => const DocumentUploadPage(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (context, state) => const ProfileEditPage(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: '/support',
        builder: (context, state) => const SupportPage(),
      ),
    ],
  );

  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });

  return router;
});

class ScaffoldWithBottomNavBar extends ConsumerWidget {
  final Widget child;

  const ScaffoldWithBottomNavBar({
    super.key,
    required this.child,
  });

  int _calculateSelectedIndex(BuildContext context) {
    final String location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/trips')) return 1;
    if (location.startsWith('/history')) return 2;
    if (location.startsWith('/wallet')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/home');
        break;
      case 1:
        context.go('/trips');
        break;
      case 2:
        context.go('/history');
        break;
      case 3:
        context.go('/wallet');
        break;
      case 4:
        context.go('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedIndex = _calculateSelectedIndex(context);
    final online = ref.watch(isOnlineProvider);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppTheme.statusOverlay,
      child: Scaffold(
        backgroundColor: AppConstants.bgLight,
        body: Column(
          children: [
            OfflineBanner(
              isOffline: !online,
              onRetry: () => ref.invalidate(connectivityStatusProvider),
            ),
            Expanded(child: child),
          ],
        ),
        bottomNavigationBar: AppBottomNav(
          currentIndex: selectedIndex,
          onTap: (index) => _onItemTapped(index, context),
        ),
      ),
    );
  }
}
