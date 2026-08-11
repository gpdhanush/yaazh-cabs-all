import 'package:yaazh_customer/app/constants.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: AppConstants.defaultBaseUrl,
);

String get apiOrigin =>
    apiBaseUrl.replaceFirst(RegExp(r'/api(?:/v1)?/?$'), '');

/// Turns stored image paths into a loadable URL.
/// Admin may save `/storage/public/...` or a full URL (sometimes localhost).
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
