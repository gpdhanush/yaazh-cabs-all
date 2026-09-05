import 'dart:io';
import 'dart:math';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yaazh_cabs/core/network/api_client.dart';

final deviceServiceProvider = Provider<DeviceService>((ref) {
  return DeviceService(ref.watch(apiClientProvider));
});

/// Registers this install with `POST /driver/devices`.
class DeviceService {
  final ApiClient _apiClient;
  static const _uuidKey = 'driver_device_uuid';

  DeviceService(this._apiClient);

  Future<void> registerAfterLogin({String? appVersion}) async {
    final token = await resolveFcmToken();
    if (token == null || token.isEmpty) return;
    await registerToken(token, appVersion: appVersion);
  }

  Future<void> registerToken(String fcmToken, {String? appVersion}) async {
    try {
      final uuid = await _deviceUuid();
      await _apiClient.post('/driver/devices', data: {
        'platform': _platform(),
        'fcm_token': fcmToken,
        'device_uuid': uuid,
        if (appVersion != null) 'app_version': appVersion,
      });
    } catch (e) {
      debugPrint('Device registration skipped: $e');
    }
  }

  Future<String?> resolveFcmToken() async {
    try {
      if (Firebase.apps.isEmpty) return null;
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
}
