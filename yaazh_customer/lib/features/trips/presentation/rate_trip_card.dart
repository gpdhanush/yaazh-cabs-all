import 'package:flutter/material.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/widgets/driver_avatar.dart';
import 'package:yaazh_customer/features/booking/domain/booking.dart';

const _ratingLabels = ['', 'Terrible', 'Poor', 'Good', 'Great', 'Excellent'];

class RateTripCard extends StatelessWidget {
  final Booking booking;
  final int rating;
  final TextEditingController reviewController;
  final bool submitting;
  final bool submitted;
  final ValueChanged<int> onRatingChanged;
  final VoidCallback onSubmit;

  const RateTripCard({
    super.key,
    required this.booking,
    required this.rating,
    required this.reviewController,
    required this.submitting,
    required this.submitted,
    required this.onRatingChanged,
    required this.onSubmit,
  });

  bool get _done => submitted || booking.hasRated;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0B1220), Color(0xFF1A2740), Color(0xFF0F172A)],
        ),
        border: Border.all(color: const Color(0x33F59E0B)),
        boxShadow: [
          BoxShadow(
            color: AppConstants.accentColor.withValues(alpha: 0.14),
            blurRadius: 28,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -28,
            top: -36,
            child: Icon(
              Icons.workspace_premium_rounded,
              size: 148,
              color: AppConstants.accentColor.withValues(alpha: 0.06),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
            child: _done ? _ThankYou(booking: booking, rating: rating) : _Form(this),
          ),
        ],
      ),
    );
  }
}

class _ThankYou extends StatelessWidget {
  final Booking booking;
  final int rating;

  const _ThankYou({required this.booking, required this.rating});

  @override
  Widget build(BuildContext context) {
    final stars = booking.customerRating ?? rating;
    final review = booking.customerReview?.trim();
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppConstants.accentColor.withValues(alpha: 0.16),
            border: Border.all(color: AppConstants.accentColor.withValues(alpha: 0.4)),
          ),
          child: const Icon(Icons.verified_rounded, color: AppConstants.accentColor, size: 34),
        ),
        const SizedBox(height: 16),
        const Text(
          'THANK YOU',
          style: TextStyle(
            color: AppConstants.accentColor,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 2.2,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Your trip is rated',
          style: TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 1; i <= 5; i++)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Icon(
                  i <= stars ? Icons.star_rounded : Icons.star_outline_rounded,
                  color: AppConstants.accentColor,
                  size: 28,
                ),
              ),
          ],
        ),
        if (review != null && review.isNotEmpty) ...[
          const SizedBox(height: 14),
          Text(
            '“$review”',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.78),
              fontSize: 14,
              height: 1.45,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
        const SizedBox(height: 16),
        Text(
          'We’ll publish this on the website after a quick review.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.52),
            fontSize: 12,
            height: 1.4,
          ),
        ),
      ],
    );
  }
}

class _Form extends StatelessWidget {
  final RateTripCard parent;

  const _Form(this.parent);

  @override
  Widget build(BuildContext context) {
    final driverName = parent.booking.driver?.name;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'RATE THIS TRIP',
          style: TextStyle(
            color: AppConstants.accentColor,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.8,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'How was your ride?',
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.4,
          ),
        ),
        if (parent.booking.driver != null) ...[
          const SizedBox(height: 12),
          DriverNameLine(
            driver: parent.booking.driver!,
            avatarRadius: 18,
            nameColor: Colors.white,
            nameStyle: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 14,
            ),
            subtitle: parent.booking.bookingReference,
          ),
        ] else if (driverName != null && driverName.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            'With $driverName · ${parent.booking.bookingReference}',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.58),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
        const SizedBox(height: 22),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            for (var i = 1; i <= 5; i++)
              _StarButton(
                selected: i <= parent.rating,
                onTap: () => parent.onRatingChanged(i),
              ),
          ],
        ),
        const SizedBox(height: 10),
        Center(
          child: Text(
            _ratingLabels[parent.rating],
            style: const TextStyle(
              color: AppConstants.accentColor,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: parent.reviewController,
          maxLines: 3,
          maxLength: 400,
          style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.4),
          cursorColor: AppConstants.accentColor,
          decoration: InputDecoration(
            counterText: '',
            hintText: 'Share a few words about the ride (optional)',
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.38)),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.06),
            contentPadding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppConstants.accentColor),
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          height: 54,
          child: ElevatedButton(
            onPressed: parent.submitting
                ? null
                : () {
                    FocusManager.instance.primaryFocus?.unfocus();
                    parent.onSubmit();
                  },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.accentColor,
              foregroundColor: const Color(0xFF0B1220),
              disabledBackgroundColor: AppConstants.accentColor.withValues(alpha: 0.45),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: parent.submitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.4, color: Color(0xFF0B1220)),
                  )
                : const Text(
                    'SUBMIT REVIEW',
                    style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.8),
                  ),
          ),
        ),
      ],
    );
  }
}

class _StarButton extends StatelessWidget {
  final bool selected;
  final VoidCallback onTap;

  const _StarButton({
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: selected
              ? AppConstants.accentColor.withValues(alpha: 0.18)
              : Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected
                ? AppConstants.accentColor.withValues(alpha: 0.7)
                : Colors.white.withValues(alpha: 0.08),
          ),
        ),
        child: Icon(
          selected ? Icons.star_rounded : Icons.star_outline_rounded,
          color: selected ? AppConstants.accentColor : Colors.white.withValues(alpha: 0.45),
          size: 28,
        ),
      ),
    );
  }
}
