-- Add website card image + fixed display amount on routes.
-- Safe to re-run: checks information_schema before ALTER.

USE yaazh_cab_booking;

SET @db := DATABASE();

SET @has_image := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'routes' AND COLUMN_NAME = 'image_url'
);
SET @sql_image := IF(
  @has_image = 0,
  'ALTER TABLE routes ADD COLUMN image_url VARCHAR(500) NULL AFTER faq_content',
  'SELECT 1'
);
PREPARE stmt_image FROM @sql_image;
EXECUTE stmt_image;
DEALLOCATE PREPARE stmt_image;

SET @has_amount := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'routes' AND COLUMN_NAME = 'amount'
);
SET @sql_amount := IF(
  @has_amount = 0,
  'ALTER TABLE routes ADD COLUMN amount DECIMAL(10,2) NULL AFTER image_url',
  'SELECT 1'
);
PREPARE stmt_amount FROM @sql_amount;
EXECUTE stmt_amount;
DEALLOCATE PREPARE stmt_amount;
