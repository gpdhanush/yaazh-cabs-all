import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/customers/domain/customer.dart';
import 'package:yaazh_admin/features/home/data/dashboard_repository.dart';

final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  return CustomerRepository(ref.watch(apiClientProvider));
});

final customersProvider = FutureProvider.autoDispose<List<Customer>>((ref) {
  return ref.watch(customerRepositoryProvider).list();
});

final customerDetailProvider =
    FutureProvider.autoDispose.family<Customer, String>((ref, id) {
  return ref.watch(customerRepositoryProvider).getById(id);
});

class CustomerRepository {
  final ApiClient _api;

  CustomerRepository(this._api);

  Future<List<Customer>> list({String? query}) async {
    final data = await _api.get('/admin/customers', queryParameters: {
      'page': 1,
      'per_page': 200,
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
    });
    return asMapList(data).map(Customer.fromJson).toList();
  }

  Future<Customer> getById(String id) async {
    final data = await _api.get('/admin/customers/$id');
    return Customer.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Customer> update(String id, Map<String, dynamic> body) async {
    final data = await _api.put('/admin/customers/$id', data: body);
    return Customer.fromJson(Map<String, dynamic>.from(data as Map));
  }
}

void invalidateCustomerCaches(WidgetRef ref, {String? id}) {
  ref.invalidate(customersProvider);
  ref.invalidate(dashboardStatsProvider);
  if (id != null) ref.invalidate(customerDetailProvider(id));
}
