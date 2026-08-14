import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http_parser/http_parser.dart';
import 'package:yaazh_admin/core/config/app_config.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/network/firebase_perf_interceptor.dart';
import 'package:yaazh_admin/core/storage/storage_service.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );
  dio.transformer = BackgroundTransformer();

  final storage = ref.watch(storageServiceProvider);
  var isRefreshing = false;

  dio.interceptors.add(FirebasePerfInterceptor());
  dio.interceptors.add(EasyLoadingInterceptor());

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final method = options.method.toUpperCase();
        if (method == 'GET') {
          options.headers.remove('content-type');
          options.headers.remove('Content-Type');
        }
        final token = await storage.getAccessToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) async {
        final status = error.response?.statusCode;
        final path = error.requestOptions.path;
        final isAuthPath = path.contains('/auth/admin/');

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
                baseUrl: AppConfig.apiBaseUrl,
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 15),
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              ),
            );

            final refreshResponse = await refreshDio.post(
              '/auth/admin/refresh',
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
        requestBody: false,
        responseBody: false,
        requestHeader: false,
        responseHeader: false,
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

class EasyLoadingInterceptor extends Interceptor {
  int _active = 0;

  bool _skip(RequestOptions options) =>
      options.extra['silent'] == true || options.method.toUpperCase() == 'GET';

  void _show() {
    _active++;
    if (_active == 1 && !EasyLoading.isShow) {
      EasyLoading.show(status: 'Please wait…');
    }
  }

  void _hide() {
    if (_active > 0) _active--;
    if (_active == 0 && EasyLoading.isShow) {
      EasyLoading.dismiss();
    }
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (!_skip(options)) _show();
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (!_skip(response.requestOptions)) _hide();
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (!_skip(err.requestOptions)) _hide();
    handler.next(err);
  }
}

class ApiClient {
  final Dio _dio;

  ApiClient(this._dio);

  Options _options({bool silent = false}) {
    return Options(extra: {'silent': silent});
  }

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool silent = false,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
        options: _options(silent: silent),
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<dynamic> post(
    String path, {
    dynamic data,
    bool silent = false,
    Duration? receiveTimeout,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: data ?? const <String, dynamic>{},
        options: Options(
          extra: {'silent': silent},
          receiveTimeout: receiveTimeout,
        ),
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<dynamic> put(
    String path, {
    dynamic data,
    bool silent = false,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data ?? const <String, dynamic>{},
        options: _options(silent: silent),
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<dynamic> delete(String path, {bool silent = false}) async {
    try {
      final response = await _dio.delete(
        path,
        data: const <String, dynamic>{},
        options: _options(silent: silent),
      );
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<dynamic> uploadFile(
    String path, {
    required String filePath,
    String fieldName = 'file',
    String? filename,
    String? contentType,
    bool silent = false,
  }) async {
    try {
      final name = filename ?? 'photo.jpg';
      final mime = (contentType ?? 'image/jpeg').split('/');
      final formData = FormData.fromMap({
        fieldName: await MultipartFile.fromFile(
          filePath,
          filename: name,
          contentType: MediaType(mime.first, mime.length > 1 ? mime[1] : 'jpeg'),
        ),
      });
      if (kDebugMode) {
        debugPrint('[PROFILE PHOTO] Upload status: posting $name ($contentType)');
      }
      final response = await _dio.post(
        path,
        data: formData,
        options: Options(
          extra: {'silent': silent},
          contentType: Headers.multipartFormDataContentType,
        ),
      );
      if (kDebugMode) {
        debugPrint('[PROFILE PHOTO] Upload status: ${response.statusCode}');
        debugPrint('[PROFILE PHOTO] API response: ${_safeBody(response.data)}');
      }
      return _processResponse(response);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  String _safeBody(dynamic data) {
    if (data is Map) {
      return data.keys.map((k) => k.toString()).join(',');
    }
    return data.runtimeType.toString();
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
