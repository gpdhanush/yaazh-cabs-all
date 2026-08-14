import 'package:yaazh_admin/core/config/app_config.dart';

String get apiBaseUrl => AppConfig.apiBaseUrl;

String get apiOrigin => AppConfig.appUrl;

bool _isLoopback(String host) {
  return host == 'localhost' ||
      host == '127.0.0.1' ||
      host == '10.0.2.2' ||
      host == '::1';
}

final _loopbackUrl = RegExp(
  r'https?://(?:localhost|127\.0\.0\.1|10\.0\.2\.2|\[::1\])(?::\d+)?(/[^\s]*)?',
  caseSensitive: false,
);

String rewriteLoopbackUrls(String text) {
  final origin = apiOrigin;
  var next = text.replaceAllMapped(_loopbackUrl, (match) {
    final path = match.group(1) ?? '';
    return '$origin$path';
  });
  next = next.replaceAllMapped(
    RegExp(
      r'https?://[^/\s]+/(?:storage/public/invoices|api/v1/public/invoices)/([^\s/?#]+)',
      caseSensitive: false,
    ),
    (match) {
      final file = match.group(1) ?? '';
      return '$origin/api/v1/public/invoices/$file';
    },
  );
  return next;
}

String rewriteWhatsAppShareUrl(String url) {
  final rewritten = rewriteLoopbackUrls(url);
  final uri = Uri.tryParse(rewritten);
  if (uri == null) return rewritten;
  final text = uri.queryParameters['text'];
  if (text == null) return rewritten;
  final next = rewriteLoopbackUrls(text);
  if (next == text) return rewritten;
  return uri.replace(queryParameters: {
    ...uri.queryParameters,
    'text': next,
  }).toString();
}

String? resolveMediaUrl(String? raw) {
  if (raw == null) return null;
  final value = raw.trim();
  if (value.isEmpty || value == 'null') return null;

  final uri = Uri.tryParse(value);
  if (uri != null && uri.hasScheme && (uri.isScheme('http') || uri.isScheme('https'))) {
    if (_isLoopback(uri.host) ||
        uri.host.endsWith('.vercel.app') ||
        uri.path.contains('/storage/public/invoices/')) {
      final path = uri.path.contains('/storage/public/invoices/')
          ? uri.path.replaceFirst('/storage/public/invoices/', '/api/v1/public/invoices/')
          : uri.path;
      return '$apiOrigin$path${uri.hasQuery ? '?${uri.query}' : ''}';
    }
    return value;
  }

  if (value.startsWith('//')) return 'https:$value';
  if (value.startsWith('/')) return '$apiOrigin$value';
  return '$apiOrigin/$value';
}

String? driverPhotoUrl({String? id, String? photoUrl}) {
  final stored = photoUrl?.trim();
  final hasPhoto = stored != null && stored.isNotEmpty && stored != 'null';
  if (!hasPhoto) return null;
  // Prefer the API photo route. Storage files are ephemeral on Render and
  // 404 HTML is what Android ImageDecoder reports as "unimplemented".
  if (id != null && id.isNotEmpty) {
    return resolveMediaUrl('/api/v1/public/drivers/$id/photo');
  }
  return resolveMediaUrl(stored);
}

String? adminPhotoUrl({String? id, String? avatarUrl}) {
  final stored = avatarUrl?.trim();
  final hasPhoto = stored != null && stored.isNotEmpty && stored != 'null';
  if (!hasPhoto) return null;
  if (id != null && id.isNotEmpty) {
    return resolveMediaUrl('/api/v1/public/admins/$id/photo');
  }
  return resolveMediaUrl(stored);
}
