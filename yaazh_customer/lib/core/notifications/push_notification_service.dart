import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:yaazh_customer/app/router.dart';
import 'package:yaazh_customer/core/notifications/device_service.dart';

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
      await Permission.notification.request();
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) {
        await _ref.read(deviceServiceProvider).registerToken(token, appVersion: '1.0.0');
      }

      messaging.onTokenRefresh.listen((next) {
        _ref.read(deviceServiceProvider).registerToken(next, appVersion: '1.0.0');
      });

      FirebaseMessaging.onMessage.listen(_onForeground);
      FirebaseMessaging.onMessageOpenedApp.listen(_openFromMessage);

      final initial = await messaging.getInitialMessage();
      if (initial != null) {
        final location = _locationFrom(initial);
        if (location != null) {
          _ref.read(pendingNotificationLocationProvider.notifier).state = location;
        }
      }
    } catch (e) {
      debugPrint('Push notification start skipped: $e');
      _started = false;
    }
  }

  void _onForeground(RemoteMessage message) {
    final title = message.notification?.title ?? message.data['title'] ?? 'Booking update';
    final body = message.notification?.body ?? message.data['body'] ?? '';
    final ctx = rootNavigatorKey.currentContext;
    if (ctx == null || !ctx.mounted) return;
    final location = _locationFrom(message);
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(
        content: Text(body.isEmpty ? title : '$title — $body'),
        action: location == null
            ? null
            : SnackBarAction(label: 'View', onPressed: () => GoRouter.of(ctx).go(location)),
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
    if (bookingId != null && bookingId.toString().isNotEmpty) {
      return '/trips/${bookingId.toString()}';
    }
    final type = (data['type'] ?? data['job_type'] ?? '').toString();
    if (type.contains('booking') || type.contains('trip')) {
      return '/trips';
    }
    return '/notifications';
  }
}
