-- Additive infrastructure tables for cPanel shared hosting (no Redis).
-- Does NOT modify business tables from cab_booking_production_v2.sql.

USE yaazh_cab_booking;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_type ENUM('customer','driver','admin') NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  driver_id BIGINT UNSIGNED NULL,
  admin_user_id BIGINT UNSIGNED NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_name VARCHAR(120) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  last_used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_auth_sessions_hash (refresh_token_hash),
  KEY idx_auth_sessions_user (user_type, customer_id, driver_id, admin_user_id),
  KEY idx_auth_sessions_expires (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  idempotency_key VARCHAR(120) NOT NULL,
  user_type ENUM('customer','driver','admin','public') NOT NULL DEFAULT 'public',
  user_id BIGINT UNSIGNED NULL,
  route VARCHAR(200) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  response_code INT NOT NULL,
  response_body JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  UNIQUE KEY uq_idempotency_key (idempotency_key),
  KEY idx_idempotency_expires (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_queue (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  job_type VARCHAR(80) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
  available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at DATETIME NULL,
  locked_by VARCHAR(120) NULL,
  last_error TEXT NULL,
  idempotency_key VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_job_idempotency (idempotency_key),
  KEY idx_job_queue_poll (status, available_at, id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS route_estimate_cache (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cache_key VARCHAR(64) NOT NULL UNIQUE,
  pickup_latitude DECIMAL(10,7) NOT NULL,
  pickup_longitude DECIMAL(10,7) NOT NULL,
  drop_latitude DECIMAL(10,7) NOT NULL,
  drop_longitude DECIMAL(10,7) NOT NULL,
  distance_km DECIMAL(10,2) NOT NULL,
  duration_minutes INT UNSIGNED NOT NULL,
  provider VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  KEY idx_route_estimate_expires (expires_at)
) ENGINE=InnoDB;
