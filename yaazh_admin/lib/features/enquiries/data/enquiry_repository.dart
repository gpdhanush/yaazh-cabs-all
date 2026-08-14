import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/enquiries/domain/enquiry.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';

final enquiryRepositoryProvider = Provider<EnquiryRepository>((ref) {
  return EnquiryRepository(ref.watch(apiClientProvider));
});

final enquiriesProvider = FutureProvider.autoDispose<List<Enquiry>>((ref) {
  return ref.watch(enquiryRepositoryProvider).list();
});

final enquiryDetailProvider =
    FutureProvider.autoDispose.family<Enquiry, String>((ref, id) {
  return ref.watch(enquiryRepositoryProvider).getById(id);
});

class EnquiryRepository {
  final ApiClient _api;

  EnquiryRepository(this._api);

  Future<List<Enquiry>> list() async {
    final data = await _api.get('/admin/enquiries', queryParameters: {
      'page': 1,
      'per_page': 200,
    });
    return asMapList(data).map(Enquiry.fromJson).toList();
  }

  Future<Enquiry> getById(String id) async {
    final data = await _api.get('/admin/enquiries/$id');
    return Enquiry.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Enquiry> update(
    String id, {
    String? status,
    String? adminNote,
  }) async {
    final data = await _api.put('/admin/enquiries/$id', data: {
      'status': ?status,
      'admin_note': adminNote,
    });
    return Enquiry.fromJson(Map<String, dynamic>.from(data as Map));
  }
}

void invalidateEnquiryCaches(WidgetRef ref, {String? id}) {
  ref.invalidate(enquiriesProvider);
  ref.invalidate(dashboardStatsProvider);
  if (id != null) ref.invalidate(enquiryDetailProvider(id));
}
