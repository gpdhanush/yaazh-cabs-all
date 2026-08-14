import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';

class Customer {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String? alternatePhone;
  final String? address;
  final String? city;
  final String preferredLanguage;
  final String? referralCode;
  final String appStatus;
  final String appStatusLabel;
  final bool isActive;
  final String? lastLoginAt;
  final String? createdAt;
  final int? bookingCount;

  const Customer({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.alternatePhone,
    this.address,
    this.city,
    required this.preferredLanguage,
    this.referralCode,
    required this.appStatus,
    required this.appStatusLabel,
    required this.isActive,
    this.lastLoginAt,
    this.createdAt,
    this.bookingCount,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      email: json['email']?.toString(),
      alternatePhone: json['alternate_phone']?.toString(),
      address: json['address']?.toString(),
      city: json['city']?.toString(),
      preferredLanguage: json['preferred_language']?.toString() ?? 'en',
      referralCode: json['referral_code']?.toString(),
      appStatus: json['app_status']?.toString() ?? 'active',
      appStatusLabel: json['app_status_label']?.toString() ??
          CustomerMeta.label(json['app_status']?.toString() ?? 'active'),
      isActive: json['is_active'] != false,
      lastLoginAt: json['last_login_at']?.toString(),
      createdAt: json['created_at']?.toString(),
      bookingCount: int.tryParse(json['booking_count']?.toString() ?? ''),
    );
  }
}

class CustomerMeta {
  static String label(String status) {
    const map = {
      'active': 'Active',
      'blocked': 'Blocked',
      'deleted': 'Deleted',
    };
    return map[status] ?? status.replaceAll('_', ' ');
  }

  static Color color(String status) {
    return switch (status) {
      'active' => AppColors.success,
      'blocked' => AppColors.salmon,
      _ => AppColors.textSecondaryLight,
    };
  }
}
