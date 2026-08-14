import 'package:intl/intl.dart';

final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
final _inrDecimal = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);
final _dateTime = DateFormat('dd MMM yyyy, hh:mm a');
final _date = DateFormat('dd MMM yyyy');

String formatInr(dynamic value) {
  final n = double.tryParse(value?.toString() ?? '') ?? 0;
  if (n == n.roundToDouble()) return _inr.format(n);
  return _inrDecimal.format(n);
}

String formatDateTime(String? raw) {
  if (raw == null || raw.isEmpty) return '—';
  final dt = DateTime.tryParse(raw);
  if (dt == null) return raw;
  return _dateTime.format(dt.toLocal());
}

String formatDate(String? raw) {
  if (raw == null || raw.isEmpty) return '—';
  final dt = DateTime.tryParse(raw);
  if (dt == null) return raw;
  return _date.format(dt.toLocal());
}

double? parseDouble(dynamic value) {
  if (value == null) return null;
  return double.tryParse(value.toString());
}

String capitalizeWords(String value) {
  final cleaned = value.replaceAll('_', ' ').trim();
  if (cleaned.isEmpty) return value;
  return cleaned.split(RegExp(r'\s+')).map((word) {
    if (word.isEmpty) return word;
    return '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}';
  }).join(' ');
}

int? parseInt(dynamic value) {
  if (value == null) return null;
  return int.tryParse(value.toString());
}

List<Map<String, dynamic>> asMapList(dynamic data) {
  if (data is! List) return const [];
  return data
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}
