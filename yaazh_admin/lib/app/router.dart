import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/page_transitions.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';
import 'package:yaazh_admin/features/auth/presentation/forgot_password_page.dart';
import 'package:yaazh_admin/features/auth/presentation/login_page.dart';
import 'package:yaazh_admin/features/auth/presentation/splash_page.dart';
import 'package:yaazh_admin/features/bookings/presentation/assign_driver_page.dart';
import 'package:yaazh_admin/features/bookings/presentation/booking_detail_page.dart';
import 'package:yaazh_admin/features/bookings/presentation/booking_reason_page.dart';
import 'package:yaazh_admin/features/bookings/presentation/bookings_page.dart';
import 'package:yaazh_admin/features/customers/presentation/customer_detail_page.dart';
import 'package:yaazh_admin/features/customers/presentation/customers_page.dart';
import 'package:yaazh_admin/features/drivers/presentation/driver_detail_page.dart';
import 'package:yaazh_admin/features/drivers/presentation/driver_form_page.dart';
import 'package:yaazh_admin/features/drivers/presentation/drivers_page.dart';
import 'package:yaazh_admin/features/enquiries/presentation/enquiries_page.dart';
import 'package:yaazh_admin/features/enquiries/presentation/enquiry_detail_page.dart';
import 'package:yaazh_admin/features/fleet/presentation/fleet_page.dart';
import 'package:yaazh_admin/features/fleet/presentation/vehicle_form_page.dart';
import 'package:yaazh_admin/features/home/presentation/home_page.dart';
import 'package:yaazh_admin/features/notifications/presentation/notification_compose_page.dart';
import 'package:yaazh_admin/features/notifications/presentation/notifications_page.dart';
import 'package:yaazh_admin/features/settings/presentation/app_settings_page.dart';
import 'package:yaazh_admin/features/settings/presentation/profile_page.dart';
import 'package:yaazh_admin/features/settings/presentation/web_settings_page.dart';
import 'package:yaazh_admin/features/shell/admin_shell.dart';
import 'package:yaazh_admin/features/testimonials/presentation/testimonial_form_page.dart';
import 'package:yaazh_admin/features/testimonials/presentation/testimonials_page.dart';
import 'package:yaazh_admin/features/tracking/presentation/live_tracking_page.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

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

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: refresh,
    errorBuilder: (context, state) => PlaceholderListPage(
      title: 'Page not found',
      subtitle: 'That screen is not available.',
      icon: Icons.map_outlined,
    ),
    redirect: (context, state) {
      final status = ref.read(authNotifierProvider).status;
      final loc = state.matchedLocation;
      final isSplash = loc == '/splash';
      final isAuthRoute = loc == '/login' || loc == '/forgot-password';

      if (status == AuthStatus.initial || status == AuthStatus.loading) {
        if (!isSplash && !isAuthRoute) return '/splash';
        return null;
      }

      if (status == AuthStatus.unauthenticated && !isAuthRoute && !isSplash) {
        return '/login';
      }

      if (status == AuthStatus.error && !isAuthRoute && !isSplash) {
        return '/login';
      }

      if (status == AuthStatus.authenticated && (isAuthRoute || isSplash)) {
        return '/home';
      }

      if (status == AuthStatus.authenticated && loc == '/more') {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashPage()),
      slideRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      slideRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      slideRoute(
        path: '/profile',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const ProfilePage(),
      ),
      slideRoute(
        path: '/tracking',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const LiveTrackingPage(),
      ),
      slideRoute(
        path: '/drivers/new',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const DriverFormPage(),
      ),
      slideRoute(
        path: '/drivers/:id/edit',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => DriverFormPage(
          driverId: state.pathParameters['id'],
        ),
      ),
      slideRoute(
        path: '/drivers/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => DriverDetailPage(
          driverId: state.pathParameters['id']!,
        ),
      ),
      slideRoute(
        path: '/drivers',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const DriversPage(),
      ),
      slideRoute(
        path: '/fleet/new',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const VehicleFormPage(),
      ),
      slideRoute(
        path: '/fleet/:id/edit',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => VehicleFormPage(
          vehicleId: state.pathParameters['id'],
        ),
      ),
      slideRoute(
        path: '/fleet',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const FleetPage(),
      ),
      slideRoute(
        path: '/bookings/:id/assign',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => AssignDriverPage(
          bookingId: state.pathParameters['id']!,
        ),
      ),
      slideRoute(
        path: '/bookings/:id/reject',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => BookingReasonPage(
          bookingId: state.pathParameters['id']!,
          action: BookingReasonAction.reject,
        ),
      ),
      slideRoute(
        path: '/bookings/:id/cancel',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => BookingReasonPage(
          bookingId: state.pathParameters['id']!,
          action: BookingReasonAction.cancel,
        ),
      ),
      slideRoute(
        path: '/bookings/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => BookingDetailPage(
          bookingId: state.pathParameters['id']!,
        ),
      ),
      slideRoute(
        path: '/enquiries/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => EnquiryDetailPage(
          enquiryId: state.pathParameters['id']!,
        ),
      ),
      slideRoute(
        path: '/testimonials/new',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const TestimonialFormPage(),
      ),
      slideRoute(
        path: '/testimonials/:id/edit',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => TestimonialFormPage(
          testimonialId: state.pathParameters['id'],
        ),
      ),
      slideRoute(
        path: '/testimonials',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const TestimonialsPage(),
      ),
      slideRoute(
        path: '/notifications/new',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const NotificationComposePage(),
      ),
      slideRoute(
        path: '/notifications',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const NotificationsPage(),
      ),
      slideRoute(
        path: '/web-settings',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const WebSettingsPage(),
      ),
      slideRoute(
        path: '/customers/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => CustomerDetailPage(
          customerId: state.pathParameters['id']!,
        ),
      ),
      slideRoute(
        path: '/customers',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const CustomersPage(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AdminShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/home', builder: (context, state) => const HomePage()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/bookings',
                builder: (context, state) => const BookingsPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/enquiries',
                builder: (context, state) => const EnquiriesPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                builder: (context, state) => const AppSettingsPage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
