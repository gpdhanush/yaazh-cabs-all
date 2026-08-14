import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/settings/domain/app_setting.dart';

final webSettingsRepositoryProvider = Provider<WebSettingsRepository>((ref) {
  return WebSettingsRepository(ref.watch(apiClientProvider));
});

final webSettingsProvider =
    FutureProvider.autoDispose<List<AppSetting>>((ref) {
  return ref.watch(webSettingsRepositoryProvider).list();
});

class WebSettingsRepository {
  final ApiClient _api;

  WebSettingsRepository(this._api);

  Future<List<AppSetting>> list() async {
    final data = await _api.get('/admin/settings');
    return asMapList(data).map(AppSetting.fromJson).toList();
  }

  Future<void> update(String key, String value) async {
    await _api.put('/admin/settings/$key', data: {'value': value});
  }
}

void invalidateWebSettings(WidgetRef ref) {
  ref.invalidate(webSettingsProvider);
}
