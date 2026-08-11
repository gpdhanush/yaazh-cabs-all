import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/location/location_service.dart';
import 'package:yaazh_customer/core/location/place_search.dart';
import 'package:yaazh_customer/core/network/api_exception.dart';
import 'package:yaazh_customer/features/booking/data/booking_repository.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';
import 'package:yaazh_customer/features/home/data/catalog_repository.dart';
import 'package:yaazh_customer/features/home/domain/catalog.dart';
import 'package:yaazh_customer/features/profile/data/saved_places_repository.dart';

const _tripTypes = <(String, String)>[
  ('one_way', 'One way'),
  ('round_trip', 'Round trip'),
  ('airport', 'Airport'),
  ('outstation', 'Outstation'),
  ('local_rental', 'Local'),
];

class BookPage extends ConsumerStatefulWidget {
  const BookPage({super.key});

  @override
  ConsumerState<BookPage> createState() => _BookPageState();
}

class _BookPageState extends ConsumerState<BookPage> {
  final _mapController = MapController();
  PlaceSuggestion? _pickup;
  PlaceSuggestion? _drop;
  String _tripType = 'one_way';
  String? _selectedVehicleId;
  List<LatLng> _polyline = const [];
  Map<String, FareQuote> _quotes = {};
  bool _quoting = false;
  DateTime _pickupAt = DateTime.now().add(const Duration(minutes: 30));

  @override
  void initState() {
    super.initState();
    Future.microtask(_initPickup);
  }

  Future<void> _initPickup() async {
    final loc = await ref.read(locationServiceProvider).getCurrentLatLng();
    if (!mounted) return;
    if (loc == null) {
      setState(() {
        _pickup = const PlaceSuggestion(
          id: 'udumalpet',
          label: 'Udumalpet',
          latitude: 10.5847,
          longitude: 77.2514,
        );
      });
      return;
    }
    final label = await ref.read(placeSearchProvider).reverseGeocode(loc);
    if (!mounted) return;
    setState(() {
      _pickup = PlaceSuggestion(
        id: 'current',
        label: label,
        latitude: loc.latitude,
        longitude: loc.longitude,
      );
    });
    _mapController.move(loc, 14);
  }

