import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/bookings/data/booking_repository.dart';
import 'package:yaazh_admin/features/drivers/domain/driver.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';

final driverRepositoryProvider = Provider<DriverRepository>((ref) {
  return DriverRepository(ref.watch(apiClientProvider));
});

final driversListProvider = FutureProvider.autoDispose<List<Driver>>((ref) {
  return ref.watch(driverRepositoryProvider).list();
});

final driverDetailProvider =
    FutureProvider.autoDispose.family<Driver, String>((ref, id) {
  return ref.watch(driverRepositoryProvider).getById(id);
});

class DriverRepository {
  final ApiClient _api;

  DriverRepository(this._api);

  Future<List<Driver>> list({String? query}) async {
    final data = await _api.get('/admin/drivers', queryParameters: {
      'page': 1,
      'per_page': 200,
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
    });
    return asMapList(data).map(Driver.fromJson).toList();
  }

  Future<Driver> getById(String id) async {
    final data = await _api.get('/admin/drivers/$id');
    return Driver.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Driver> create(Map<String, dynamic> body) async {
    final data = await _api.post('/admin/drivers', data: body);
    return Driver.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Driver> update(String id, Map<String, dynamic> body) async {
    final data = await _api.put('/admin/drivers/$id', data: body);
    return Driver.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> delete(String id) async {
    await _api.delete('/admin/drivers/$id');
  }

  Future<Driver> approve(String id) async {
    final data = await _api.post('/admin/drivers/$id/approve');
    return Driver.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Driver> reject(String id) async {
    final data = await _api.post('/admin/drivers/$id/reject');
    return Driver.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Driver> block(String id) async {
    final data = await _api.post('/admin/drivers/$id/block');
    return Driver.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Driver> uploadPhoto(String id, String filePath) async {
    final data = await _api.uploadFile('/admin/drivers/$id/photo', filePath: filePath);
    return Driver.fromJson(Map<String, dynamic>.from(data as Map));
  }
}

void invalidateDriverCaches(WidgetRef ref, {String? id}) {
  ref.invalidate(driversListProvider);
  ref.invalidate(driversProvider);
  ref.invalidate(dashboardStatsProvider);
  if (id != null) ref.invalidate(driverDetailProvider(id));
}
