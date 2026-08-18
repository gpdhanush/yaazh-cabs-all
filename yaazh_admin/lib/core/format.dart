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

String titleCase(String value) {
  final text = value.trim();
  if (text.isEmpty || text == '-') return text;
  return text.replaceAll('_', ' ').split(RegExp(r'([\s\-]+)')).map((part) {
    if (part.isEmpty || RegExp(r'^[\s\-]+$').hasMatch(part)) return part;
    final lower = part.toLowerCase();
    return '${lower[0].toUpperCase()}${lower.substring(1)}';
  }).join();
}

String capitalizeWords(String value) => titleCase(value);

const _ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const _tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

String _belowHundred(int value) {
  if (value < 20) return _ones[value];
  final ten = _tens[value ~/ 10];
  final one = _ones[value % 10];
  return one.isEmpty ? ten : '$ten $one';
}

String _belowThousand(int value) {
  if (value == 0) return '';
  if (value < 100) return _belowHundred(value);
  final hundred = _ones[value ~/ 100];
  final rest = _belowHundred(value % 100);
  return rest.isEmpty ? '$hundred Hundred' : '$hundred Hundred $rest';
}

String amountInWords(num value) {
  if (value <= 0) return 'Zero Rupees Only';

  final totalPaise = (value * 100).round();
  final rupees = totalPaise ~/ 100;
  final paise = totalPaise % 100;

  final crore = rupees ~/ 10000000;
  final lakh = (rupees ~/ 100000) % 100;
  final thousand = (rupees ~/ 1000) % 100;
  final remainder = rupees % 1000;

  final parts = <String>[];
  if (crore > 0) {
    parts.add('${_belowThousand(crore)} Crore');
  }
  if (lakh > 0) {
    parts.add('${_belowHundred(lakh)} Lakh');
  }
  if (thousand > 0) {
    parts.add('${_belowHundred(thousand)} Thousand');
  }
  if (remainder > 0) {
    parts.add(_belowThousand(remainder));
  }

  final rupeeWords = parts.isEmpty ? 'Zero' : parts.join(' ');
  if (paise <= 0) return '$rupeeWords Rupees Only';
  return '$rupeeWords Rupees and ${_belowHundred(paise)} Paise Only';
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
