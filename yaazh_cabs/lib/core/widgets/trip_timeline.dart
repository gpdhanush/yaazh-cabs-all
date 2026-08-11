import 'package:flutter/material.dart';
import 'package:yaazh_cabs/app/constants.dart';

class TripTimeline extends StatelessWidget {
  final String pickupAddress;
  final String dropAddress;
  final String? pickupTime;
  final String? dropTime;

  const TripTimeline({
    super.key,
    required this.pickupAddress,
    required this.dropAddress,
    this.pickupTime,
    this.dropTime,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final lineColor = isDark ? AppConstants.borderDark : AppConstants.lightGrey;

    return Column(
      children: [
        _TimelineNode(
          icon: Icons.radio_button_checked,
          iconColor: AppConstants.gold,
          label: 'PICKUP',
          labelColor: AppConstants.gold,
          address: pickupAddress,
          time: pickupTime,
          showLine: true,
          lineColor: lineColor,
        ),
        _TimelineNode(
          icon: Icons.location_on_rounded,
          iconColor: AppConstants.navy,
          label: 'DESTINATION',
          labelColor: AppConstants.navy,
          address: dropAddress,
          time: dropTime,
          showLine: false,
          lineColor: lineColor,
        ),
      ],
    );
  }
}

class _TimelineNode extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final Color labelColor;
  final String address;
  final String? time;
  final bool showLine;
  final Color lineColor;

  const _TimelineNode({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.labelColor,
    required this.address,
    required this.time,
    required this.showLine,
    required this.lineColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Icon(icon, color: iconColor, size: 20),
            if (showLine)
              Container(width: 2, height: 36, color: lineColor),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: showLine ? 10 : 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: labelColor,
                        ),
                      ),
                    ),
                    if (time != null)
                      Text(
                        time!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall,
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                  Text(
                    address,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      height: 1.35,
                      color: AppConstants.navy,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
