import 'package:flutter/material.dart';

Color? parseHexColor(String? raw) {
  if (raw == null) return null;
  var t = raw.trim();
  if (t.startsWith('#')) t = t.substring(1);
  if (t.length == 3) {
    t = '${t[0]}${t[0]}${t[1]}${t[1]}${t[2]}${t[2]}';
  }
  if (t.length != 6) return null;
  final value = int.tryParse(t, radix: 16);
  if (value == null) return null;
  return Color(0xFF000000 | value);
}

String colorToHex(Color color) {
  final hex = color.toARGB32().toRadixString(16).padLeft(8, '0');
  return '#${hex.substring(2)}';
}