  Future<void> _pickPlace({required bool isPickup}) async {
    final selected = await showModalBottomSheet<PlaceSuggestion>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _PlaceSearchSheet(),
    );
    if (selected == null || selected.latLng == null) return;
    setState(() {
      if (isPickup) {
        _pickup = selected;
      } else {
        _drop = selected;
      }
    });
    await _refreshRoute();
  }

  Future<void> _refreshRoute() async {
    final pickup = _pickup?.latLng;
    final drop = _drop?.latLng;
    if (pickup == null || drop == null) return;
    final line = await ref.read(placeSearchProvider).fetchRoute(pickup, drop);
    if (!mounted) return;
    setState(() => _polyline = line);
    _fitBounds(pickup, drop);
    await _refreshQuotes();
  }

  void _fitBounds(LatLng a, LatLng b) {
    final bounds = LatLngBounds.fromPoints([a, b]);
    _mapController.fitCamera(
      CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(72)),
    );
  }

  Future<void> _refreshQuotes() async {
    final pickup = _pickup;
    final drop = _drop;
    final fleet = ref.read(vehicleCategoriesProvider).asData?.value ?? [];
    if (pickup?.latLng == null || drop?.latLng == null || fleet.isEmpty) return;
    setState(() => _quoting = true);
    final next = <String, FareQuote>{};
    try {
      for (final cat in fleet) {
        final quote = await ref.read(bookingRepositoryProvider).estimateFare(
              vehicleCategoryId: cat.id,
              tripType: _tripType,
              pickupLat: pickup!.latitude!,
              pickupLng: pickup.longitude!,
              dropLat: drop!.latitude!,
              dropLng: drop.longitude!,
            );
        next[cat.id] = quote;
      }
      if (!mounted) return;
      setState(() {
        _quotes = next;
        _selectedVehicleId ??= fleet.first.id;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : e.toString())),
      );
    } finally {
      if (mounted) setState(() => _quoting = false);
    }
  }

  Future<void> _continue() async {
    final pickup = _pickup;
    final drop = _drop;
    final fleet = ref.read(vehicleCategoriesProvider).asData?.value ?? [];
    final vehicle = fleet.cast<VehicleCategory?>().firstWhere(
          (c) => c?.id == _selectedVehicleId,
          orElse: () => fleet.isEmpty ? null : fleet.first,
        );
    if (pickup?.latLng == null || drop?.latLng == null || vehicle == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose pickup, drop, and a vehicle')),
      );
      return;
    }
    final quote = _quotes[vehicle.id];
    final draft = BookingDraft(
      pickupLabel: pickup!.label,
      dropLabel: drop!.label,
      pickupLat: pickup.latitude!,
      pickupLng: pickup.longitude!,
      dropLat: drop.latitude!,
      dropLng: drop.longitude!,
      tripType: _tripType,
      vehicleCategoryId: vehicle.id,
      vehicleName: vehicle.name,
      pickupAt: _pickupAt,
      quote: quote,
    );
    context.push('/book/confirm', extra: draft);
  }

  @override
  Widget build(BuildContext context) {
    final fleet = ref.watch(vehicleCategoriesProvider);
    final pickupPoint = _pickup?.latLng;
    final dropPoint = _drop?.latLng;

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: pickupPoint ?? AppConstants.defaultCenter,
              initialZoom: 13,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: AppConstants.osmUserAgent,
              ),
              if (_polyline.length >= 2)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _polyline,
                      color: AppConstants.accentColor,
                      strokeWidth: 4.5,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  if (pickupPoint != null)
                    Marker(
                      point: pickupPoint,
                      width: 40,
                      height: 40,
                      child: const Icon(Icons.trip_origin_rounded, color: Color(0xFF16A34A), size: 30),
                    ),
                  if (dropPoint != null)
                    Marker(
                      point: dropPoint,
                      width: 40,
                      height: 40,
                      child: const Icon(Icons.location_on_rounded, color: AppConstants.errorColor, size: 34),
                    ),
                ],
              ),
            ],
          ),
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: FloatingActionButton.small(
                  heroTag: 'locate',
                  backgroundColor: Colors.white,
                  onPressed: _initPickup,
                  child: const Icon(Icons.my_location_rounded, color: AppConstants.primaryColor),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: _BookingSheet(
              pickup: _pickup,
              drop: _drop,
              tripType: _tripType,
              pickupAt: _pickupAt,
              quoting: _quoting,
              quotes: _quotes,
              selectedVehicleId: _selectedVehicleId,
              fleet: fleet,
              onPickPickup: () => _pickPlace(isPickup: true),
              onPickDrop: () => _pickPlace(isPickup: false),
              onTripType: (type) {
                setState(() => _tripType = type);
                _refreshQuotes();
              },
              onVehicle: (id) => setState(() => _selectedVehicleId = id),
              onWhen: () async {
                final date = await showDatePicker(
                  context: context,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 60)),
                  initialDate: _pickupAt,
                );
                if (date == null || !context.mounted) return;
                final time = await showTimePicker(
                  context: context,
                  initialTime: TimeOfDay.fromDateTime(_pickupAt),
                );
                if (time == null) return;
                setState(() {
                  _pickupAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
                });
              },
              onContinue: _continue,
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingSheet extends StatelessWidget {
  final PlaceSuggestion? pickup;
  final PlaceSuggestion? drop;
  final String tripType;
  final DateTime pickupAt;
  final bool quoting;
  final Map<String, FareQuote> quotes;
  final String? selectedVehicleId;
  final AsyncValue<List<VehicleCategory>> fleet;
  final VoidCallback onPickPickup;
  final VoidCallback onPickDrop;
  final ValueChanged<String> onTripType;
  final ValueChanged<String> onVehicle;
  final VoidCallback onWhen;
  final VoidCallback onContinue;

  const _BookingSheet({
    required this.pickup,
    required this.drop,
    required this.tripType,
    required this.pickupAt,
    required this.quoting,
    required this.quotes,
    required this.selectedVehicleId,
    required this.fleet,
    required this.onPickPickup,
    required this.onPickDrop,
    required this.onTripType,
    required this.onVehicle,
    required this.onWhen,
    required this.onContinue,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.58),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 24, offset: const Offset(0, -8)),
        ],
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
        shrinkWrap: true,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _PlaceTile(
            icon: Icons.trip_origin_rounded,
            color: const Color(0xFF16A34A),
            label: pickup?.label ?? 'Set pickup',
            onTap: onPickPickup,
          ),
          const SizedBox(height: 8),
          _PlaceTile(
            icon: Icons.location_on_rounded,
            color: AppConstants.errorColor,
            label: drop?.label ?? 'Set drop',
            onTap: onPickDrop,
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final type in _tripTypes) ...[
                  ChoiceChip(
                    label: Text(type.$2),
                    selected: tripType == type.$1,
                    onSelected: (_) => onTripType(type.$1),
                    selectedColor: AppConstants.accentColor,
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: tripType == type.$1 ? Colors.black : null,
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: onWhen,
            icon: const Icon(Icons.schedule_rounded),
            label: Text(
              'Pickup ${pickupAt.day}/${pickupAt.month} · '
              '${pickupAt.hour.toString().padLeft(2, '0')}:${pickupAt.minute.toString().padLeft(2, '0')}',
            ),
          ),
          const SizedBox(height: 4),
          fleet.when(
            data: (rows) => SizedBox(
              height: 108,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: rows.length,
                separatorBuilder: (_, _) => const SizedBox(width: 10),
                itemBuilder: (context, i) {
                  final cat = rows[i];
                  final selected = cat.id == selectedVehicleId;
                  final quote = quotes[cat.id];
                  return InkWell(
                    onTap: () => onVehicle(cat.id),
                    borderRadius: BorderRadius.circular(14),
                    child: Ink(
                      width: 150,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: selected ? AppConstants.accentColor : AppConstants.borderLight,
                          width: selected ? 2 : 1,
                        ),
                        color: selected
                            ? AppConstants.accentColor.withValues(alpha: 0.08)
                            : Theme.of(context).cardColor,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(cat.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                          Text('${cat.seatingCapacity} seats', style: const TextStyle(fontSize: 12, color: AppConstants.textSecondaryLight)),
                          const Spacer(),
                          Text(
                            quote != null ? '₹${quote.estimatedTotal.toStringAsFixed(0)}' : (quoting ? '…' : 'Quote'),
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            loading: () => const LinearProgressIndicator(color: AppConstants.accentColor),
            error: (e, _) => Text(e.toString()),
          ),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: onContinue,
            child: const Text('CONTINUE'),
          ),
        ],
      ),
    );
  }
}

