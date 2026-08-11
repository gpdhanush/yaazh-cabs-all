import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yaazh_cabs/core/network/api_client.dart';

final deviceServiceProvider = Provider<DeviceService>((ref) {
  return DeviceService(ref.watch(apiClientProvider));
});

/// Registers this install with `POST /driver/devices`.
///
/// When Firebase is configured, replace [_resolveFcmToken] with a real FCM token.
/// Until then a stable local device token is used so the backend can still track devices.
class DeviceService {
  final ApiClient _apiClient;
  static const _prefsKey = 'driver_device_token';
  static const _uuidKey = 'driver_device_uuid';

  DeviceService(this._apiClient);

  Future<void> registerAfterLogin({String? appVersion}) async {
    try {
      final token = await _resolveFcmToken();
      final uuid = await _deviceUuid();
      final platform = _platform();

      await _apiClient.post('/driver/devices', data: {
        'platform': platform,
        'fcm_token': token,
        'device_uuid': uuid,
        if (appVersion != null) 'app_version': appVersion,
      });
    } catch (e) {
      debugPrint('Device registration skipped: $e');
    }
  }

  String _platform() {
    if (kIsWeb) return 'web';
    if (Platform.isIOS) return 'ios';
    return 'android';
  }

  Future<String> _resolveFcmToken() async {
    // Hook for FirebaseMessaging.instance.getToken() when google-services is added.
    final prefs = await SharedPreferences.getInstance();
    var token = prefs.getString(_prefsKey);
    if (token == null || token.length < 10) {
      token = 'local_${_randomToken()}';
      await prefs.setString(_prefsKey, token);
    }
    return token;
  }

  Future<String> _deviceUuid() async {
    final prefs = await SharedPreferences.getInstance();
    var uuid = prefs.getString(_uuidKey);
    if (uuid == null || uuid.isEmpty) {
      uuid = _randomToken();
      await prefs.setString(_uuidKey, uuid);
    }
    return uuid;
  }

  String _randomToken() {
    final r = Random.secure();
    final bytes = List<int>.generate(24, (_) => r.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
