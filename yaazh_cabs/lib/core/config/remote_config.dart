import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/core/network/api_client.dart';

final remoteConfigServiceProvider = Provider<RemoteConfigService>((ref) {
  return RemoteConfigService(ref.watch(apiClientProvider));
});

final remoteConfigProvider = FutureProvider<RemoteAppConfig>((ref) {
  return ref.watch(remoteConfigServiceProvider).fetch();
});

class RemoteAppConfig {
  final Map<String, String?> settings;
  final Map<String, String?> remoteConfig;

  const RemoteAppConfig({
    this.settings = const {},
    this.remoteConfig = const {},
  });

  String? get supportPhone =>
      settings['support_phone'] ?? settings['contact_phone'];

  String? get supportWhatsapp => settings['support_whatsapp'] ?? supportPhone;

  String? get businessHours => settings['business_hours'];

  bool flag(String key, {bool defaultValue = false}) {
    final raw = remoteConfig[key]?.trim().toLowerCase();
    if (raw == null || raw.isEmpty) return defaultValue;
    return raw == 'true' || raw == '1' || raw == 'yes' || raw == 'on';
  }

  String text(String key, {String defaultValue = ''}) {
    final raw = remoteConfig[key]?.trim();
    if (raw == null || raw.isEmpty) return defaultValue;
    return raw;
  }

  bool get maintenanceMode => flag('maintenance_mode');

  bool get liveTrackingEnabled =>
      flag('live_tracking_enabled', defaultValue: true);

  bool get driverAutoOfferEnabled =>
      flag('driver_auto_offer_enabled', defaultValue: true);

  bool get whatsappEnabled =>
      flag('support_whatsapp_enabled', defaultValue: true);
}

class RemoteConfigService {
  final ApiClient _api;
  RemoteAppConfig _cached = const RemoteAppConfig();
  DateTime? _fetchedAt;

  RemoteConfigService(this._api);

  RemoteAppConfig get cached => _cached;

  Future<RemoteAppConfig> fetch({bool force = false}) async {
    final fetchedAt = _fetchedAt;
    if (!force &&
        fetchedAt != null &&
        DateTime.now().difference(fetchedAt) < const Duration(minutes: 5)) {
      return _cached;
    }
    try {
      final data = await _api.get(
        '/public/app-config',
        queryParameters: {'app': 'driver_app', 'platform': 'android'},
      );
      if (data is Map) {
        _cached = RemoteAppConfig(
          settings: _asStringMap(data['settings']),
          remoteConfig: _asStringMap(data['remote_config']),
        );
        _fetchedAt = DateTime.now();
      }
    } catch (_) {}
    return _cached;
  }

  static Map<String, String?> _asStringMap(dynamic raw) {
    final map = <String, String?>{};
    if (raw is Map) {
      raw.forEach((key, value) {
        map[key.toString()] = value?.toString();
      });
    }
    return map;
  }
}
