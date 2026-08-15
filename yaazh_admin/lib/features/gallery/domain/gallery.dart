class GalleryImage {
  final String id;
  final String groupId;
  final String imageUrl;
  final String? caption;
  final int displayOrder;
  final bool isActive;

  const GalleryImage({
    required this.id,
    required this.groupId,
    required this.imageUrl,
    this.caption,
    required this.displayOrder,
    required this.isActive,
  });

  factory GalleryImage.fromJson(Map<String, dynamic> json) {
    return GalleryImage(
      id: json['id']?.toString() ?? '',
      groupId: json['group_id']?.toString() ?? '',
      imageUrl: json['image_url']?.toString() ?? '',
      caption: json['caption']?.toString(),
      displayOrder: int.tryParse(json['display_order']?.toString() ?? '') ?? 0,
      isActive: json['is_active'] != false,
    );
  }
}

class GalleryGroup {
  final String id;
  final String slug;
  final String title;
  final String groupType;
  final int displayOrder;
  final bool isActive;
  final List<GalleryImage> images;

  const GalleryGroup({
    required this.id,
    required this.slug,
    required this.title,
    required this.groupType,
    required this.displayOrder,
    required this.isActive,
    required this.images,
  });

  factory GalleryGroup.fromJson(Map<String, dynamic> json) {
    final images = (json['images'] is List)
        ? (json['images'] as List)
            .whereType<Map>()
            .map((e) => GalleryImage.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : const <GalleryImage>[];
    return GalleryGroup(
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      groupType: json['group_type']?.toString() ?? 'custom',
      displayOrder: int.tryParse(json['display_order']?.toString() ?? '') ?? 0,
      isActive: json['is_active'] != false,
      images: images,
    );
  }

  String get typeLabel => galleryTypeLabel(groupType);
}

const galleryGroupTypes = <({String value, String label})>[
  (value: 'cars_outside', label: 'Cars — Outside'),
  (value: 'cars_inside', label: 'Cars — Inside'),
  (value: 'destinations', label: 'Destinations'),
  (value: 'custom', label: 'Custom'),
];

String galleryTypeLabel(String value) {
  for (final t in galleryGroupTypes) {
    if (t.value == value) return t.label;
  }
  return value.replaceAll('_', ' ');
}
