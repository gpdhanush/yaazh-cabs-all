import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/app/router.dart';
import 'package:yaazh_admin/core/notifications/device_service.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';

final pendingNotificationLocationProvider = StateProvider<String?>((ref) => null);

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService(ref);
});

class PushNotificationService {
  final Ref _ref;
  bool _started = false;

  PushNotificationService(this._ref);

  Future<void> start() async {
    if (_started || Firebase.apps.isEmpty) return;
    _started = true;

    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) {
        await _ref.read(deviceServiceProvider).registerToken(
              token,
              appVersion: AppConstants.appVersion,
            );
      }

      messaging.onTokenRefresh.listen((next) {
        _ref.read(deviceServiceProvider).registerToken(
              next,
              appVersion: AppConstants.appVersion,
            );
      });

      FirebaseMessaging.onMessage.listen(_onForeground);
      FirebaseMessaging.onMessageOpenedApp.listen(_openFromMessage);

      final initial = await messaging.getInitialMessage();
      if (initial != null) {
        final location = _locationFrom(initial);
        if (location != null) {
          _ref.read(pendingNotificationLocationProvider.notifier).state =
              location;
        }
      }
    } catch (e) {
      debugPrint('Push notification start skipped: $e');
      _started = false;
    }
  }

  void _onForeground(RemoteMessage message) {
    final title =
        message.notification?.title ?? message.data['title'] ?? 'Yaazh Admin';
    final body = message.notification?.body ?? message.data['body'] ?? '';
    final location = _locationFrom(message);
    final messenger = rootMessengerKey.currentState;
    if (messenger == null) return;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(body.toString().isEmpty ? title.toString() : '$title — $body'),
          action: location == null
              ? null
              : SnackBarAction(
                  label: 'View',
                  onPressed: () {
                    final ctx = rootNavigatorKey.currentContext;
                    if (ctx != null && ctx.mounted) {
                      GoRouter.of(ctx).go(location);
                    }
                  },
                ),
        ),
      );
  }

  void _openFromMessage(RemoteMessage message) {
    final location = _locationFrom(message);
    if (location == null) return;

    final ctx = rootNavigatorKey.currentContext;
    if (ctx != null && ctx.mounted) {
      GoRouter.of(ctx).go(location);
      return;
    }
    _ref.read(pendingNotificationLocationProvider.notifier).state = location;
  }

  String? _locationFrom(RemoteMessage message) {
    final data = message.data;
    final bookingId = data['booking_id'] ?? data['bookingId'];
    final enquiryId = data['enquiry_id'] ?? data['enquiryId'];
    final type = (data['type'] ?? data['job_type'] ?? '').toString().toLowerCase();

    if (bookingId != null && bookingId.toString().isNotEmpty) {
      return '/bookings/${bookingId.toString()}';
    }
    if (enquiryId != null && enquiryId.toString().isNotEmpty) {
      return '/enquiries/${enquiryId.toString()}';
    }
    final driverId = data['driver_id'] ?? data['driverId'];
    if (driverId != null && driverId.toString().isNotEmpty) {
      return '/drivers/${driverId.toString()}';
    }
    final customerId = data['customer_id'] ?? data['customerId'];
    if (customerId != null && customerId.toString().isNotEmpty) {
      return '/customers/${customerId.toString()}';
    }
    if (type.contains('enquiry')) return '/enquiries';
    if (type.contains('driver')) return '/drivers';
    if (type.contains('customer')) return '/customers';
    if (type.contains('booking') || type.contains('trip') || type.contains('feedback')) {
      return '/bookings';
    }
    return '/home';
  }
}
