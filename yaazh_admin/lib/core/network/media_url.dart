import 'package:yaazh_admin/app/constants.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: AppConstants.defaultBaseUrl,
);

String get apiOrigin =>
    apiBaseUrl.replaceFirst(RegExp(r'/api(?:/v1)?/?$'), '');

String? resolveMediaUrl(String? raw) {
  if (raw == null) return null;
  final value = raw.trim();
  if (value.isEmpty || value == 'null') return null;

  final uri = Uri.tryParse(value);
  if (uri != null && uri.hasScheme && (uri.isScheme('http') || uri.isScheme('https'))) {
    if (uri.host == 'localhost' || uri.host == '127.0.0.1' || uri.host == '10.0.2.2') {
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
