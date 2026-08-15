import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/features/gallery/domain/gallery.dart';

final galleryRepositoryProvider = Provider<GalleryRepository>((ref) {
  return GalleryRepository(ref.watch(apiClientProvider));
});

final galleryGroupsProvider =
    FutureProvider.autoDispose<List<GalleryGroup>>((ref) {
  return ref.watch(galleryRepositoryProvider).list();
});

final selectedGalleryGroupIdProvider = StateProvider<String?>((ref) => null);

class GalleryRepository {
  final ApiClient _api;

  GalleryRepository(this._api);

  Future<List<GalleryGroup>> list() async {
    final data = await _api.get('/admin/gallery');
    return asMapList(data).map(GalleryGroup.fromJson).toList();
  }

  Future<GalleryGroup> createGroup({
    required String title,
    String groupType = 'custom',
    int? displayOrder,
  }) async {
    final data = await _api.post('/admin/gallery/groups', data: {
      'title': title,
      'group_type': groupType,
      'display_order': ?displayOrder,
    });
    return GalleryGroup.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> deleteGroup(String id) async {
    await _api.delete('/admin/gallery/groups/$id');
  }

  Future<String> uploadImage(String filePath) async {
    final data = await _api.uploadFile(
      '/admin/uploads',
      filePath: filePath,
      filename: 'gallery.jpg',
      contentType: 'image/jpeg',
      silent: true,
    );
    if (data is Map) {
      final path = data['path']?.toString().trim();
      if (path != null && path.isNotEmpty) return path;
      final url = data['url']?.toString().trim();
      if (url != null && url.isNotEmpty) return url;
    }
    throw Exception('Upload did not return an image path.');
  }

  Future<GalleryImage> addImage({
    required String groupId,
    required String imageUrl,
    String? caption,
    int? displayOrder,
  }) async {
    final data = await _api.post(
      '/admin/gallery/images',
      silent: true,
      data: {
        'group_id': groupId,
        'image_url': imageUrl,
        'caption': caption,
        'display_order': ?displayOrder,
      },
    );
    return GalleryImage.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<GalleryImage> updateImage(String id, {String? caption}) async {
    final data = await _api.put('/admin/gallery/images/$id', data: {
      'caption': caption,
    });
    return GalleryImage.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> deleteImage(String id) async {
    await _api.delete('/admin/gallery/images/$id');
  }
}

void invalidateGalleryCaches(WidgetRef ref) {
  ref.invalidate(galleryGroupsProvider);
}
