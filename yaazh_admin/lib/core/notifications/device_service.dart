import 'dart:io';
import 'dart:math';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/network/api_client.dart';

final deviceServiceProvider = Provider<DeviceService>((ref) {
  return DeviceService(ref.watch(apiClientProvider));
});

class DeviceService {
  final ApiClient _apiClient;
  static const _uuidKey = 'admin_device_uuid';

  DeviceService(this._apiClient);

  Future<void> registerAfterLogin({String? appVersion}) async {
    try {
      final token = await resolveFcmToken();
      if (token == null || token.isEmpty) return;
      await registerToken(token, appVersion: appVersion);
    } catch (e) {
      debugPrint('Device registration after login skipped: $e');
    }
  }

  Future<void> registerToken(String fcmToken, {String? appVersion}) async {
    try {
      final uuid = await _deviceUuid();
      await _apiClient.post(
        '/admin/devices',
        data: {
          'platform': _platform(),
          'fcm_token': fcmToken,
          'device_uuid': uuid,
          'app_version': ?appVersion,
        },
        silent: true,
      );
    } catch (e) {
      debugPrint('Device registration skipped: $e');
    }
  }

  Future<String?> resolveFcmToken() async {
    try {
      if (Firebase.apps.isEmpty) return null;
      // Must await so FCM failures are caught here, not propagated to login.
      return await FirebaseMessaging.instance.getToken();
    } catch (e) {
      debugPrint('FCM token skipped: $e');
      return null;
    }
  }

  String _platform() {
    if (kIsWeb) return 'web';
    if (Platform.isIOS) return 'ios';
    return 'android';
  }

  Future<String> _deviceUuid() async {
    final prefs = await SharedPreferences.getInstance();
    var uuid = prefs.getString(_uuidKey);
    if (uuid == null || uuid.isEmpty) {
      final r = Random.secure();
      final bytes = List<int>.generate(16, (_) => r.nextInt(256));
      uuid = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
      await prefs.setString(_uuidKey, uuid);
    }
    return uuid;
  }

  String get appVersion => AppConstants.appVersion;
}
