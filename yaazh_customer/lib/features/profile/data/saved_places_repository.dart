import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/core/network/api_client.dart';
import 'package:yaazh_customer/features/profile/domain/saved_place.dart';

final savedPlacesRepositoryProvider = Provider<SavedPlacesRepository>((ref) {
  return SavedPlacesRepository(ref.watch(apiClientProvider));
});

final savedPlacesProvider = FutureProvider<List<SavedPlace>>((ref) {
  return ref.watch(savedPlacesRepositoryProvider).list();
});

class SavedPlacesRepository {
  final ApiClient _api;

  SavedPlacesRepository(this._api);

  Future<List<SavedPlace>> list() async {
    final data = await _api.get('/customer/saved-places');
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => SavedPlace.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> create({
    required String title,
    required String address,
    String label = 'other',
    double? latitude,
    double? longitude,
  }) async {
    await _api.post('/customer/saved-places', data: {
      'label': label,
      'title': title,
      'address': address,
      'latitude': ?latitude,
      'longitude': ?longitude,
    });
  }

  Future<void> delete(String id) async {
    await _api.delete('/customer/saved-places/$id');
  }
}
