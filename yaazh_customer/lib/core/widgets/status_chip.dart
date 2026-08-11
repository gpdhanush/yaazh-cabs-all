import 'package:flutter/material.dart';

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
      case 'completed':
      case 'paid':
      case 'confirmed':
        return StatusChip(
          label: _formatLabel(status),
          color: const Color(0xFFDCFCE7),
          textColor: const Color(0xFF15803D),
        );
      case 'on_the_way':
      case 'driver_assigned':
      case 'driver_accepted':
      case 'driver_notified':
        return StatusChip(
          label: _formatLabel(status),
          color: const Color(0xFFDBEAFE),
          textColor: const Color(0xFF1D4ED8),
        );
      case 'arrived':
      case 'trip_started':
      case 'pending':
        return StatusChip(
          label: _formatLabel(status),
          color: const Color(0xFFFEF3C7),
          textColor: const Color(0xFFB45309),
        );
      case 'cancelled':
      case 'rejected':
      case 'no_show':
      case 'driver_rejected':
        return StatusChip(
          label: _formatLabel(status),
          color: const Color(0xFFFEE2E2),
          textColor: const Color(0xFFB91C1C),
        );
      default:
        return StatusChip(
          label: _formatLabel(status),
          color: const Color(0xFFF1F5F9),
          textColor: const Color(0xFF475569),
        );
    }
  }

  static String _formatLabel(String status) {
    return status.replaceAll('_', ' ').toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor ?? Colors.black,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
