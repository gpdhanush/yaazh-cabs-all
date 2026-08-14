import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/app/router.dart';
import 'package:yaazh_admin/core/notifications/device_service.dart';

const _androidChannelId = 'yaazh_admin';
const _androidChannelName = 'Yaazh Admin';

final pendingNotificationLocationProvider = StateProvider<String?>((ref) => null);

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService(ref);
});

class PushNotificationService {
  final Ref _ref;
  bool _started = false;
  final _local = FlutterLocalNotificationsPlugin();

  static PushNotificationService? _instance;

  PushNotificationService(this._ref);

  Future<void> start() async {
    if (_started || Firebase.apps.isEmpty) return;
    _started = true;
    _instance = this;

    try {
      const androidInit = AndroidInitializationSettings('@drawable/ic_stat_yaazh');
      await _local.initialize(
        const InitializationSettings(android: androidInit),
        onDidReceiveNotificationResponse: _onLocalTap,
      );
      final androidPlugin = _local.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _androidChannelId,
          _androidChannelName,
          description: 'Bookings, trips, enquiries, and customer alerts',
          importance: Importance.high,
        ),
      );
      await androidPlugin?.requestNotificationsPermission();

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
        _go(_locationFrom(initial));
      }
    } catch (e) {
      debugPrint('Push notification start skipped: $e');
      _started = false;
    }
  }

  Future<void> _onForeground(RemoteMessage message) async {
    final title =
        message.notification?.title ?? message.data['title'] ?? 'Yaazh Admin';
    final body = message.notification?.body ?? message.data['body'] ?? '';
    final location = _locationFrom(message);

    try {
      await _local.show(
        message.hashCode & 0x7fffffff,
        title.toString(),
        body.toString().isEmpty ? null : body.toString(),
        const NotificationDetails(
          android: AndroidNotificationDetails(
            _androidChannelId,
            _androidChannelName,
            channelDescription: 'Bookings, trips, enquiries, and customer alerts',
            importance: Importance.high,
            priority: Priority.high,
            icon: '@drawable/ic_stat_yaazh',
            largeIcon: DrawableResourceAndroidBitmap('@mipmap/ic_notification_large'),
            styleInformation: BigPictureStyleInformation(
              DrawableResourceAndroidBitmap('@mipmap/ic_notification_large'),
              hideExpandedLargeIcon: true,
            ),
            color: AppColors.primary,
            playSound: true,
            enableVibration: true,
          ),
        ),
        payload: location,
      );
    } catch (e) {
      debugPrint('Foreground notification skipped: $e');
    }
  }

  static void _onLocalTap(NotificationResponse response) {
    final location = response.payload;
    if (location == null || location.isEmpty) return;
    _instance?._go(location);
  }

  void _openFromMessage(RemoteMessage message) {
    _go(_locationFrom(message));
  }

  void _go(String? location) {
    if (location == null || location.isEmpty) return;
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
    if (type.contains('booking') || type.contains('trip') || type.contains('feedback')) {
      return '/bookings';
    }
    if (type.contains('customer')) return '/customers';
    return '/home';
  }
}
