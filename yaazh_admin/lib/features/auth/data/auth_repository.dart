import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/notifications/device_service.dart';
import 'package:yaazh_admin/core/storage/storage_service.dart';
import 'package:yaazh_admin/features/auth/domain/admin_user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(storageServiceProvider),
    ref.watch(deviceServiceProvider),
  );
});

class AuthRepository {
  final ApiClient _apiClient;
  final StorageService _storage;
  final DeviceService _devices;

  AuthRepository(this._apiClient, this._storage, this._devices);

  Future<AdminUser> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post('/auth/admin/login', data: {
      'email': email,
      'password': password,
    });
    await _saveTokens(response);
    final user = _userFrom(response);
    await _cacheUser(user);
    // Push registration is best-effort; never block sign-in.
    try {
      await _devices.registerAfterLogin(appVersion: AppConstants.appVersion);
    } catch (_) {}
    return user;
  }

  Future<AdminUser> fetchProfile() async {
    final data = await _apiClient.get('/admin/profile');
    final user = AdminUser.fromJson(Map<String, dynamic>.from(data as Map));
    await _cacheUser(user);
    return user;
  }

  Future<AdminUser> updateProfile({
    required String name,
    required String email,
    String? phone,
    String? password,
  }) async {
    final data = await _apiClient.put('/admin/profile', data: {
      'name': name,
      'email': email,
      'phone': phone,
      if (password != null && password.isNotEmpty) 'password': password,
    });
    final user = AdminUser.fromJson(Map<String, dynamic>.from(data as Map));
    await _cacheUser(user);
    return user;
  }

  Future<AdminUser> uploadPhoto(String filePath, {String? filename, String? contentType}) async {
    final data = await _apiClient.uploadFile(
      '/admin/profile/photo',
      filePath: filePath,
      filename: filename,
      contentType: contentType,
    );
    if (data is! Map) {
      throw ApiException(message: 'Invalid photo upload response.');
    }
    final user = AdminUser.fromJson(Map<String, dynamic>.from(data));
    if (kDebugMode) {
      debugPrint('[PROFILE PHOTO] Returned photo URL: ${user.avatarUrl}');
    }
    await _cacheUser(user);
    return user;
  }

  Future<AdminUser> removePhoto() async {
    final data = await _apiClient.delete('/admin/profile/photo');
    final user = AdminUser.fromJson(Map<String, dynamic>.from(data as Map));
    await _cacheUser(user);
    return user;
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken != null) {
        await _apiClient.post(
          '/auth/admin/logout',
          data: {'refresh_token': refreshToken},
          silent: true,
        );
      }
    } catch (_) {
    } finally {
      await _storage.clearAll();
    }
  }

  AdminUser _userFrom(dynamic response) {
    final map = response is Map ? Map<String, dynamic>.from(response) : <String, dynamic>{};
    final userRaw = map['user'];
    if (userRaw is Map) {
      return AdminUser.fromJson(Map<String, dynamic>.from(userRaw));
    }
    return const AdminUser(id: '', name: 'Admin', email: '');
  }

  Future<void> _cacheUser(AdminUser user) async {
    await _storage.setProfileCache(jsonEncode(user.toJson()));
  }

  Future<void> _saveTokens(dynamic response) async {
    final map = response is Map ? response : <String, dynamic>{};
    final accessToken = map['access_token']?.toString() ?? '';
    final refreshToken = map['refresh_token']?.toString() ?? '';
    await _storage.setAccessToken(accessToken);
    await _storage.setRefreshToken(refreshToken);
  }
}
