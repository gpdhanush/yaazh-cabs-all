import 'package:flutter/material.dart';
import 'package:yaazh_cabs/app/constants.dart';

class StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  final Color? textColor;

  const StatusChip({
    super.key,
    required this.label,
    required this.color,
    this.textColor,
  });

  factory StatusChip.forStatus(String status) {
    switch (status.toLowerCase()) {
      case 'online':
      case 'available':
      case 'completed':
      case 'paid':
      case 'verified':
      case 'approved':
        return StatusChip(
          label: _formatLabel(status),
          color: const Color(0xFFE8F6EE),
          textColor: AppConstants.successColor,
        );
      case 'on_the_way':
      case 'driver_assigned':
      case 'assigned':
      case 'seen':
        return StatusChip(
          label: _formatLabel(status),
          color: const Color(0xFFE8ECF4),
          textColor: AppConstants.navy,
        );
      case 'arrived':
      case 'trip_started':
      case 'on_trip':
      case 'busy':
      case 'processing':
      case 'pending':
      case 'partial':
        return StatusChip(
          label: _formatLabel(status),
          color: const Color(0xFFFFF3DE),
          textColor: const Color(0xFF8A5A00),
        );
      case 'cancelled':
      case 'rejected':
      case 'blocked':
      case 'suspended':
      case 'failed':
      case 'unpaid':
        return StatusChip(
          label: _formatLabel(status),
          color: const Color(0xFFFDECEC),
          textColor: AppConstants.errorColor,
        );
      case 'offline':
      default:
        return StatusChip(
          label: _formatLabel(status),
          color: AppConstants.lightGrey,
          textColor: AppConstants.textSecondaryLight,
        );
    }
  }

  static String _formatLabel(String status) {
    return status.replaceAll('_', ' ').toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: textColor ?? AppConstants.navy,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
          height: 1.2,
        ),
      ),
    );
  }
}
