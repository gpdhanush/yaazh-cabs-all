import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/tariffs/domain/tariff.dart';

final tariffRepositoryProvider = Provider<TariffRepository>((ref) {
  return TariffRepository(ref.watch(apiClientProvider));
});

final tariffsProvider = FutureProvider.autoDispose<List<TariffPlan>>((ref) {
  return ref.watch(tariffRepositoryProvider).list();
});

final tariffDetailProvider =
    FutureProvider.autoDispose.family<TariffPlan, String>((ref, id) {
  return ref.watch(tariffRepositoryProvider).getById(id);
});

final tariffRoutesProvider =
    FutureProvider.autoDispose<List<TariffRouteOption>>((ref) {
  return ref.watch(tariffRepositoryProvider).listRoutes();
});

class TariffRepository {
  final ApiClient _api;

  TariffRepository(this._api);

  Future<List<TariffPlan>> list() async {
    final data = await _api.get('/admin/tariffs', queryParameters: {
      'page': 1,
      'per_page': 500,
    });
    return asMapList(data).map(TariffPlan.fromJson).toList();
  }

  Future<TariffPlan> getById(String id) async {
    final data = await _api.get('/admin/tariffs/$id');
    return TariffPlan.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<TariffPlan> create(Map<String, dynamic> body) async {
    final data = await _api.post('/admin/tariffs', data: body);
    return TariffPlan.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<TariffPlan> update(String id, Map<String, dynamic> body) async {
    final data = await _api.put('/admin/tariffs/$id', data: body);
    return TariffPlan.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> delete(String id) async {
    await _api.delete('/admin/tariffs/$id');
  }

  Future<List<TariffRouteOption>> listRoutes() async {
    final data = await _api.get('/admin/routes', queryParameters: {
      'page': 1,
      'per_page': 500,
    });
    return asMapList(data).map(TariffRouteOption.fromJson).toList();
  }
}

void invalidateTariffCaches(WidgetRef ref, {String? id}) {
  ref.invalidate(tariffsProvider);
  ref.invalidate(tariffRoutesProvider);
  if (id != null) ref.invalidate(tariffDetailProvider(id));
}
