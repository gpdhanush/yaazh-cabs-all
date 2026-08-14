import 'package:flutter/material.dart';

class AppSetting {
  final String key;
  final String value;
  final String group;

  const AppSetting({
    required this.key,
    required this.value,
    required this.group,
  });

  factory AppSetting.fromJson(Map<String, dynamic> json) {
    return AppSetting(
      key: json['key']?.toString() ?? '',
      value: json['value']?.toString() ?? '',
      group: json['group']?.toString() ?? 'other',
    );
  }

  static String labelFor(String key) {
    const map = {
      'company_name': 'Company name',
      'support_phone': 'Support phone',
      'support_phone_secondary': 'Secondary phone',
      'support_email': 'Support email',
      'whatsapp_number': 'WhatsApp number',
      'business_address': 'Business address',
      'business_hours': 'Business hours',
      'booking_fare_note': 'Booking fare note',
      'maps_share_url': 'Maps share URL',
      'map_lat': 'Map latitude',
      'map_lng': 'Map longitude',
    };
    return map[key] ?? key.replaceAll('_', ' ');
  }

  static String groupTitle(String group) {
    const map = {
      'company': 'Company & contact',
      'fare': 'Fare notes',
    };
    if (map.containsKey(group)) return map[group]!;
    if (group.isEmpty) return 'Other';
    return '${group[0].toUpperCase()}${group.substring(1)}';
  }

  static String groupHint(String group) {
    const map = {
      'company': 'Public website and booking contact details',
      'fare': 'Customer-facing fare disclaimers',
    };
    return map[group] ?? 'Application settings';
  }

  static IconData groupIcon(String group) {
    return switch (group) {
      'company' => Icons.business_rounded,
      'fare' => Icons.payments_rounded,
      _ => Icons.tune_rounded,
    };
  }

  static bool isMultiline(String key) {
    return key.contains('note') || key.contains('address') || key.contains('message');
  }
}