class _PlaceTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  const _PlaceTile({
    required this.icon,
    required this.color,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Ink(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: AppConstants.borderLight),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppConstants.textSecondaryLight),
          ],
        ),
      ),
    );
  }
}

class _PlaceSearchSheet extends ConsumerStatefulWidget {
  const _PlaceSearchSheet();

  @override
  ConsumerState<_PlaceSearchSheet> createState() => _PlaceSearchSheetState();
}

class _PlaceSearchSheetState extends ConsumerState<_PlaceSearchSheet> {
  final _controller = TextEditingController();
  List<PlaceSuggestion> _results = tnPlaces;
  bool _loading = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search(String q) async {
    setState(() => _loading = true);
    final remote = await ref.read(placeSearchProvider).search(q);
    final saved = ref.read(savedPlacesProvider).asData?.value ?? [];
    final fromSaved = saved
        .where((p) => p.title.toLowerCase().contains(q.toLowerCase()) || p.address.toLowerCase().contains(q.toLowerCase()))
        .map((p) => PlaceSuggestion(
              id: 'saved-${p.id}',
              label: p.title,
              secondary: p.address,
              latitude: p.latitude,
              longitude: p.longitude,
            ));
    if (!mounted) return;
    setState(() {
      _results = [...fromSaved, ...remote];
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.7,
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(99)),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _controller,
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: 'Search a place in Tamil Nadu',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
                onChanged: _search,
              ),
            ),
            if (_loading) const LinearProgressIndicator(color: AppConstants.accentColor),
            Expanded(
              child: ListView.builder(
                itemCount: _results.length,
                itemBuilder: (context, i) {
                  final place = _results[i];
                  return ListTile(
                    leading: const Icon(Icons.place_outlined),
                    title: Text(place.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: place.secondary == null ? null : Text(place.secondary!, maxLines: 1),
                    onTap: () => Navigator.of(context).pop(place),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
