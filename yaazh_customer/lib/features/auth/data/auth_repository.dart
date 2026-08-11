import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/core/network/api_client.dart';
import 'package:yaazh_customer/core/storage/storage_service.dart';
import 'package:yaazh_customer/features/auth/domain/customer_user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(storageServiceProvider),
  );
});

class AuthRepository {
  final ApiClient _apiClient;
  final StorageService _storage;

  AuthRepository(this._apiClient, this._storage);

  Future<CustomerUser> login({
    required String phone,
    required String password,
  }) async {
    final response = await _apiClient.post('/auth/customer/login', data: {
      'phone': phone,
      'password': password,
    });
    await _saveTokens(response);
    final profile = await getProfile();
    await _storage.setProfileCache(jsonEncode(profile.toJson()));
    return profile;
  }

  Future<CustomerUser> register({
    required String name,
    required String phone,
    required String password,
    String? email,
  }) async {
    final response = await _apiClient.post('/auth/customer/register', data: {
      'name': name,
      'phone': phone,
      'password': password,
      if (email != null && email.isNotEmpty) 'email': email,
    });
    await _saveTokens(response);
    final profile = await getProfile();
    await _storage.setProfileCache(jsonEncode(profile.toJson()));
    return profile;
  }

  Future<CustomerUser> getProfile() async {
    final response = await _apiClient.get('/customer/profile');
    return CustomerUser.fromJson(response as Map<String, dynamic>);
  }

  Future<void> updateProfile({
    String? name,
    String? email,
    String? city,
    String? address,
    String? preferredLanguage,
  }) async {
    await _apiClient.put('/customer/profile', data: {
      'name': ?name,
      'email': ?email,
      'city': ?city,
      'address': ?address,
      'preferred_language': ?preferredLanguage,
    });
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken != null) {
        await _apiClient.post('/auth/customer/logout', data: {
          'refresh_token': refreshToken,
        });
      }
    } catch (_) {
    } finally {
      await _storage.clearAll();
    }
  }

  Future<void> _saveTokens(dynamic response) async {
    final map = response is Map ? response : <String, dynamic>{};
    final accessToken = map['access_token']?.toString() ?? '';
    final refreshToken = map['refresh_token']?.toString() ?? '';
    await _storage.setAccessToken(accessToken);
    await _storage.setRefreshToken(refreshToken);
  }
}
