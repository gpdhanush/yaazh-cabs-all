import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_performance/firebase_performance.dart';
import 'package:flutter/foundation.dart';

class FirebasePerfInterceptor extends Interceptor {
  final _metrics = <RequestOptions, HttpMetric>{};

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (Firebase.apps.isEmpty || kDebugMode) {
      return handler.next(options);
    }

    try {
      final url = options.uri.toString();
      final metric = FirebasePerformance.instance.newHttpMetric(
        url,
        _method(options.method),
      );
      _metrics[options] = metric;
      metric.start();
    } catch (_) {}
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    _finish(response.requestOptions, response.statusCode);
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _finish(err.requestOptions, err.response?.statusCode);
    handler.next(err);
  }

  Future<void> _finish(RequestOptions options, int? statusCode) async {
    final metric = _metrics.remove(options);
    if (metric == null) return;
    try {
      if (statusCode != null) metric.httpResponseCode = statusCode;
      await metric.stop();
    } catch (_) {}
  }

  HttpMethod _method(String method) {
    switch (method.toUpperCase()) {
      case 'GET':
        return HttpMethod.Get;
      case 'POST':
        return HttpMethod.Post;
      case 'PUT':
        return HttpMethod.Put;
      case 'DELETE':
        return HttpMethod.Delete;
      case 'PATCH':
        return HttpMethod.Patch;
      default:
        return HttpMethod.Get;
    }
  }
}
