import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:yaazh_customer/app/constants.dart';

class PlaceSuggestion {
  final String id;
  final String label;
  final String? secondary;
  final double? latitude;
  final double? longitude;

  const PlaceSuggestion({
    required this.id,
    required this.label,
    this.secondary,
    this.latitude,
    this.longitude,
  });

  LatLng? get latLng {
    if (latitude == null || longitude == null) return null;
    return LatLng(latitude!, longitude!);
  }
}

const tnPlaces = <PlaceSuggestion>[
  PlaceSuggestion(id: 'udumalpet', label: 'Udumalpet', latitude: 10.5847, longitude: 77.2514),
  PlaceSuggestion(id: 'pollachi', label: 'Pollachi', latitude: 10.6587, longitude: 77.0089),
  PlaceSuggestion(id: 'coimbatore', label: 'Coimbatore', latitude: 11.0168, longitude: 76.9558),
  PlaceSuggestion(id: 'cbe-airport', label: 'Coimbatore Airport', latitude: 11.0297, longitude: 77.0434),
  PlaceSuggestion(id: 'palani', label: 'Palani', latitude: 10.4503, longitude: 77.5209),
  PlaceSuggestion(id: 'ooty', label: 'Ooty', latitude: 11.4064, longitude: 76.6932),
  PlaceSuggestion(id: 'kodaikanal', label: 'Kodaikanal', latitude: 10.2381, longitude: 77.4892),
  PlaceSuggestion(id: 'munnar', label: 'Munnar', latitude: 10.0889, longitude: 77.0595),
  PlaceSuggestion(id: 'madurai', label: 'Madurai', latitude: 9.9252, longitude: 78.1198),
  PlaceSuggestion(id: 'tiruppur', label: 'Tiruppur', latitude: 11.1085, longitude: 77.3411),
  PlaceSuggestion(id: 'theni', label: 'Theni', latitude: 10.0104, longitude: 77.4777),
  PlaceSuggestion(id: 'erode', label: 'Erode', latitude: 11.341, longitude: 77.7172),
  PlaceSuggestion(id: 'chennai', label: 'Chennai', latitude: 13.0827, longitude: 80.2707),
  PlaceSuggestion(id: 'bengaluru', label: 'Bengaluru', latitude: 12.9716, longitude: 77.5946),
];

final placeSearchProvider = Provider<PlaceSearchService>((ref) {
  return PlaceSearchService();
});

class PlaceSearchService {
  final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 12),
      headers: {
        'User-Agent': 'YaazhCabsCustomer/1.0 (${AppConstants.osmUserAgent})',
        'Accept': 'application/json',
      },
    ),
  );

  Future<List<PlaceSuggestion>> search(String query) async {
    final q = query.trim();
    if (q.length < 2) {
      return tnPlaces
          .where((p) => p.label.toLowerCase().contains(q.toLowerCase()))
          .toList();
    }

    final local = tnPlaces
        .where((p) => p.label.toLowerCase().contains(q.toLowerCase()))
        .toList();

    try {
      final response = await _dio.get(
        'https://nominatim.openstreetmap.org/search',
        queryParameters: {
          'q': q,
          'format': 'json',
          'limit': 8,
          'countrycodes': 'in',
          'addressdetails': 0,
        },
      );
      final rows = response.data;
      if (rows is! List) return local;
      final remote = rows.map((row) {
        final map = row as Map;
        return PlaceSuggestion(
          id: map['place_id']?.toString() ?? map['osm_id']?.toString() ?? q,
          label: map['display_name']?.toString().split(',').first.trim() ?? q,
          secondary: map['display_name']?.toString(),
          latitude: double.tryParse(map['lat']?.toString() ?? ''),
          longitude: double.tryParse(map['lon']?.toString() ?? ''),
        );
      }).toList();
      return [...local, ...remote];
    } catch (_) {
      return local.isEmpty
          ? tnPlaces.where((p) => p.label.toLowerCase().contains(q.toLowerCase())).toList()
          : local;
    }
  }

  Future<String> reverseGeocode(LatLng point) async {
    try {
      final response = await _dio.get(
        'https://nominatim.openstreetmap.org/reverse',
        queryParameters: {
          'lat': point.latitude,
          'lon': point.longitude,
          'format': 'json',
        },
      );
      final data = response.data;
      if (data is Map) {
        final name = data['name']?.toString();
        if (name != null && name.isNotEmpty) return name;
        final display = data['display_name']?.toString();
        if (display != null && display.isNotEmpty) {
          return display.split(',').take(2).join(',').trim();
        }
      }
    } catch (_) {}
    return '${point.latitude.toStringAsFixed(4)}, ${point.longitude.toStringAsFixed(4)}';
  }

  Future<List<LatLng>> fetchRoute(LatLng pickup, LatLng drop) async {
    try {
      final response = await _dio.get(
        'https://router.project-osrm.org/route/v1/driving/'
        '${pickup.longitude},${pickup.latitude};'
        '${drop.longitude},${drop.latitude}',
        queryParameters: {
          'overview': 'full',
          'geometries': 'geojson',
        },
      );
      final data = response.data;
      if (data is! Map) return [pickup, drop];
      final routes = data['routes'];
      if (routes is! List || routes.isEmpty) return [pickup, drop];
      final geometry = (routes.first as Map)['geometry'];
      final coords = geometry is Map ? geometry['coordinates'] : null;
      if (coords is! List) return [pickup, drop];
      return coords.map((c) {
        final pair = c as List;
        return LatLng(
          (pair[1] as num).toDouble(),
          (pair[0] as num).toDouble(),
        );
      }).toList();
    } catch (_) {
      return [pickup, drop];
    }
  }
}
