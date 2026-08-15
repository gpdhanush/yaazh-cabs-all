import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/config/app_config.dart';
import 'package:yaazh_admin/core/network/session_invalid.dart';
import 'package:yaazh_admin/core/storage/storage_service.dart';

class AuthRefreshInterceptor extends Interceptor {
  final Ref _ref;
  final Dio _dio;
  Future<bool>? _refreshing;

  AuthRefreshInterceptor(this._ref, this._dio);

  StorageService get _storage => _ref.read(storageServiceProvider);

  static bool isAuthPath(String path) {
    return path.contains('/auth/admin/login') ||
        path.contains('/auth/admin/refresh') ||
        path.contains('/auth/admin/logout');
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final method = options.method.toUpperCase();
    if (method == 'GET') {
      options.headers.remove('content-type');
      options.headers.remove('Content-Type');
    }

    if (!isAuthPath(options.path)) {
      final access = await _storage.getAccessToken();
      if (access != null && access.isNotEmpty && _jwtExpired(access)) {
        final ok = await _refreshTokens();
        if (!ok) {
          return handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.badResponse,
              response: Response(
                requestOptions: options,
                statusCode: 401,
                data: {'message': 'Session expired. Please sign in again.'},
              ),
            ),
          );
        }
      }
      final token = await _storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final status = err.response?.statusCode;
    final opts = err.requestOptions;
    if (status != 401 ||
        isAuthPath(opts.path) ||
        opts.extra['auth_retried'] == true) {
      return handler.next(err);
    }

    final ok = await _refreshTokens();
    if (!ok) return handler.next(err);

    final token = await _storage.getAccessToken();
    if (token == null || token.isEmpty) return handler.next(err);

    opts.extra['auth_retried'] = true;
    opts.headers['Authorization'] = 'Bearer $token';
    try {
      final retry = await _dio.fetch(opts);
      return handler.resolve(retry);
    } on DioException catch (retryError) {
      return handler.next(retryError);
    }
  }

  Future<bool> _refreshTokens() {
    final inFlight = _refreshing;
    if (inFlight != null) return inFlight;
    final future = _doRefresh();
    _refreshing = future;
    return future.whenComplete(() {
      if (identical(_refreshing, future)) _refreshing = null;
    });
  }

  Future<bool> _doRefresh() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      await _dropSession();
      return false;
    }

    try {
      final refreshDio = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        ),
      );
      final response = await refreshDio.post(
        '/auth/admin/refresh',
        data: {'refresh_token': refreshToken},
      );
      final tokens = _tokensFrom(response.data);
      final newAccess = tokens['access_token'] ?? '';
      final newRefresh = tokens['refresh_token'] ?? '';
      if (newAccess.isEmpty) {
        await _dropSession();
        return false;
      }
      await _storage.setAccessToken(newAccess);
      if (newRefresh.isNotEmpty) {
        await _storage.setRefreshToken(newRefresh);
      }
      return true;
    } catch (_) {
      await _dropSession();
      return false;
    }
  }

  Future<void> _dropSession() async {
    await _storage.clearTokens();
    _ref.read(authSessionInvalidProvider.notifier).state++;
  }

  static Map<String, String> _tokensFrom(dynamic body) {
    Map<String, dynamic>? map;
    if (body is Map) {
      final data = body['data'];
      map = Map<String, dynamic>.from(data is Map ? data : body);
    }
    if (map == null) return const {};
    return {
      'access_token': map['access_token']?.toString() ?? '',
      'refresh_token': map['refresh_token']?.toString() ?? '',
    };
  }

  static bool _jwtExpired(String token, {Duration skew = const Duration(seconds: 60)}) {
    final parts = token.split('.');
    if (parts.length != 3) return false;
    try {
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      );
      if (payload is! Map || payload['exp'] == null) return false;
      final exp = int.tryParse(payload['exp'].toString());
      if (exp == null) return false;
      final expiry = DateTime.fromMillisecondsSinceEpoch(exp * 1000, isUtc: true);
      return DateTime.now().toUtc().isAfter(expiry.subtract(skew));
    } catch (_) {
      return false;
    }
  }
}
