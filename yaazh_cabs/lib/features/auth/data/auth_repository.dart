import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/core/network/api_client.dart';
import 'package:yaazh_cabs/core/notifications/device_service.dart';
import 'package:yaazh_cabs/core/storage/storage_service.dart';
import 'package:yaazh_cabs/features/auth/domain/driver_user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storage = ref.watch(storageServiceProvider);
  final devices = ref.watch(deviceServiceProvider);
  return AuthRepository(apiClient, storage, devices);
});

class AuthRepository {
  final ApiClient _apiClient;
  final StorageService _storage;
  final DeviceService _devices;

  AuthRepository(this._apiClient, this._storage, this._devices);

  Future<DriverUser> login({
    required String phone,
    required String password,
  }) async {
    final response = await _apiClient.post('/auth/driver/login', data: {
      'phone': phone,
      'password': password,
    });

    final accessToken = response['access_token']?.toString() ?? '';
    final refreshToken = response['refresh_token']?.toString() ?? '';
    await _storage.setAccessToken(accessToken);
    await _storage.setRefreshToken(refreshToken);

    final profile = await getProfile();
    await _storage.setDriverProfileCache(jsonEncode(profile.toJson()));
    await _devices.registerAfterLogin(appVersion: '1.0.0');

    return profile;
  }

  Future<DriverUser> getProfile() async {
    final response = await _apiClient.get('/driver/profile');
    return DriverUser.fromJson(response as Map<String, dynamic>);
  }

  Future<void> updateProfile({
    String? name,
    String? email,
    String? address,
  }) async {
    await _apiClient.put('/driver/profile', data: {
      if (name != null) 'name': name,
      if (email != null) 'email': email,
      if (address != null) 'address': address,
    });
  }

  Future<Map<String, String>> getDriverStatus() async {
    final response = await _apiClient.get('/driver/status');
    final map = response as Map<String, dynamic>;
    return {
      'online_status': map['online_status']?.toString() ?? 'offline',
      'availability_status':
          map['availability_status']?.toString() ?? 'available',
    };
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken != null) {
        await _apiClient.post('/auth/driver/logout', data: {
          'refresh_token': refreshToken,
        });
      }
    } catch (_) {
    } finally {
      await _storage.clearAll();
    }
  }
}
