import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/location/location_service.dart';
import 'package:yaazh_customer/core/location/place_search.dart';
import 'package:yaazh_customer/core/network/api_exception.dart';
import 'package:yaazh_customer/core/widgets/driver_avatar.dart';
import 'package:yaazh_customer/core/widgets/ya_network_image.dart';
import 'package:yaazh_customer/features/booking/data/booking_repository.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';
import 'package:yaazh_customer/features/home/data/catalog_repository.dart';
import 'package:yaazh_customer/features/home/domain/catalog.dart';
import 'package:yaazh_customer/features/profile/data/saved_places_repository.dart';
import 'package:yaazh_customer/features/trips/presentation/trips_viewmodel.dart';

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
  bool _locating = true;
  bool _pickupIsCurrent = true;
  bool _mapReady = false;
  LatLng? _pendingCenter;
  DateTime _pickupAt = DateTime.now().add(const Duration(minutes: 30));

  @override
  void initState() {
    super.initState();
    Future.microtask(_initPickup);
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  void _onMapReady() {
    _mapReady = true;
    final pending = _pendingCenter;
    if (pending != null) {
      _pendingCenter = null;
      _mapController.move(pending, 15);
    }
  }

  void _moveMap(LatLng loc) {
    if (!_mapReady) {
      _pendingCenter = loc;
      return;
    }
    try {
      _mapController.move(loc, 15);
    } catch (_) {
      _mapReady = false;
      _pendingCenter = loc;
    }
  }

  Future<void> _initPickup() async {
    if (ref.read(upcomingTripProvider) != null) return;
    setState(() => _locating = true);
    final loc = await ref.read(locationServiceProvider).getCurrentLatLng();
    if (!mounted) return;
    if (loc == null) {
      setState(() => _locating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enable location so we can set your pickup pin.')),
      );
      return;
    }
    final label = await ref.read(placeSearchProvider).reverseGeocode(loc);
    if (!mounted) return;
    setState(() {
      _pickupIsCurrent = true;
      _locating = false;
      _pickup = PlaceSuggestion(
        id: 'current',
        label: 'Current location',
        secondary: label,
        latitude: loc.latitude,
        longitude: loc.longitude,
      );
    });
    _moveMap(loc);
    await _refreshRoute();
  }

  Future<void> _pickPlace({required bool isPickup}) async {
    final selected = await showModalBottomSheet<PlaceSuggestion>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _PlaceSearchSheet(),
    );
    if (selected == null) return;
    if (selected.id == 'current') {
      await _initPickup();
      return;
    }
    if (selected.latLng == null) return;
    setState(() {
      if (isPickup) {
        _pickup = selected;
        _pickupIsCurrent = false;
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
    if (!_mapReady) return;
    try {
      final bounds = LatLngBounds.fromPoints([a, b]);
      _mapController.fitCamera(
        CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.fromLTRB(48, 48, 48, 280)),
      );
    } catch (_) {
      _mapReady = false;
    }
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
    final active = ref.read(upcomingTripProvider);
    if (active != null) {
      context.push('/trips/${active.id}');
      return;
    }

    var pickup = _pickup;
    if (_pickupIsCurrent || pickup?.latLng == null) {
      final loc = await ref.read(locationServiceProvider).getCurrentLatLng();
      if (loc == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Turn on GPS so the driver can find you.')),
        );
        return;
      }
      final label = await ref.read(placeSearchProvider).reverseGeocode(loc);
      pickup = PlaceSuggestion(
        id: 'current',
        label: 'Current location',
        secondary: label,
        latitude: loc.latitude,
        longitude: loc.longitude,
      );
      if (mounted) {
        setState(() {
          _pickup = pickup;
          _pickupIsCurrent = true;
        });
      }
    }

    final drop = _drop;
    final fleet = ref.read(vehicleCategoriesProvider).asData?.value ?? [];
    final vehicle = fleet.cast<VehicleCategory?>().firstWhere(
          (c) => c?.id == _selectedVehicleId,
          orElse: () => fleet.isEmpty ? null : fleet.first,
        );
    if (pickup?.latLng == null || drop?.latLng == null || vehicle == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose pickup, drop, and a vehicle')),
      );
      return;
    }
    final quote = _quotes[vehicle.id];
    final draft = BookingDraft(
      pickupLabel: pickup!.secondary?.isNotEmpty == true
          ? pickup.secondary!
          : pickup.label,
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
      useCurrentLocation: _pickupIsCurrent,
    );
    if (!mounted) return;
    context.push('/book/confirm', extra: draft);
  }

  @override
  Widget build(BuildContext context) {
    final active = ref.watch(upcomingTripProvider);
    if (active != null) {
      _mapReady = false;
      return _OngoingBookingGate(booking: active);
    }

    final fleet = ref.watch(vehicleCategoriesProvider);
    final pickupPoint = _pickup?.latLng;
    final dropPoint = _drop?.latLng;
    final selectedQuote = _selectedVehicleId == null ? null : _quotes[_selectedVehicleId!];

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: pickupPoint ?? AppConstants.defaultCenter,
              initialZoom: 14,
              onMapReady: _onMapReady,
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
                      strokeWidth: 5,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  if (pickupPoint != null)
                    Marker(
                      point: pickupPoint,
                      width: 44,
                      height: 44,
                      child: const _MapPin(color: Color(0xFF16A34A), icon: Icons.my_location_rounded),
                    ),
                  if (dropPoint != null)
                    Marker(
                      point: dropPoint,
                      width: 44,
                      height: 44,
                      child: const _MapPin(color: AppConstants.errorColor, icon: Icons.location_on_rounded),
                    ),
                ],
              ),
            ],
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    child: InkWell(
                      onTap: () => context.go('/home'),
                      borderRadius: BorderRadius.circular(14),
                      child: const SizedBox(
                        width: 44,
                        height: 44,
                        child: Icon(Icons.arrow_back_rounded),
                      ),
                    ),
                  ),
                  const Spacer(),
                  Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    child: InkWell(
                      onTap: _initPickup,
                      borderRadius: BorderRadius.circular(14),
                      child: SizedBox(
                        width: 44,
                        height: 44,
                        child: _locating
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppConstants.accentHover,
                                ),
                              )
                            : const Icon(Icons.my_location_rounded, color: AppConstants.primaryColor),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: _BookingSheet(
              pickup: _pickup,
              drop: _drop,
              pickupIsCurrent: _pickupIsCurrent,
              locating: _locating,
              tripType: _tripType,
              pickupAt: _pickupAt,
              quoting: _quoting,
              quotes: _quotes,
              selectedVehicleId: _selectedVehicleId,
              selectedQuote: selectedQuote,
              fleet: fleet,
              onPickPickup: () => _pickPlace(isPickup: true),
              onPickDrop: () => _pickPlace(isPickup: false),
              onUseCurrent: _initPickup,
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

class _MapPin extends StatelessWidget {
  final Color color;
  final IconData icon;

  const _MapPin({required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 10, offset: const Offset(0, 3)),
        ],
      ),
      child: Icon(icon, color: color, size: 22),
    );
  }
}

