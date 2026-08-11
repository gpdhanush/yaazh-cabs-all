import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  factory ApiException.fromDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          message: 'Connection timed out. Please check your network.',
        );
      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode;
        final resData = error.response?.data;
        String message = 'An unexpected server error occurred.';
        if (resData is Map<String, dynamic>) {
          if (resData['message'] != null) {
            message = resData['message'].toString();
          } else if (resData['error'] != null) {
            message = resData['error'].toString();
          }
          final fieldHint = _fieldErrorHint(resData['errors']);
          if (fieldHint != null && fieldHint.isNotEmpty) {
            message = '$message $fieldHint';
          }
        }
        return ApiException(
          message: message,
          statusCode: statusCode,
          data: resData,
        );
      case DioExceptionType.cancel:
        return ApiException(message: 'Request was cancelled.');
      case DioExceptionType.connectionError:
        return ApiException(
          message: 'No internet connection. Please verify connectivity.',
        );
      default:
        return ApiException(
          message: error.message ?? 'An unknown error occurred.',
        );
    }
  }

  static String? _fieldErrorHint(dynamic errors) {
    if (errors is! Map) return null;
    final fieldErrors = errors['fieldErrors'];
    if (fieldErrors is Map) {
      final parts = <String>[];
      fieldErrors.forEach((key, value) {
        if (value is List && value.isNotEmpty) {
          parts.add('$key: ${value.first}');
        } else if (value != null) {
          parts.add('$key: $value');
        }
      });
      if (parts.isNotEmpty) return parts.join(' ');
    }
    return null;
  }

  @override
  String toString() => message;
}
