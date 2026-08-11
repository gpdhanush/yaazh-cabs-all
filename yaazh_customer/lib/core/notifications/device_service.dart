import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yaazh_customer/core/network/api_client.dart';

final deviceServiceProvider = Provider<DeviceService>((ref) {
  return DeviceService(ref.watch(apiClientProvider));
});

class DeviceService {
  final ApiClient _apiClient;
  static const _uuidKey = 'customer_device_uuid';

  DeviceService(this._apiClient);

  Future<void> registerToken(String fcmToken, {String? appVersion}) async {
    try {
      final uuid = await _deviceUuid();
      await _apiClient.post('/customer/devices', data: {
        'platform': _platform(),
        'fcm_token': fcmToken,
        'device_uuid': uuid,
        'app_version': ?appVersion,
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
