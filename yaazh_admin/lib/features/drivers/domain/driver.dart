import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';

class Driver {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String? licenseNo;
  final String? licenseExpiryDate;
  final String? address;
  final String? photoUrl;
  final String verificationStatus;
  final String onlineStatus;
  final String availabilityStatus;
  final bool isActive;
  final double ratingAvg;
  final int totalCompletedTrips;
  final String? createdAt;

  const Driver({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.licenseNo,
    this.licenseExpiryDate,
    this.address,
    this.photoUrl,
    required this.verificationStatus,
    required this.onlineStatus,
    required this.availabilityStatus,
    required this.isActive,
    required this.ratingAvg,
    required this.totalCompletedTrips,
    this.createdAt,
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      email: json['email']?.toString(),
      licenseNo: json['license_no']?.toString(),
      licenseExpiryDate: json['license_expiry_date']?.toString(),
      address: json['address']?.toString(),
      photoUrl: json['profile_image_url']?.toString() ?? json['photo_url']?.toString(),
      verificationStatus: json['verification_status']?.toString() ?? 'pending',
      onlineStatus: json['online_status']?.toString() ?? 'offline',
      availabilityStatus: json['availability_status']?.toString() ?? 'available',
      isActive: json['is_active'] != false,
      ratingAvg: parseDouble(json['rating_avg']) ?? 0,
      totalCompletedTrips: parseInt(json['total_completed_trips']) ?? 0,
      createdAt: json['created_at']?.toString(),
    );
  }
}

class DriverMeta {
  static String availabilityLabel(String status) {
    const map = {
      'available': 'Available',
      'on_trip': 'On ride',
      'on_leave': 'Leave',
      'suspended': 'Suspended',
    };
    return map[status] ?? status.replaceAll('_', ' ');
  }

  static Color availabilityColor(String status) {
    return switch (status) {
      'available' => AppColors.success,
      'on_trip' => AppColors.supportBlue,
      'on_leave' => AppColors.warning,
      'suspended' => AppColors.salmon,
      _ => AppColors.textSecondaryLight,
    };
  }

  static String verificationLabel(String status) {
    const map = {
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'blocked': 'Blocked',
    };
    return map[status] ?? status.replaceAll('_', ' ');
  }

  static Color verificationColor(String status) {
    return switch (status) {
      'approved' => AppColors.success,
      'pending' => AppColors.warning,
      'rejected' || 'blocked' => AppColors.salmon,
      _ => AppColors.textSecondaryLight,
    };
  }

  static String onlineLabel(String status) {
    const map = {
      'offline': 'Offline',
      'online': 'Online',
      'busy': 'Busy',
    };
    return map[status] ?? status.replaceAll('_', ' ');
  }

  static Color onlineColor(String status) {
    return switch (status) {
      'online' => AppColors.success,
      'busy' => AppColors.warning,
      _ => AppColors.textSecondaryLight,
    };
  }
}
