import 'package:flutter/material.dart';
import 'package:yaazh_admin/app/constants.dart';

class Testimonial {
  final String id;
  final String customerName;
  final String? customerPhone;
  final int rating;
  final String review;
  final String? reviewSnippet;
  final String? adminReply;
  final String approvalStatus;
  final String statusLabel;
  final bool isFeatured;
  final String? createdAt;

  const Testimonial({
    required this.id,
    required this.customerName,
    this.customerPhone,
    required this.rating,
    required this.review,
    this.reviewSnippet,
    this.adminReply,
    required this.approvalStatus,
    required this.statusLabel,
    required this.isFeatured,
    this.createdAt,
  });

  factory Testimonial.fromJson(Map<String, dynamic> json) {
    return Testimonial(
      id: json['id']?.toString() ?? '',
      customerName: json['customer_name']?.toString() ?? '',
      customerPhone: json['customer_phone']?.toString(),
      rating: int.tryParse(json['rating']?.toString() ?? '') ?? 0,
      review: json['review']?.toString() ?? '',
      reviewSnippet: json['review_snippet']?.toString(),
      adminReply: json['admin_reply']?.toString(),
      approvalStatus: json['approval_status']?.toString() ?? 'pending',
      statusLabel: json['status_label']?.toString() ??
          TestimonialMeta.label(json['approval_status']?.toString() ?? 'pending'),
      isFeatured: json['is_featured'] == true,
      createdAt: json['created_at']?.toString(),
    );
  }
}

class TestimonialMeta {
  static String label(String status) {
    const map = {
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected',
    };
    return map[status] ?? status.replaceAll('_', ' ');
  }

  static Color color(String status) {
    return switch (status) {
      'approved' => AppColors.success,
      'pending' => AppColors.warning,
      'rejected' => AppColors.salmon,
      _ => AppColors.textSecondaryLight,
    };
  }
}
