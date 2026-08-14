import 'package:yaazh_admin/app/constants.dart';
import 'package:flutter/material.dart';

class Enquiry {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? subject;
  final String message;
  final String status;
  final String statusLabel;
  final String? adminNote;
  final String? createdAt;
  final String? updatedAt;

  const Enquiry({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.subject,
    required this.message,
    required this.status,
    required this.statusLabel,
    this.adminNote,
    this.createdAt,
    this.updatedAt,
  });

  factory Enquiry.fromJson(Map<String, dynamic> json) {
    return Enquiry(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      subject: json['subject']?.toString(),
      message: json['message']?.toString() ?? '',
      status: json['status']?.toString() ?? 'new',
      statusLabel: json['status_label']?.toString() ??
          EnquiryMeta.label(json['status']?.toString() ?? 'new'),
      adminNote: json['admin_note']?.toString(),
      createdAt: json['created_at']?.toString(),
      updatedAt: json['updated_at']?.toString(),
    );
  }
}

class EnquiryMeta {
  static String label(String status) {
    const map = {
      'new': 'New',
      'in_progress': 'In progress',
      'closed': 'Closed',
      'spam': 'Spam',
    };
    return map[status] ?? status.replaceAll('_', ' ');
  }

  static Color color(String status) {
    return switch (status) {
      'new' => AppColors.warning,
      'in_progress' => AppColors.supportBlue,
      'closed' => AppColors.success,
      'spam' => AppColors.salmon,
      _ => AppColors.textSecondaryLight,
    };
  }
}
