import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/storage/storage_service.dart';
import 'package:yaazh_admin/features/auth/data/auth_repository.dart';
import 'package:yaazh_admin/features/auth/domain/admin_user.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final AdminUser? user;
  final String? errorMessage;

  AuthState({
    required this.status,
    this.user,
    this.errorMessage,
  });

  factory AuthState.initial() => AuthState(status: AuthStatus.initial);
  factory AuthState.loading() => AuthState(status: AuthStatus.loading);
  factory AuthState.authenticated(AdminUser user) =>
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

      final cached = await _readCachedUser();
      try {
        final user = await _authRepo.fetchProfile();
        state = AuthState.authenticated(user);
      } catch (e) {
        final status = e is ApiException ? e.statusCode : null;
        if (cached != null && status != 401) {
          state = AuthState.authenticated(cached);
        } else {
          await _storage.clearTokens();
          state = AuthState.unauthenticated();
        }
      }
    } catch (_) {
      state = AuthState.unauthenticated();
    }
  }

  Future<bool> login(String email, String password) async {
    state = AuthState.loading();
    try {
      final user = await _authRepo.login(email: email, password: password);
      state = AuthState.authenticated(user);
      return true;
    } catch (e) {
      final message = e is ApiException ? e.message : e.toString();
      state = AuthState.error(message);
      return false;
    }
  }

  void setUser(AdminUser user) {
    if (state.status == AuthStatus.authenticated) {
      state = AuthState.authenticated(user);
    }
  }

  Future<AdminUser> refreshProfile() async {
    final user = await _authRepo.fetchProfile();
    state = AuthState.authenticated(user);
    return user;
  }

  Future<void> logout() async {
    await _authRepo.logout();
    state = AuthState.unauthenticated();
  }

  Future<AdminUser?> _readCachedUser() async {
    final raw = await _storage.getProfileCache();
    if (raw == null || raw.isEmpty) return null;
    try {
      return AdminUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }
}