class _BookingSheet extends StatelessWidget {
  final PlaceSuggestion? pickup;
  final PlaceSuggestion? drop;
  final bool pickupIsCurrent;
  final bool locating;
  final String tripType;
  final DateTime pickupAt;
  final bool quoting;
  final Map<String, FareQuote> quotes;
  final String? selectedVehicleId;
  final FareQuote? selectedQuote;
  final AsyncValue<List<VehicleCategory>> fleet;
  final VoidCallback onPickPickup;
  final VoidCallback onPickDrop;
  final VoidCallback onUseCurrent;
  final ValueChanged<String> onTripType;
  final ValueChanged<String> onVehicle;
  final VoidCallback onWhen;
  final VoidCallback onContinue;

  const _BookingSheet({
    required this.pickup,
    required this.drop,
    required this.pickupIsCurrent,
    required this.locating,
    required this.tripType,
    required this.pickupAt,
    required this.quoting,
    required this.quotes,
    required this.selectedVehicleId,
    required this.selectedQuote,
    required this.fleet,
    required this.onPickPickup,
    required this.onPickDrop,
    required this.onUseCurrent,
    required this.onTripType,
    required this.onVehicle,
    required this.onWhen,
    required this.onContinue,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.62),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(color: Color(0x33000000), blurRadius: 28, offset: Offset(0, -8)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          Flexible(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              shrinkWrap: true,
              children: [
                Row(
                  children: [
                    const Text('Book a cab', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    const Spacer(),
                    if (pickupIsCurrent)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          locating ? 'Locating…' : 'Live GPS',
                          style: const TextStyle(
                            color: Color(0xFF15803D),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
                  decoration: BoxDecoration(
                    color: AppConstants.bgLight,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppConstants.borderLight),
                  ),
                  child: Row(
                    children: [
                      Column(
                        children: [
                          const Icon(Icons.my_location_rounded, size: 16, color: Color(0xFF16A34A)),
                          Container(
                            width: 2,
                            height: 28,
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            color: const Color(0xFFE2E8F0),
                          ),
                          const Icon(Icons.location_on_rounded, size: 16, color: AppConstants.errorColor),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          children: [
                            _StopRow(
                              title: pickupIsCurrent ? 'Current location' : (pickup?.label ?? 'Set pickup'),
                              subtitle: pickup?.secondary ?? (pickupIsCurrent ? 'Driver will come to your GPS pin' : 'Pickup point'),
                              onTap: onPickPickup,
                            ),
                            const Divider(height: 16),
                            _StopRow(
                              title: drop?.label ?? 'Where to?',
                              subtitle: drop?.secondary ?? 'Set drop location',
                              onTap: onPickDrop,
                              muted: drop == null,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (!pickupIsCurrent) ...[
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: onUseCurrent,
                      icon: const Icon(Icons.gps_fixed_rounded, size: 18),
                      label: const Text('Use my current location'),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  height: 38,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _tripTypes.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      final type = _tripTypes[i];
                      final selected = tripType == type.$1;
                      return Material(
                        color: selected ? AppConstants.accentColor : AppConstants.bgLight,
                        borderRadius: BorderRadius.circular(20),
                        child: InkWell(
                          onTap: () => onTripType(type.$1),
                          borderRadius: BorderRadius.circular(20),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            child: Text(
                              type.$2,
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: selected ? Colors.black : AppConstants.textSecondaryLight,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                Material(
                  color: AppConstants.bgLight,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    onTap: onWhen,
                    borderRadius: BorderRadius.circular(14),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Row(
                        children: [
                          const Icon(Icons.schedule_rounded, size: 20, color: AppConstants.accentHover),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              DateFormat('EEE, d MMM · h:mm a').format(pickupAt),
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                          const Text('Change', style: TextStyle(fontWeight: FontWeight.w700, color: AppConstants.accentHover)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                fleet.when(
                  data: (rows) => SizedBox(
                    height: 132,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: rows.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (context, i) {
                        final cat = rows[i];
                        final selected = cat.id == selectedVehicleId;
                        final quote = quotes[cat.id];
                        return Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          child: InkWell(
                            onTap: () => onVehicle(cat.id),
                            borderRadius: BorderRadius.circular(16),
                            child: Ink(
                              width: 148,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: selected ? AppConstants.accentColor : AppConstants.borderLight,
                                  width: selected ? 2 : 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  YaNetworkImage(
                                    url: cat.imageUrl,
                                    height: 58,
                                    width: 148,
                                    fallbackIcon: Icons.directions_car_filled_rounded,
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          cat.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                        ),
                                        Text(
                                          '${cat.seatingCapacity} seats',
                                          style: const TextStyle(fontSize: 11, color: AppConstants.textSecondaryLight),
                                        ),
                                        Text(
                                          quote != null
                                              ? '₹${quote.estimatedTotal.toStringAsFixed(0)}'
                                              : (quoting ? '…' : 'Quote'),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            color: AppConstants.accentHover,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  loading: () => const LinearProgressIndicator(color: AppConstants.accentColor),
                  error: (e, _) => Text(e.toString()),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: ElevatedButton(
              onPressed: onContinue,
              child: Text(
                selectedQuote == null
                    ? 'CONTINUE'
                    : 'CONTINUE · ₹${selectedQuote!.estimatedTotal.toStringAsFixed(0)}',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StopRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool muted;

  const _StopRow({
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.muted = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: muted ? AppConstants.textSecondaryLight : AppConstants.textPrimaryLight,
                  ),
                ),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: AppConstants.textSecondaryLight),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: AppConstants.textSecondaryLight),
        ],
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
      child: Container(
        height: MediaQuery.of(context).size.height * 0.72,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(99)),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
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
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Material(
                color: const Color(0xFFDCFCE7),
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  onTap: () => Navigator.of(context).pop(
                    const PlaceSuggestion(id: 'current', label: 'Current location'),
                  ),
                  borderRadius: BorderRadius.circular(14),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Row(
                      children: [
                        Icon(Icons.my_location_rounded, color: Color(0xFF15803D)),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Use my current location',
                            style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF15803D)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            if (_loading) const LinearProgressIndicator(color: AppConstants.accentColor),
            Expanded(
              child: ListView.separated(
                itemCount: _results.length,
                separatorBuilder: (_, _) => const Divider(height: 1, indent: 16, endIndent: 16),
                itemBuilder: (context, i) {
                  final place = _results[i];
                  return InkWell(
                    onTap: () => Navigator.of(context).pop(place),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          const Icon(Icons.place_outlined, color: AppConstants.accentHover),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(place.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                                if (place.secondary != null)
                                  Text(
                                    place.secondary!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 12, color: AppConstants.textSecondaryLight),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
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

class _OngoingBookingGate extends StatelessWidget {
  final Booking booking;

  const _OngoingBookingGate({required this.booking});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppConstants.accentColor.withValues(alpha: 0.16),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.local_taxi_rounded, size: 40, color: AppConstants.accentHover),
            ),
            const SizedBox(height: 22),
            const Text(
              'Trip already in progress',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            Text(
              'Finish or cancel ${booking.bookingReference} before booking another cab.',
              textAlign: TextAlign.center,
              style: const TextStyle(height: 1.45, color: AppConstants.textSecondaryLight),
            ),
            const SizedBox(height: 12),
            Text(
              '${booking.pickupLocation} → ${booking.dropLocation}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            if (booking.showsAssignedDriver && booking.driver != null) ...[
              const SizedBox(height: 18),
              DriverAvatar(driver: booking.driver!, radius: 28),
              const SizedBox(height: 8),
              Text(
                booking.driver!.name,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
              ),
              if (booking.vehicle?.name != null)
                Text(
                  booking.vehicle!.registration ?? booking.vehicle!.name,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppConstants.textSecondaryLight),
                ),
            ],
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: () => context.push('/trips/${booking.id}'),
              child: const Text('VIEW ONGOING TRIP'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => context.go('/home'),
              child: const Text('GO TO DASHBOARD'),
            ),
          ],
        ),
      ),
    );
  }
}
