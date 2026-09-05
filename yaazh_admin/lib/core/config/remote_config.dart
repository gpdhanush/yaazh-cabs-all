import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/network/api_client.dart';

final adminRemoteConfigProvider = FutureProvider<AdminRemoteConfig>((ref) {
  return ref.watch(adminRemoteConfigServiceProvider).fetch();
});

final adminRemoteConfigServiceProvider = Provider<AdminRemoteConfigService>((
  ref,
) {
  return AdminRemoteConfigService(ref.watch(apiClientProvider));
});

class AdminRemoteConfig {
  final Map<String, String?> values;

  const AdminRemoteConfig(this.values);

  bool flag(String key) {
    final raw = values[key]?.trim().toLowerCase();
    return raw == 'true' || raw == '1' || raw == 'yes' || raw == 'on';
  }

  bool get maintenanceMode => flag('maintenance_mode');
}

class AdminRemoteConfigService {
  final ApiClient _api;

  AdminRemoteConfigService(this._api);

  Future<AdminRemoteConfig> fetch() async {
    final data = await _api.get(
      '/public/app-config',
      queryParameters: {'app': 'admin_web', 'platform': 'android'},
      silent: true,
    );
    if (data is! Map) return const AdminRemoteConfig({});
    final raw = data['remote_config'];
    final values = <String, String?>{};
    if (raw is Map) {
      raw.forEach((key, value) => values[key.toString()] = value?.toString());
    }
    return AdminRemoteConfig(values);
  }
}
