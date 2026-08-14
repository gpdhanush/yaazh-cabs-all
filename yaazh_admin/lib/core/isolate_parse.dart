import 'package:flutter/foundation.dart';

/// Spawn cost beats mapping tiny lists on the UI isolate.
const kJsonListIsolateMin = 32;

Future<List<T>> parseJsonListInIsolate<T>(
  List<Map<String, dynamic>> raw,
  List<T> Function(List<Map<String, dynamic>>) decoder,
) {
  if (raw.length < kJsonListIsolateMin) {
    return Future<List<T>>.value(decoder(raw));
  }
  return compute(decoder, raw);
}
