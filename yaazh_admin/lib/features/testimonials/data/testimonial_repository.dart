import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/testimonials/domain/testimonial.dart';

final testimonialRepositoryProvider = Provider<TestimonialRepository>((ref) {
  return TestimonialRepository(ref.watch(apiClientProvider));
});

final testimonialsProvider =
    FutureProvider.autoDispose<List<Testimonial>>((ref) {
  return ref.watch(testimonialRepositoryProvider).list();
});

final testimonialDetailProvider =
    FutureProvider.autoDispose.family<Testimonial, String>((ref, id) {
  return ref.watch(testimonialRepositoryProvider).getById(id);
});

class TestimonialRepository {
  final ApiClient _api;

  TestimonialRepository(this._api);

  Future<List<Testimonial>> list() async {
    final data = await _api.get('/admin/reviews', queryParameters: {
      'page': 1,
      'per_page': 200,
    });
    return asMapList(data).map(Testimonial.fromJson).toList();
  }

  Future<Testimonial> getById(String id) async {
    final data = await _api.get('/admin/reviews/$id');
    return Testimonial.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Testimonial> create(Map<String, dynamic> body) async {
    final data = await _api.post('/admin/reviews', data: body);
    return Testimonial.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Testimonial> update(String id, Map<String, dynamic> body) async {
    final data = await _api.put('/admin/reviews/$id', data: body);
    return Testimonial.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> delete(String id) async {
    await _api.delete('/admin/reviews/$id');
  }

  Future<Testimonial> approve(String id) async {
    final data = await _api.post('/admin/reviews/$id/approve');
    return Testimonial.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Testimonial> reject(String id) async {
    final data = await _api.post('/admin/reviews/$id/reject');
    return Testimonial.fromJson(Map<String, dynamic>.from(data as Map));
  }
}

void invalidateTestimonialCaches(WidgetRef ref, {String? id}) {
  ref.invalidate(testimonialsProvider);
  if (id != null) ref.invalidate(testimonialDetailProvider(id));
}
