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
        if (resData is Map) {
          if (resData['message'] != null) {
            message = resData['message'].toString();
          } else if (resData['error'] != null) {
            message = resData['error'].toString();
          }
        } else if (statusCode == 413) {
          message = 'That photo is too large. Try a smaller image.';
        } else if (statusCode == 401 || statusCode == 403) {
          message = 'Invalid email or password.';
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

  @override
  String toString() => message;
}
