-- Allow discount / fare edits to be recorded on trip_events.
-- Safe to re-run: skips if fare_adjusted is already in the ENUM.

SET @db := DATABASE();

SET @has_fare := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'trip_events'
    AND COLUMN_NAME = 'event_type'
    AND COLUMN_TYPE LIKE '%fare_adjusted%'
);

SET @sql_fare := IF(
  @has_fare = 0,
  "ALTER TABLE trip_events MODIFY COLUMN event_type ENUM(
    'driver_notified',
    'driver_accepted',
    'driver_rejected',
    'driver_assigned',
    'driver_started_to_pickup',
    'driver_arrived',
    'otp_verified',
    'trip_started',
    'stop_added',
    'trip_completed',
    'trip_cancelled',
    'payment_collected',
    'customer_rated',
    'fare_adjusted'
  ) NOT NULL",
  'SELECT 1'
);

PREPARE stmt_fare FROM @sql_fare;
EXECUTE stmt_fare;
DEALLOCATE PREPARE stmt_fare;
