import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_customer/core/network/connectivity_provider.dart';
import 'package:yaazh_customer/core/widgets/app_bottom_nav.dart';
import 'package:yaazh_customer/core/widgets/app_state_pages.dart';
import 'package:yaazh_customer/core/widgets/offline_banner.dart';
import 'package:yaazh_customer/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_customer/features/auth/presentation/forgot_password_page.dart';
import 'package:yaazh_customer/features/auth/presentation/login_page.dart';
import 'package:yaazh_customer/features/auth/presentation/register_page.dart';
import 'package:yaazh_customer/features/auth/presentation/splash_page.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';
import 'package:yaazh_customer/features/booking/presentation/book_page.dart';
import 'package:yaazh_customer/features/booking/presentation/confirm_booking_page.dart';
import 'package:yaazh_customer/features/home/presentation/home_page.dart';
import 'package:yaazh_customer/features/notifications/presentation/notifications_page.dart';
import 'package:yaazh_customer/features/profile/presentation/profile_edit_page.dart';
import 'package:yaazh_customer/features/profile/presentation/profile_page.dart';
import 'package:yaazh_customer/features/profile/presentation/saved_places_page.dart';
import 'package:yaazh_customer/features/settings/presentation/settings_page.dart';
import 'package:yaazh_customer/features/support/presentation/support_detail_page.dart';
import 'package:yaazh_customer/features/support/presentation/support_page.dart';
import 'package:yaazh_customer/features/trips/presentation/trip_detail_page.dart';
import 'package:yaazh_customer/features/trips/presentation/trips_page.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _shellNavigatorKey = GlobalKey<NavigatorState>();

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

  final router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: refresh,
    errorBuilder: (context, state) => NotFoundPage(
      onHome: () => context.go('/home'),
    ),
    redirect: (context, state) {
      final status = ref.read(authNotifierProvider).status;
      final loc = state.matchedLocation;
      final isSplash = loc == '/splash';
      final isAuthRoute = loc == '/login' || loc == '/register' || loc == '/forgot-password';
      final isPublicError = loc == '/offline' || loc == '/error';

      if (status == AuthStatus.initial || status == AuthStatus.loading) {
        if (!isSplash && !isAuthRoute) return '/splash';
        return null;
      }

      if (status == AuthStatus.unauthenticated && !isAuthRoute && !isPublicError) {
        return '/login';
      }

      if (status == AuthStatus.authenticated && (isAuthRoute || isSplash)) {
        return '/home';
      }

      if (status == AuthStatus.error && !isAuthRoute) {
        return '/login';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashPage()),
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterPage()),
      GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordPage()),
      GoRoute(
        path: '/offline',
        builder: (context, state) => OfflinePage(onRetry: () => context.go('/home')),
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
        builder: (context, state, child) => ScaffoldWithBottomNavBar(child: child),
        routes: [
          GoRoute(path: '/home', builder: (context, state) => const HomePage()),
          GoRoute(path: '/book', builder: (context, state) => const BookPage()),
          GoRoute(path: '/trips', builder: (context, state) => const TripsPage()),
          GoRoute(path: '/profile', builder: (context, state) => const ProfilePage()),
        ],
      ),
      GoRoute(
        path: '/book/confirm',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final draft = state.extra;
          if (draft is! BookingDraft) {
            return NotFoundPage(onHome: () => context.go('/book'));
          }
          return ConfirmBookingPage(draft: draft);
        },
      ),
      GoRoute(
        path: '/trips/:bookingId',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => TripDetailPage(
          bookingId: state.pathParameters['bookingId']!,
        ),
      ),
      GoRoute(
        path: '/profile/edit',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ProfileEditPage(),
      ),
      GoRoute(
        path: '/saved-places',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SavedPlacesPage(),
      ),
      GoRoute(
        path: '/notifications',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: '/settings',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: '/support',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SupportPage(),
      ),
      GoRoute(
        path: '/support/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => SupportDetailPage(
          ticketId: state.pathParameters['id']!,
        ),
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

  const ScaffoldWithBottomNavBar({super.key, required this.child});

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/book')) return 1;
    if (location.startsWith('/trips')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/home');
      case 1:
        context.go('/book');
      case 2:
        context.go('/trips');
      case 3:
        context.go('/profile');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedIndex = _calculateSelectedIndex(context);
    final online = ref.watch(isOnlineProvider);

    return Scaffold(
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
    );
  }
}
