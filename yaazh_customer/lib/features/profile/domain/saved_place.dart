class SavedPlace {
  final String id;
  final String label;
  final String title;
  final String address;
  final double? latitude;
  final double? longitude;

  const SavedPlace({
    required this.id,
    required this.label,
    required this.title,
    required this.address,
    this.latitude,
    this.longitude,
  });

  factory SavedPlace.fromJson(Map<String, dynamic> json) {
    return SavedPlace(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? 'other',
      title: json['title']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      latitude: double.tryParse(json['latitude']?.toString() ?? ''),
      longitude: double.tryParse(json['longitude']?.toString() ?? ''),
    );
  }
}
