-- Start / end odometer readings for driver trip start & close.
-- actual_distance_km = end_odometer_km - start_odometer_km (set on close).
-- Safe to re-run: checks information_schema before ALTER.

SET @db := DATABASE();

SET @has_start := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'start_odometer_km'
);
SET @sql_start := IF(
  @has_start = 0,
  'ALTER TABLE bookings ADD COLUMN start_odometer_km DECIMAL(10,2) NULL AFTER actual_distance_km',
  'SELECT 1'
);
PREPARE stmt_start FROM @sql_start;
EXECUTE stmt_start;
DEALLOCATE PREPARE stmt_start;

SET @has_end := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'end_odometer_km'
);
SET @sql_end := IF(
  @has_end = 0,
  'ALTER TABLE bookings ADD COLUMN end_odometer_km DECIMAL(10,2) NULL AFTER start_odometer_km',
  'SELECT 1'
);
PREPARE stmt_end FROM @sql_end;
EXECUTE stmt_end;
DEALLOCATE PREPARE stmt_end;
