import 'package:flutter_test/flutter_test.dart';
import 'package:yaazh_cabs/features/trips/domain/booking.dart';
import 'package:yaazh_cabs/features/trips/domain/trip_lifecycle.dart';

void main() {
  group('Booking.fromJson', () {
    test('maps serializeBooking fields', () {
      final booking = Booking.fromJson({
        'id': '42',
        'booking_reference': 'YZH-1001',
        'status': 'driver_assigned',
        'trip_type': 'one_way',
        'payment_status': 'unpaid',
        'customer_name': 'Arun',
        'customer_phone': '9876543210',
        'pickup_location': 'Udumalpet Bus Stand',
        'drop_location': 'Coimbatore Airport',
        'pickup_at': '2026-08-11T10:30:00.000Z',
        'estimated_total': '1250.00',
        'start_odometer_km': null,
        'end_odometer_km': null,
        'payment': {
          'fare_due': 1250,
          'amount_paid': 0,
          'balance_due': 1250,
          'payment_status': 'unpaid',
        },
      });

      expect(booking.bookingCode, 'YZH-1001');
      expect(booking.pickupAddress, 'Udumalpet Bus Stand');
      expect(booking.dropAddress, 'Coimbatore Airport');
      expect(booking.paymentStatus, 'unpaid');
      expect(booking.balanceDue, 1250);
      expect(booking.isActive, isTrue);
    });

    test('accepts legacy keys as fallback', () {
      final booking = Booking.fromJson({
        'id': '1',
        'booking_code': 'LEGACY',
        'pickup_address': 'A',
        'drop_address': 'B',
        'status': 'completed',
        'estimated_total': 100,
        'payment_status': 'paid',
        'customer_name': 'X',
        'customer_phone': '1',
      });
      expect(booking.bookingCode, 'LEGACY');
      expect(booking.pickupAddress, 'A');
      expect(booking.isCompleted, isTrue);
    });
  });

  group('TripStatusMapper', () {
    test('maps lifecycle steps', () {
      expect(
        TripStatusMapper.fromBackend('driver_assigned'),
        TripLifecycleStep.assigned,
      );
      expect(
        TripStatusMapper.fromBackend('trip_started'),
        TripLifecycleStep.rideStarted,
      );
      expect(
        TripStatusMapper.fromBackend('weird_status'),
        TripLifecycleStep.unknown,
      );
    });

    test('validates transitions', () {
      expect(
        TripStatusMapper.canTransition('driver_assigned', 'on_the_way'),
        isTrue,
      );
      expect(
        TripStatusMapper.canTransition('arrived', 'completed'),
        isFalse,
      );
    });
  });

  group('OdometerValidator', () {
    test('start rules', () {
      expect(OdometerValidator.validateStart(null), isNotNull);
      expect(OdometerValidator.validateStart(-1), isNotNull);
      expect(OdometerValidator.validateStart(12.5), isNull);
    });

    test('end rules', () {
      expect(
        OdometerValidator.validateEnd(endKm: 10, startKm: 20),
        isNotNull,
      );
      expect(
        OdometerValidator.validateEnd(endKm: 25, startKm: 20),
        isNull,
      );
    });
  });
}
