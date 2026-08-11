import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/core/network/api_exception.dart';
import 'package:yaazh_customer/core/storage/storage_service.dart';
import 'package:yaazh_customer/features/auth/data/auth_repository.dart';
import 'package:yaazh_customer/features/auth/domain/customer_user.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final CustomerUser? user;
  final String? errorMessage;

  AuthState({
    required this.status,
    this.user,
    this.errorMessage,
  });

  factory AuthState.initial() => AuthState(status: AuthStatus.initial);
  factory AuthState.loading() => AuthState(status: AuthStatus.loading);
  factory AuthState.authenticated(CustomerUser user) =>
      AuthState(status: AuthStatus.authenticated, user: user);
  factory AuthState.unauthenticated() =>
      AuthState(status: AuthStatus.unauthenticated);
  factory AuthState.error(String message) =>
      AuthState(status: AuthStatus.error, errorMessage: message);
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authRepositoryProvider),
    ref.watch(storageServiceProvider),
  );
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _authRepo;
  final StorageService _storage;

  AuthNotifier(this._authRepo, this._storage) : super(AuthState.initial());

  Future<void> checkAuthSession() async {
    state = AuthState.loading();
    try {
      final token = await _storage.getAccessToken();
      if (token == null || token.isEmpty) {
        state = AuthState.unauthenticated();
        return;
      }

      try {
        final profile = await _authRepo.getProfile();
        await _storage.setProfileCache(jsonEncode(profile.toJson()));
        state = AuthState.authenticated(profile);
      } catch (_) {
        final cached = await _storage.getProfileCache();
        if (cached != null) {
          state = AuthState.authenticated(
            CustomerUser.fromJson(jsonDecode(cached) as Map<String, dynamic>),
          );
        } else {
          await _storage.clearTokens();
          state = AuthState.unauthenticated();
        }
      }
    } catch (_) {
      state = AuthState.unauthenticated();
    }
  }

  Future<bool> login(String phone, String password) async {
    state = AuthState.loading();
    try {
      final user = await _authRepo.login(phone: phone, password: password);
      state = AuthState.authenticated(user);
      return true;
    } catch (e) {
      final message = e is ApiException ? e.message : e.toString();
      state = AuthState.error(message);
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String phone,
    required String password,
    String? email,
  }) async {
    state = AuthState.loading();
    try {
      final user = await _authRepo.register(
        name: name,
        phone: phone,
        password: password,
        email: email,
      );
      state = AuthState.authenticated(user);
      return true;
    } catch (e) {
      final message = e is ApiException ? e.message : e.toString();
      state = AuthState.error(message);
      return false;
    }
  }

  Future<void> refreshProfile() async {
    try {
      final profile = await _authRepo.getProfile();
      await _storage.setProfileCache(jsonEncode(profile.toJson()));
      state = AuthState.authenticated(profile);
    } catch (_) {}
  }

  Future<void> logout() async {
    await _authRepo.logout();
    state = AuthState.unauthenticated();
  }
}
