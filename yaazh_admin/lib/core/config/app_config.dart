import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:yaazh_admin/app/constants.dart';

class AppConfig {
  static String apiBaseUrl = AppConstants.defaultBaseUrl;
  static String appUrl = _originFrom(AppConstants.defaultBaseUrl);

  static Future<void> load() async {
    try {
      await dotenv.load(
        fileName: '.env.example',
        overrideWithFiles: const ['.env'],
        isOptional: true,
      );
    } catch (_) {}

    const dartApi = String.fromEnvironment('API_BASE_URL');
    const dartApp = String.fromEnvironment('APP_URL');

    apiBaseUrl = _firstNonEmpty([
      dartApi,
      _env('API_BASE_URL'),
      AppConstants.defaultBaseUrl,
    ]);

    appUrl = _trimSlash(
      _firstNonEmpty([
        dartApp,
        _env('APP_URL'),
        _originFrom(apiBaseUrl),
      ]),
    );
  }

  static String? _env(String key) {
    if (!dotenv.isInitialized) return null;
    return dotenv.env[key];
  }

  static String _firstNonEmpty(List<String?> values) {
    for (final value in values) {
      final trimmed = value?.trim() ?? '';
      if (trimmed.isNotEmpty) return trimmed;
    }
    return AppConstants.defaultBaseUrl;
  }

  static String _originFrom(String api) {
    return api.replaceFirst(RegExp(r'/api(?:/v1)?/?$'), '');
  }

  static String _trimSlash(String value) {
    return value.replaceFirst(RegExp(r'/+$'), '');
  }
}
