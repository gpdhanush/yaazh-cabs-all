import 'package:yaazh_admin/core/config/app_config.dart';

String get apiBaseUrl => AppConfig.apiBaseUrl;

String get apiOrigin => AppConfig.appUrl;

String get backendOrigin {
  final fromApi = apiBaseUrl.replaceFirst(RegExp(r'/api(?:/v1)?/?$'), '');
  if (fromApi.isNotEmpty) return fromApi.replaceFirst(RegExp(r'/+$'), '');
  return apiOrigin;
}

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

final _invoiceShareUrl = RegExp(
  r'https?://[^/\s]+/(?:storage/public/invoices|api/v1/public/invoices)/([^\s/?#]+)',
  caseSensitive: false,
);

String rewriteLoopbackUrls(String text) {
  var next = text.replaceAllMapped(_loopbackUrl, (match) {
    final path = match.group(1) ?? '';
    return '$backendOrigin$path';
  });
  next = next.replaceAllMapped(_invoiceShareUrl, (match) {
    final file = match.group(1) ?? '';
    return '$backendOrigin/api/v1/public/invoices/$file';
  });
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

  final absolute = Uri.tryParse(value);
  final path = () {
    if (absolute != null &&
        absolute.hasScheme &&
        (absolute.isScheme('http') || absolute.isScheme('https'))) {
      return absolute.path;
    }
    if (value.startsWith('/')) return value.split('?').first;
    return '/$value';
  }();
  final query = () {
    if (absolute != null &&
        absolute.hasScheme &&
        (absolute.isScheme('http') || absolute.isScheme('https')) &&
        absolute.hasQuery) {
      return '?${absolute.query}';
    }
    final q = value.indexOf('?');
    if (q >= 0 && (absolute == null || !absolute.hasScheme)) {
      return value.substring(q);
    }
    return '';
  }();

  final invoice = RegExp(
    r'/(?:storage/public/invoices|api/v1/public/invoices)/([^/?#]+)',
    caseSensitive: false,
  ).firstMatch(path);
  if (invoice != null) {
    return '$backendOrigin/api/v1/public/invoices/${invoice.group(1)}$query';
  }
  final stored = RegExp(r'/storage/public/(.+)', caseSensitive: false).firstMatch(path);
  if (stored != null) {
    return '$backendOrigin/api/v1/public/media/${stored.group(1)}$query';
  }

  if (absolute != null &&
      absolute.hasScheme &&
      (absolute.isScheme('http') || absolute.isScheme('https'))) {
    if (_isLoopback(absolute.host) || absolute.host.endsWith('vercel.app')) {
      return '$backendOrigin${absolute.path}${absolute.hasQuery ? '?${absolute.query}' : ''}';
    }
    return value;
  }

  if (value.startsWith('//')) return 'https:$value';
  if (value.startsWith('/')) return '$backendOrigin$value';
  return '$backendOrigin/$value';
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
