import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/fleet/domain/vehicle.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';

final fleetRepositoryProvider = Provider<FleetRepository>((ref) {
  return FleetRepository(ref.watch(apiClientProvider));
});

final fleetListProvider = FutureProvider.autoDispose<List<FleetVehicle>>((ref) {
  return ref.watch(fleetRepositoryProvider).list();
});

final vehicleCategoriesProvider =
    FutureProvider.autoDispose<List<VehicleCategory>>((ref) {
  return ref.watch(fleetRepositoryProvider).categories();
});

final vehicleDetailProvider =
    FutureProvider.autoDispose.family<FleetVehicle, String>((ref, id) {
  return ref.watch(fleetRepositoryProvider).getById(id);
});

class FleetRepository {
  final ApiClient _api;

  FleetRepository(this._api);

  Future<List<FleetVehicle>> list() async {
    final data = await _api.get('/admin/vehicles');
    return asMapList(data).map(FleetVehicle.fromJson).toList();
  }

  Future<List<VehicleCategory>> categories() async {
    final data = await _api.get('/admin/vehicle-categories');
    return asMapList(data).map(VehicleCategory.fromJson).toList();
  }

  Future<FleetVehicle> getById(String id) async {
    final data = await _api.get('/admin/vehicles/$id');
    return FleetVehicle.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<FleetVehicle> create(Map<String, dynamic> body) async {
    final data = await _api.post('/admin/vehicles', data: body);
    return FleetVehicle.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<FleetVehicle> update(String id, Map<String, dynamic> body) async {
    final data = await _api.put('/admin/vehicles/$id', data: body);
    return FleetVehicle.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> delete(String id) async {
    await _api.delete('/admin/vehicles/$id');
  }
}

void invalidateFleetCaches(WidgetRef ref, {String? id}) {
  ref.invalidate(fleetListProvider);
  ref.invalidate(vehicleCategoriesProvider);
  ref.invalidate(dashboardStatsProvider);
  if (id != null) ref.invalidate(vehicleDetailProvider(id));
}
