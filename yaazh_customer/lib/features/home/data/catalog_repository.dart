import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/core/network/api_client.dart';
import 'package:yaazh_customer/features/home/domain/catalog.dart';

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  return CatalogRepository(ref.watch(apiClientProvider));
});

final vehicleCategoriesProvider = FutureProvider<List<VehicleCategory>>((ref) {
  return ref.watch(catalogRepositoryProvider).getVehicleCategories();
});

final popularRoutesProvider = FutureProvider<List<PopularRoute>>((ref) {
  return ref.watch(catalogRepositoryProvider).getPopularRoutes();
});

final citiesProvider = FutureProvider<List<City>>((ref) {
  return ref.watch(catalogRepositoryProvider).getCities();
});

final appConfigProvider = FutureProvider<AppConfig>((ref) {
  return ref.watch(catalogRepositoryProvider).getAppConfig();
});

class CatalogRepository {
  final ApiClient _api;

  CatalogRepository(this._api);

  Future<List<VehicleCategory>> getVehicleCategories() async {
    final data = await _api.get('/public/vehicle-categories');
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => VehicleCategory.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<List<PopularRoute>> getPopularRoutes() async {
    final data = await _api.get(
      '/public/routes',
      queryParameters: {'popular': 1, 'per_page': 12},
    );
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => PopularRoute.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<List<City>> getCities() async {
    final data = await _api.get(
      '/public/cities',
      queryParameters: {'per_page': 100},
    );
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => City.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<AppConfig> getAppConfig() async {
    final data = await _api.get('/public/app-config');
    if (data is! Map) return const AppConfig({});
    return AppConfig.fromJson(Map<String, dynamic>.from(data));
  }
}
