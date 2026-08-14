import 'package:yaazh_admin/core/config/app_config.dart';

String get apiBaseUrl => AppConfig.apiBaseUrl;

String get apiOrigin => AppConfig.appUrl;

bool _isLoopback(String host) {
  return host == 'localhost' ||
      host == '127.0.0.1' ||
      host == '10.0.2.2' ||
      host == '::1';
}

String? resolveMediaUrl(String? raw) {
  if (raw == null) return null;
  final value = raw.trim();
  if (value.isEmpty || value == 'null') return null;

  final uri = Uri.tryParse(value);
  if (uri != null && uri.hasScheme && (uri.isScheme('http') || uri.isScheme('https'))) {
    if (_isLoopback(uri.host)) {
      return '$apiOrigin${uri.path}${uri.hasQuery ? '?${uri.query}' : ''}';
    }
    return value;
  }

  if (value.startsWith('//')) return 'https:$value';
  if (value.startsWith('/')) return '$apiOrigin$value';
  return '$apiOrigin/$value';
}

String? driverPhotoUrl({String? id, String? photoUrl}) {
  if (photoUrl != null && photoUrl.trim().isNotEmpty) {
    return resolveMediaUrl(photoUrl);
  }
  if (id != null && id.isNotEmpty) {
    return resolveMediaUrl('/api/v1/public/drivers/$id/photo');
  }
  return null;
}
