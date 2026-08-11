import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/core/network/api_exception.dart';
import 'package:yaazh_cabs/core/storage/storage_service.dart';
import 'package:yaazh_cabs/features/auth/data/auth_repository.dart';
import 'package:yaazh_cabs/features/auth/domain/driver_user.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final DriverUser? user;
  final String? errorMessage;

  AuthState({
    required this.status,
    this.user,
    this.errorMessage,
  });

  factory AuthState.initial() => AuthState(status: AuthStatus.initial);
  factory AuthState.loading() => AuthState(status: AuthStatus.loading);
  factory AuthState.authenticated(DriverUser user) =>
      AuthState(status: AuthStatus.authenticated, user: user);
  factory AuthState.unauthenticated() =>
      AuthState(status: AuthStatus.unauthenticated);
  factory AuthState.error(String message) =>
      AuthState(status: AuthStatus.error, errorMessage: message);
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  final storage = ref.watch(storageServiceProvider);
  return AuthNotifier(authRepo, storage);
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
        await _storage.setDriverProfileCache(jsonEncode(profile.toJson()));
        state = AuthState.authenticated(profile);
      } catch (e) {
        final cached = await _storage.getDriverProfileCache();
        if (cached != null) {
          final user = DriverUser.fromJson(jsonDecode(cached));
          state = AuthState.authenticated(user);
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

  Future<void> updateStatus({
    String? onlineStatus,
    String? availabilityStatus,
  }) async {
    if (state.user == null) return;

    final currentUser = state.user!;
    final updatedUser = currentUser.copyWith(
      onlineStatus: onlineStatus ?? currentUser.onlineStatus,
      availabilityStatus: availabilityStatus ?? currentUser.availabilityStatus,
    );
    state = AuthState.authenticated(updatedUser);
  }

  Future<void> refreshProfile() async {
    try {
      final profile = await _authRepo.getProfile();
      await _storage.setDriverProfileCache(jsonEncode(profile.toJson()));
      state = AuthState.authenticated(profile);
    } catch (_) {}
  }

  Future<void> logout() async {
    await _authRepo.logout();
    state = AuthState.unauthenticated();
  }
}
