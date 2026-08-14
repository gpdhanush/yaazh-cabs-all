import 'package:dio/dio.dart';
import 'package:latlong2/latlong.dart';

final _osrm = Dio(
  BaseOptions(
    connectTimeout: const Duration(seconds: 8),
    receiveTimeout: const Duration(seconds: 8),
  ),
);

Future<List<LatLng>> fetchDrivingRoute(List<LatLng> waypoints) async {
  if (waypoints.length < 2) return waypoints;
  try {
    final path = waypoints
        .map((p) => '${p.longitude.toStringAsFixed(6)},${p.latitude.toStringAsFixed(6)}')
        .join(';');
    final response = await _osrm.get(
      'https://router.project-osrm.org/route/v1/driving/$path',
      queryParameters: {
        'overview': 'full',
        'geometries': 'geojson',
      },
    );
    final data = response.data;
    if (data is! Map) return waypoints;
    final routes = data['routes'];
    if (routes is! List || routes.isEmpty) return waypoints;
    final geometry = (routes.first as Map)['geometry'];
    final coords = geometry is Map ? geometry['coordinates'] : null;
    if (coords is! List || coords.length < 2) return waypoints;
    return [
      for (final c in coords)
        if (c is List && c.length >= 2)
          LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()),
    ];
  } catch (_) {
    return waypoints;
  }
}
