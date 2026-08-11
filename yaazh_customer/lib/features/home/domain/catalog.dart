import 'package:yaazh_customer/core/network/media_url.dart';

class VehicleCategory {
  final String id;
  final String name;
  final String slug;
  final int seatingCapacity;
  final String? luggageCapacity;
  final String? description;
  final String? imageUrl;
  final double oneWayRatePerKm;
  final double roundTripRatePerKm;
  final double driverBatta;

  const VehicleCategory({
    required this.id,
    required this.name,
    required this.slug,
    required this.seatingCapacity,
    this.luggageCapacity,
    this.description,
    this.imageUrl,
    required this.oneWayRatePerKm,
    required this.roundTripRatePerKm,
    required this.driverBatta,
  });

  factory VehicleCategory.fromJson(Map<String, dynamic> json) {
    return VehicleCategory(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      seatingCapacity: int.tryParse(json['seating_capacity']?.toString() ?? '') ?? 4,
      luggageCapacity: json['luggage_capacity']?.toString(),
      description: json['description']?.toString(),
      imageUrl: resolveMediaUrl(json['image_url']?.toString()),
      oneWayRatePerKm: double.tryParse(json['one_way_rate_per_km']?.toString() ?? '') ?? 0,
      roundTripRatePerKm: double.tryParse(json['round_trip_rate_per_km']?.toString() ?? '') ?? 0,
      driverBatta: double.tryParse(json['driver_batta']?.toString() ?? '') ?? 0,
    );
  }
}

class PopularRoute {
  final String id;
  final String slug;
  final String title;
  final String? from;
  final String? to;
  final double distanceKm;
  final int? durationMinutes;
  final double? startingFare;
  final String? imageUrl;
  final String? tag;

  const PopularRoute({
    required this.id,
    required this.slug,
    required this.title,
    this.from,
    this.to,
    required this.distanceKm,
    this.durationMinutes,
    this.startingFare,
    this.imageUrl,
    this.tag,
  });

  factory PopularRoute.fromJson(Map<String, dynamic> json) {
    return PopularRoute(
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      from: json['from']?.toString(),
      to: json['to']?.toString(),
      distanceKm: double.tryParse(json['distance_km']?.toString() ?? '') ?? 0,
      durationMinutes: int.tryParse(json['duration_minutes']?.toString() ?? ''),
      startingFare: double.tryParse(json['starting_fare']?.toString() ?? ''),
      imageUrl: resolveMediaUrl(json['image_url']?.toString()),
      tag: json['tag']?.toString(),
    );
  }
}

class City {
  final String id;
  final String name;
  final bool isAirport;

  const City({required this.id, required this.name, this.isAirport = false});

  factory City.fromJson(Map<String, dynamic> json) {
    return City(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      isAirport: json['is_airport'] == true,
    );
  }
}

class AppConfig {
  final Map<String, String?> settings;
  final Map<String, String?> remoteConfig;

  const AppConfig(this.settings, [this.remoteConfig = const {}]);

  String? get supportPhone =>
      settings['support_phone'] ?? settings['contact_phone'];

  String? get supportPhoneSecondary => settings['support_phone_secondary'];

  String? get businessHours => settings['business_hours'];

  String? get supportWhatsapp =>
      settings['support_whatsapp'] ?? supportPhone;

  bool flag(String key, {bool defaultValue = false}) {
    final raw = remoteConfig[key]?.trim().toLowerCase();
    if (raw == null || raw.isEmpty) return defaultValue;
    return raw == 'true' || raw == '1' || raw == 'yes' || raw == 'on';
  }

  String text(String key, {String defaultValue = ''}) {
    final raw = remoteConfig[key]?.trim();
    if (raw == null || raw.isEmpty) return defaultValue;
    return raw;
  }

  bool get maintenanceMode => flag('maintenance_mode');

  bool get offerBannerEnabled =>
      flag('home_offer_banner_enabled', defaultValue: true);

  String get offerBannerText => text(
        'home_offer_banner_text',
        defaultValue: 'Get special offers on cab bookings.',
      );

  bool get cancellationEnabled =>
      flag('booking_cancellation_enabled', defaultValue: true);

  bool get liveTrackingEnabled =>
      flag('live_tracking_enabled', defaultValue: true);

  bool get whatsappEnabled =>
      flag('support_whatsapp_enabled', defaultValue: true);

  factory AppConfig.fromJson(Map<String, dynamic> json) {
    Map<String, String?> parseMap(dynamic raw) {
      final map = <String, String?>{};
      if (raw is Map) {
        raw.forEach((key, value) {
          map[key.toString()] = value?.toString();
        });
      }
      return map;
    }

    return AppConfig(
      parseMap(json['settings']),
      parseMap(json['remote_config']),
    );
  }
}
