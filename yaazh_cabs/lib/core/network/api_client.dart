import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/network/api_exception.dart';
import 'package:yaazh_cabs/core/network/firebase_perf_interceptor.dart';
import 'package:yaazh_cabs/core/storage/storage_service.dart';

final dioProvider = Provider<Dio>((ref) {
  const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: AppConstants.defaultBaseUrl,
  );

  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  final storage = ref.watch(storageServiceProvider);
  var isRefreshing = false;

  dio.interceptors.add(FirebasePerfInterceptor());

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.getAccessToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) async {
        final status = error.response?.statusCode;
        final path = error.requestOptions.path;
        final isAuthPath = path.contains('/auth/driver/');

        if (status == 401 && !isAuthPath && !isRefreshing) {
          isRefreshing = true;
          try {
            final refreshToken = await storage.getRefreshToken();
            if (refreshToken == null || refreshToken.isEmpty) {
              await storage.clearTokens();
              return handler.next(error);
            }

            final refreshDio = Dio(
              BaseOptions(
                baseUrl: baseUrl,
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 15),
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              ),
            );

            final refreshResponse = await refreshDio.post(
              '/auth/driver/refresh',
              data: {'refresh_token': refreshToken},
            );

            final body = refreshResponse.data;
            final data = body is Map && body['data'] is Map
                ? body['data'] as Map
                : body is Map
                    ? body
                    : null;

            final newAccess = data?['access_token']?.toString();
            final newRefresh = data?['refresh_token']?.toString();

            if (newAccess == null || newAccess.isEmpty) {
              await storage.clearTokens();
              return handler.next(error);
            }

            await storage.setAccessToken(newAccess);
            if (newRefresh != null && newRefresh.isNotEmpty) {
              await storage.setRefreshToken(newRefresh);
            }

            final opts = error.requestOptions;
            opts.headers['Authorization'] = 'Bearer $newAccess';
            final clone = await dio.fetch(opts);
            return handler.resolve(clone);
          } catch (_) {
            await storage.clearTokens();
            return handler.next(error);
          } finally {
            isRefreshing = false;
          }
        }

        return handler.next(error);
      },
    ),
  );

  if (kDebugMode) {
    dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        // Avoid dumping Authorization headers with tokens.
        requestHeader: false,
        logPrint: (obj) {
          final text = obj.toString();
          if (text.contains('Bearer ')) return;
          debugPrint('[DIO] $text');
        },
      ),
    );
  }

  return dio;
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(dioProvider));
});

class ApiClient {
  final Dio _dio;

  ApiClient(this._dio);

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<dynamic> post(String path, {dynamic data}) async {
    try {
      // Fastify rejects Content-Type: application/json with an empty body.
      final response = await _dio.post(path, data: data ?? const <String, dynamic>{});
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<dynamic> put(String path, {dynamic data}) async {
    try {
      final response = await _dio.put(path, data: data ?? const <String, dynamic>{});
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Multipart file upload. Do not send JSON Content-Type.
  Future<dynamic> uploadFile(
    String path, {
    required String filePath,
    String fieldName = 'file',
    String? filename,
    Map<String, dynamic>? fields,
  }) async {
    try {
      final formData = FormData.fromMap({
        ...?fields,
        fieldName: await MultipartFile.fromFile(
          filePath,
          filename: filename ?? filePath.split(RegExp(r'[/\\]')).last,
        ),
      });
      final response = await _dio.post(
        path,
        data: formData,
        options: Options(
          // Clears BaseOptions JSON content-type so Dio can set multipart boundary.
          contentType: Headers.multipartFormDataContentType,
        ),
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  dynamic _processResponse(Response response) {
    final body = response.data;
    if (body is Map<String, dynamic>) {
      if (body.containsKey('data')) {
        return body['data'];
      }
      return body;
    }
    return body;
  }
}
