import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yaazh_customer/app/constants.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
});

final storageServiceProvider = Provider<StorageService>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  return StorageService(secureStorage);
});

class StorageService {
  final FlutterSecureStorage _secureStorage;

  StorageService(this._secureStorage);

  Future<void> setAccessToken(String token) async {
    await _secureStorage.write(key: AppConstants.tokenKey, value: token);
  }

  Future<String?> getAccessToken() async {
    return _secureStorage.read(key: AppConstants.tokenKey);
  }

  Future<void> setRefreshToken(String token) async {
    await _secureStorage.write(key: AppConstants.refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return _secureStorage.read(key: AppConstants.refreshTokenKey);
  }

  Future<void> clearTokens() async {
    await _secureStorage.delete(key: AppConstants.tokenKey);
    await _secureStorage.delete(key: AppConstants.refreshTokenKey);
  }

  Future<void> setProfileCache(String jsonStr) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.profileCacheKey, jsonStr);
  }

  Future<String?> getProfileCache() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.profileCacheKey);
  }

  Future<void> clearAll() async {
    await clearTokens();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.profileCacheKey);
  }
}
