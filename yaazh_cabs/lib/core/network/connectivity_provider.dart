import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityStatusProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map((results) {
    if (results.isEmpty) return false;
    return results.any((r) => r != ConnectivityResult.none);
  });
});

final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityStatusProvider).maybeWhen(
        data: (online) => online,
        orElse: () => true,
      );
});
