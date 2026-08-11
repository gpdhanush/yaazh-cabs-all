-- ============================================================
-- CAB BOOKING PLATFORM - PRODUCTION READY V2
-- MySQL 8.x
--
-- Scope:
--   User Website
--   Admin Panel
--   Backend APIs
--   Future Customer App
--   Future Driver App
--   FCM / Notifications
--   Live Trip Tracking
--   CMS / SEO
--   Billing / Invoices
--   Driver Wallet / Payouts
--
-- Currency: INR
-- Primary timezone: Asia/Kolkata
-- Date display in UI: DD-MMM-YYYY
--
-- IMPORTANT:
--   This script DROPS and recreates the database tables.
--   Use only for a fresh environment or intentional schema reset.
-- ============================================================

CREATE DATABASE IF NOT EXISTS yaazh_cab_booking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE yaazh_cab_booking;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- DROP TABLES - CHILD TABLES FIRST
-- ============================================================

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS support_ticket_messages;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS remote_config_values;
DROP TABLE IF EXISTS app_versions;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS notification_logs;
DROP TABLE IF EXISTS notification_templates;
DROP TABLE IF EXISTS seo_meta;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS blog_posts;
DROP TABLE IF EXISTS cms_pages;
DROP TABLE IF EXISTS contact_enquiries;
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS trip_ratings;
DROP TABLE IF EXISTS driver_payouts;
DROP TABLE IF EXISTS driver_wallet_transactions;
DROP TABLE IF EXISTS booking_invoices;
DROP TABLE IF EXISTS booking_charges;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS driver_locations;
DROP TABLE IF EXISTS trip_events;
DROP TABLE IF EXISTS booking_status_history;
DROP TABLE IF EXISTS booking_driver_offers;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS cancellation_policies;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS tariff_plans;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS cities;
DROP TABLE IF EXISTS driver_documents;
DROP TABLE IF EXISTS driver_vehicle_assignments;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS vehicle_categories;
DROP TABLE IF EXISTS app_devices;
DROP TABLE IF EXISTS auth_otp_requests;
DROP TABLE IF EXISTS customer_saved_places;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS admin_roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. ADMIN / RBAC
-- ============================================================

CREATE TABLE admin_roles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_admin_roles_active CHECK (is_active IN (0,1))
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  module VARCHAR(80) NOT NULL,
  action VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_permission (module, action)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE admin_users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  role_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_users_role
    FOREIGN KEY (role_id) REFERENCES admin_roles(id),
  CONSTRAINT chk_admin_users_active CHECK (is_active IN (0,1)),
  KEY idx_admin_users_role_active (role_id, is_active)
) ENGINE=InnoDB;

-- ============================================================
-- 2. CUSTOMERS / DRIVERS
-- ============================================================

CREATE TABLE customers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  alternate_phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NULL,
  profile_image_url VARCHAR(500) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  preferred_language ENUM('en','ta') NOT NULL DEFAULT 'en',
  referral_code VARCHAR(40) NULL UNIQUE,
  referred_by_customer_id BIGINT UNSIGNED NULL,
  email_verified_at DATETIME NULL,
  phone_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  app_status ENUM('active','blocked','deleted') NOT NULL DEFAULT 'active',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_referred_by
    FOREIGN KEY (referred_by_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT chk_customers_active CHECK (is_active IN (0,1)),
  KEY idx_customer_email (email),
  KEY idx_customer_status (app_status, is_active)
) ENGINE=InnoDB;

CREATE TABLE drivers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) NULL,
  password_hash VARCHAR(255) NULL,
  profile_image_url VARCHAR(500) NULL,
  license_no VARCHAR(80) NULL,
  license_expiry_date DATE NULL,
  address TEXT NULL,
  online_status ENUM('offline','online','busy') NOT NULL DEFAULT 'offline',
  availability_status ENUM('available','on_trip','on_leave','suspended') NOT NULL DEFAULT 'available',
  current_latitude DECIMAL(10,7) NULL,
  current_longitude DECIMAL(10,7) NULL,
  last_location_at DATETIME NULL,
  rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_completed_trips INT UNSIGNED NOT NULL DEFAULT 0,
  email_verified_at DATETIME NULL,
  phone_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  verification_status ENUM('pending','approved','rejected','blocked') NOT NULL DEFAULT 'pending',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_drivers_rating CHECK (rating_avg BETWEEN 0 AND 5),
  CONSTRAINT chk_drivers_active CHECK (is_active IN (0,1)),
  KEY idx_drivers_status (verification_status, online_status, availability_status),
  KEY idx_drivers_location (online_status, availability_status, last_location_at)
) ENGINE=InnoDB;

-- ============================================================
-- 3. AUTH / DEVICES
-- ============================================================

CREATE TABLE auth_otp_requests (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_type ENUM('customer','driver','admin') NOT NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose ENUM('login','register','forgot_password','verify_phone','verify_email') NOT NULL DEFAULT 'login',
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_otp_contact CHECK (
    (phone IS NOT NULL AND email IS NULL)
    OR
    (phone IS NULL AND email IS NOT NULL)
  ),
  CONSTRAINT chk_otp_attempts CHECK (attempts <= 10),
  KEY idx_otp_lookup (user_type, phone, purpose, expires_at),
  KEY idx_otp_email (user_type, email, purpose, expires_at),
  KEY idx_otp_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE app_devices (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_type ENUM('customer','driver','admin') NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  driver_id BIGINT UNSIGNED NULL,
  admin_user_id BIGINT UNSIGNED NULL,
  platform ENUM('android','ios','web') NOT NULL,
  device_uuid VARCHAR(120) NULL,
  fcm_token VARCHAR(500) NOT NULL,
  app_version VARCHAR(40) NULL,
  os_version VARCHAR(80) NULL,
  device_model VARCHAR(120) NULL,
  locale VARCHAR(20) NULL,
  timezone VARCHAR(80) NULL DEFAULT 'Asia/Kolkata',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_devices_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_devices_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_devices_admin
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT chk_app_devices_owner CHECK (
    (user_type = 'customer' AND customer_id IS NOT NULL AND driver_id IS NULL AND admin_user_id IS NULL)
    OR
    (user_type = 'driver' AND customer_id IS NULL AND driver_id IS NOT NULL AND admin_user_id IS NULL)
    OR
    (user_type = 'admin' AND customer_id IS NULL AND driver_id IS NULL AND admin_user_id IS NOT NULL)
  ),
  CONSTRAINT chk_app_devices_active CHECK (is_active IN (0,1)),
  UNIQUE KEY uq_app_devices_fcm_token (fcm_token),
  KEY idx_app_devices_user (user_type, customer_id, driver_id, admin_user_id),
  KEY idx_app_devices_active (platform, is_active)
) ENGINE=InnoDB;

CREATE TABLE customer_saved_places (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  label ENUM('home','work','other') NOT NULL DEFAULT 'other',
  title VARCHAR(120) NOT NULL,
  address VARCHAR(500) NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_saved_places_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT chk_saved_places_default CHECK (is_default IN (0,1)),
  KEY idx_saved_places_customer (customer_id)
) ENGINE=InnoDB;

-- ============================================================
-- 4. VEHICLES / DRIVER ASSIGNMENTS / DOCUMENTS
-- ============================================================

CREATE TABLE vehicle_categories (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  seating_capacity TINYINT UNSIGNED NOT NULL,
  luggage_capacity VARCHAR(80) NULL,
  description TEXT NULL,
  image_url VARCHAR(500) NULL,
  one_way_rate_per_km DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  round_trip_rate_per_km DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  driver_batta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  minimum_km_per_day DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_vehicle_category_rates CHECK (
    one_way_rate_per_km >= 0
    AND round_trip_rate_per_km >= 0
    AND driver_batta >= 0
    AND minimum_km_per_day >= 0
  ),
  CONSTRAINT chk_vehicle_category_active CHECK (is_active IN (0,1)),
  KEY idx_vehicle_categories_active_order (is_active, display_order)
) ENGINE=InnoDB;

CREATE TABLE vehicles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  vehicle_name VARCHAR(120) NOT NULL,
  registration_no VARCHAR(50) NULL UNIQUE,
  model_name VARCHAR(120) NULL,
  color VARCHAR(60) NULL,
  fuel_type ENUM('petrol','diesel','cng','electric','hybrid','other') NOT NULL DEFAULT 'diesel',
  rc_expiry_date DATE NULL,
  insurance_expiry_date DATE NULL,
  permit_expiry_date DATE NULL,
  pollution_expiry_date DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vehicles_category
    FOREIGN KEY (category_id) REFERENCES vehicle_categories(id),
  CONSTRAINT chk_vehicles_active CHECK (is_active IN (0,1)),
  KEY idx_vehicles_category_active (category_id, is_active),
  KEY idx_vehicles_expiry (rc_expiry_date, insurance_expiry_date, permit_expiry_date, pollution_expiry_date)
) ENGINE=InnoDB;

CREATE TABLE driver_vehicle_assignments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  driver_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  assigned_from DATETIME NOT NULL,
  assigned_to DATETIME NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 1,

  -- NULL when historical; populated only for current assignment.
  current_driver_key BIGINT UNSIGNED
    GENERATED ALWAYS AS (CASE WHEN is_current = 1 THEN driver_id ELSE NULL END) STORED,
  current_vehicle_key BIGINT UNSIGNED
    GENERATED ALWAYS AS (CASE WHEN is_current = 1 THEN vehicle_id ELSE NULL END) STORED,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_driver_vehicle_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_driver_vehicle_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT chk_driver_vehicle_dates CHECK (
    assigned_to IS NULL OR assigned_to >= assigned_from
  ),
  CONSTRAINT chk_driver_vehicle_current CHECK (
    (is_current = 1 AND assigned_to IS NULL)
    OR
    (is_current = 0)
  ),
  UNIQUE KEY uq_current_driver (current_driver_key),
  UNIQUE KEY uq_current_vehicle (current_vehicle_key),
  KEY idx_driver_vehicle_history (driver_id, assigned_from),
  KEY idx_vehicle_driver_history (vehicle_id, assigned_from)
) ENGINE=InnoDB;

CREATE TABLE driver_documents (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  driver_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NULL,
  document_type ENUM(
    'license','aadhaar','pan','rc','insurance',
    'permit','pollution','fitness','profile_photo','other'
  ) NOT NULL,
  document_no VARCHAR(120) NULL,
  file_url VARCHAR(500) NOT NULL,
  expiry_date DATE NULL,
  verification_status ENUM('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT NULL,
  verified_by_admin_id BIGINT UNSIGNED NULL,
  verified_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_driver_documents_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_driver_documents_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_driver_documents_admin
    FOREIGN KEY (verified_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  KEY idx_driver_documents_status (driver_id, document_type, verification_status, expiry_date),
  KEY idx_vehicle_documents_status (vehicle_id, document_type, verification_status, expiry_date)
) ENGINE=InnoDB;

-- ============================================================
-- 5. CITIES / ROUTES / TARIFF
-- ============================================================

CREATE TABLE cities (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  state VARCHAR(120) NOT NULL DEFAULT 'Tamil Nadu',
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_airport TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_cities_active CHECK (is_active IN (0,1)),
  CONSTRAINT chk_cities_airport CHECK (is_airport IN (0,1)),
  KEY idx_cities_name_active (name, is_active)
) ENGINE=InnoDB;

CREATE TABLE routes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  pickup_city_id BIGINT UNSIGNED NOT NULL,
  drop_city_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  distance_km DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration_minutes INT UNSIGNED NULL,
  route_map_embed_url TEXT NULL,
  content LONGTEXT NULL,
  faq_content LONGTEXT NULL,
  image_url VARCHAR(500) NULL,
  amount DECIMAL(10,2) NULL,
  is_popular TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_routes_pickup_city
    FOREIGN KEY (pickup_city_id) REFERENCES cities(id),
  CONSTRAINT fk_routes_drop_city
    FOREIGN KEY (drop_city_id) REFERENCES cities(id),
  CONSTRAINT chk_routes_different_cities CHECK (pickup_city_id <> drop_city_id),
  CONSTRAINT chk_routes_distance CHECK (distance_km >= 0),
  CONSTRAINT chk_routes_active CHECK (is_active IN (0,1)),
  CONSTRAINT chk_routes_popular CHECK (is_popular IN (0,1)),
  UNIQUE KEY uq_route_city_pair (pickup_city_id, drop_city_id),
  KEY idx_routes_popular (is_popular, is_active)
) ENGINE=InnoDB;

CREATE TABLE tariff_plans (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  vehicle_category_id BIGINT UNSIGNED NOT NULL,
  trip_type ENUM('one_way','round_trip','airport','outstation','local_rental') NOT NULL,
  route_id BIGINT UNSIGNED NULL,
  rate_per_km DECIMAL(10,2) NOT NULL,
  base_fare DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  driver_batta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  minimum_km DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  minimum_fare DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  extra_km_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  extra_hour_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  night_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  waiting_charge_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  permit_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  toll_included TINYINT(1) NOT NULL DEFAULT 0,
  parking_included TINYINT(1) NOT NULL DEFAULT 0,
  gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tariff_vehicle_category
    FOREIGN KEY (vehicle_category_id) REFERENCES vehicle_categories(id),
  CONSTRAINT fk_tariff_route
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
  CONSTRAINT chk_tariff_values CHECK (
    rate_per_km >= 0
    AND base_fare >= 0
    AND driver_batta >= 0
    AND minimum_km >= 0
    AND minimum_fare >= 0
    AND extra_km_rate >= 0
    AND extra_hour_rate >= 0
    AND night_charge >= 0
    AND waiting_charge_per_hour >= 0
    AND permit_charge >= 0
    AND gst_percentage BETWEEN 0 AND 100
  ),
  CONSTRAINT chk_tariff_dates CHECK (
    effective_to IS NULL OR effective_to >= effective_from
  ),
  KEY idx_tariff_lookup (vehicle_category_id, trip_type, route_id, is_active, effective_from)
) ENGINE=InnoDB;

-- ============================================================
-- 6. COUPONS / CANCELLATION POLICY
-- ============================================================

CREATE TABLE coupons (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  discount_type ENUM('flat','percentage') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount_amount DECIMAL(10,2) NULL,
  min_booking_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  usage_limit INT UNSIGNED NULL,
  per_customer_limit INT UNSIGNED NULL,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  valid_from DATETIME NOT NULL,
  valid_to DATETIME NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_coupon_discount CHECK (
    discount_value >= 0
    AND (max_discount_amount IS NULL OR max_discount_amount >= 0)
    AND min_booking_amount >= 0
  ),
  CONSTRAINT chk_coupon_percentage CHECK (
    discount_type <> 'percentage' OR discount_value <= 100
  ),
  CONSTRAINT chk_coupon_dates CHECK (valid_to >= valid_from),
  CONSTRAINT chk_coupon_active CHECK (is_active IN (0,1)),
  KEY idx_coupons_validity (is_active, valid_from, valid_to)
) ENGINE=InnoDB;

CREATE TABLE cancellation_policies (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  trip_type ENUM('one_way','round_trip','airport','outstation','local_rental','all') NOT NULL DEFAULT 'all',
  cancelled_by_type ENUM('customer','driver','admin','system') NOT NULL,
  minimum_hours_before_pickup DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  cancellation_fee_type ENUM('flat','percentage','none') NOT NULL DEFAULT 'none',
  cancellation_fee_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_fee_amount DECIMAL(10,2) NULL,
  priority INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_cancel_policy_hours CHECK (minimum_hours_before_pickup >= 0),
  CONSTRAINT chk_cancel_policy_fee CHECK (
    cancellation_fee_value >= 0
    AND (max_fee_amount IS NULL OR max_fee_amount >= 0)
  ),
  CONSTRAINT chk_cancel_policy_percentage CHECK (
    cancellation_fee_type <> 'percentage'
    OR cancellation_fee_value <= 100
  ),
  KEY idx_cancel_policy_lookup (trip_type, cancelled_by_type, is_active, priority)
) ENGINE=InnoDB;

-- ============================================================
-- 7. BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_reference VARCHAR(30) NOT NULL UNIQUE,

  customer_id BIGINT UNSIGNED NULL,
  assigned_driver_id BIGINT UNSIGNED NULL,
  assigned_vehicle_id BIGINT UNSIGNED NULL,
  vehicle_category_id BIGINT UNSIGNED NOT NULL,
  route_id BIGINT UNSIGNED NULL,
  coupon_id BIGINT UNSIGNED NULL,

  trip_type ENUM('one_way','round_trip','airport','outstation','local_rental') NOT NULL,
  booking_source ENUM('website','admin','phone','whatsapp','customer_app','driver_app') NOT NULL DEFAULT 'website',

  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(150) NULL,

  pickup_location VARCHAR(255) NOT NULL,
  drop_location VARCHAR(255) NOT NULL,
  pickup_city VARCHAR(120) NULL,
  drop_city VARCHAR(120) NULL,

  pickup_latitude DECIMAL(10,7) NULL,
  pickup_longitude DECIMAL(10,7) NULL,
  drop_latitude DECIMAL(10,7) NULL,
  drop_longitude DECIMAL(10,7) NULL,

  pickup_at DATETIME NOT NULL,
  return_at DATETIME NULL,

  passenger_count TINYINT UNSIGNED NULL,
  luggage_note VARCHAR(255) NULL,
  special_note TEXT NULL,

  estimated_distance_km DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  actual_distance_km DECIMAL(10,2) NULL,
  start_odometer_km DECIMAL(10,2) NULL,
  end_odometer_km DECIMAL(10,2) NULL,
  estimated_duration_minutes INT UNSIGNED NULL,
  actual_duration_minutes INT UNSIGNED NULL,

  -- Fare snapshot. These values must not change when tariff changes later.
  rate_per_km DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  base_fare DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  driver_batta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  minimum_fare DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  extra_km_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  extra_hour_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  toll_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  parking_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  permit_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  night_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  waiting_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  estimated_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  final_total DECIMAL(10,2) NULL,

  payment_status ENUM('unpaid','partial','paid','refunded','failed') NOT NULL DEFAULT 'unpaid',

  status ENUM(
    'pending',
    'confirmed',
    'driver_notified',
    'driver_accepted',
    'driver_rejected',
    'driver_assigned',
    'on_the_way',
    'arrived',
    'trip_started',
    'completed',
    'cancelled',
    'rejected',
    'no_show'
  ) NOT NULL DEFAULT 'pending',

  cancellation_reason TEXT NULL,
  cancelled_by_type ENUM('customer','driver','admin','system') NULL,

  admin_note TEXT NULL,
  confirmed_at DATETIME NULL,
  completed_at DATETIME NULL,
  cancelled_at DATETIME NULL,

  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_bookings_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_driver
    FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_vehicle
    FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_vehicle_category
    FOREIGN KEY (vehicle_category_id) REFERENCES vehicle_categories(id),
  CONSTRAINT fk_bookings_route
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_created_admin
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,

  CONSTRAINT chk_bookings_return_datetime CHECK (
    return_at IS NULL OR return_at >= pickup_at
  ),
  CONSTRAINT chk_bookings_fares CHECK (
    rate_per_km >= 0
    AND base_fare >= 0
    AND driver_batta >= 0
    AND minimum_fare >= 0
    AND extra_km_charge >= 0
    AND extra_hour_charge >= 0
    AND toll_amount >= 0
    AND parking_amount >= 0
    AND permit_amount >= 0
    AND night_charge >= 0
    AND waiting_charge >= 0
    AND discount_amount >= 0
    AND gst_amount >= 0
    AND estimated_total >= 0
    AND (final_total IS NULL OR final_total >= 0)
  ),
  CONSTRAINT chk_bookings_gst CHECK (gst_percentage BETWEEN 0 AND 100),

  KEY idx_bookings_status_date (status, pickup_at),
  KEY idx_bookings_customer (customer_id, created_at),
  KEY idx_bookings_driver_date (assigned_driver_id, pickup_at),
  KEY idx_bookings_customer_phone (customer_phone),
  KEY idx_bookings_payment_status (payment_status),
  KEY idx_bookings_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE booking_driver_offers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  driver_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NULL,
  offer_type ENUM('manual_assign','broadcast','nearby_driver') NOT NULL DEFAULT 'manual_assign',
  offered_fare DECIMAL(10,2) NULL,
  status ENUM('sent','seen','accepted','rejected','expired','cancelled') NOT NULL DEFAULT 'sent',
  rejection_reason VARCHAR(255) NULL,
  sent_by_admin_id BIGINT UNSIGNED NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seen_at DATETIME NULL,
  responded_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_booking_offers_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_offers_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_offers_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_offers_admin
    FOREIGN KEY (sent_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_booking_offer_fare CHECK (
    offered_fare IS NULL OR offered_fare >= 0
  ),

  -- Multiple offer attempts to the same driver are intentionally allowed.
  KEY idx_booking_driver_offer_lookup (booking_id, driver_id, created_at),
  KEY idx_booking_offers_status (status, expires_at)
) ENGINE=InnoDB;

CREATE TABLE booking_status_history (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  old_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NOT NULL,
  note TEXT NULL,
  changed_by_type ENUM('system','admin','customer','driver') NOT NULL DEFAULT 'system',
  changed_by_admin_id BIGINT UNSIGNED NULL,
  changed_by_customer_id BIGINT UNSIGNED NULL,
  changed_by_driver_id BIGINT UNSIGNED NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_booking_history_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_history_admin
    FOREIGN KEY (changed_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_history_customer
    FOREIGN KEY (changed_by_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_history_driver
    FOREIGN KEY (changed_by_driver_id) REFERENCES drivers(id) ON DELETE SET NULL,

  CONSTRAINT chk_booking_history_actor CHECK (
    (changed_by_type = 'system'
      AND changed_by_admin_id IS NULL
      AND changed_by_customer_id IS NULL
      AND changed_by_driver_id IS NULL)
    OR
    (changed_by_type = 'admin'
      AND changed_by_admin_id IS NOT NULL
      AND changed_by_customer_id IS NULL
      AND changed_by_driver_id IS NULL)
    OR
    (changed_by_type = 'customer'
      AND changed_by_admin_id IS NULL
      AND changed_by_customer_id IS NOT NULL
      AND changed_by_driver_id IS NULL)
    OR
    (changed_by_type = 'driver'
      AND changed_by_admin_id IS NULL
      AND changed_by_customer_id IS NULL
      AND changed_by_driver_id IS NOT NULL)
  ),

  KEY idx_booking_history_booking (booking_id, changed_at)
) ENGINE=InnoDB;

-- ============================================================
-- 8. TRIP EVENTS / LIVE LOCATION
-- ============================================================

CREATE TABLE trip_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  driver_id BIGINT UNSIGNED NULL,
  event_type ENUM(
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
    'customer_rated'
  ) NOT NULL,
  event_note TEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  event_payload JSON NULL,
  created_by_type ENUM('system','admin','customer','driver') NOT NULL DEFAULT 'system',
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_trip_events_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_events_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT fk_trip_events_admin
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,

  KEY idx_trip_events_booking (booking_id, created_at),
  KEY idx_trip_events_driver (driver_id, created_at),
  KEY idx_trip_events_type (event_type, created_at)
) ENGINE=InnoDB;

CREATE TABLE driver_locations (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  driver_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  heading DECIMAL(6,2) NULL,
  speed_kmph DECIMAL(6,2) NULL,
  accuracy_meters DECIMAL(8,2) NULL,
  battery_percentage TINYINT UNSIGNED NULL,
  recorded_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_driver_locations_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_driver_locations_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  CONSTRAINT chk_driver_locations_battery CHECK (
    battery_percentage IS NULL OR battery_percentage <= 100
  ),

  KEY idx_driver_locations_latest (driver_id, recorded_at),
  KEY idx_driver_locations_booking (booking_id, recorded_at)
) ENGINE=InnoDB;

-- ============================================================
-- 9. PAYMENTS / BOOKING CHARGES / INVOICES
-- ============================================================

CREATE TABLE payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  payment_reference VARCHAR(120) NULL UNIQUE,
  gateway VARCHAR(80) NULL,
  method ENUM('cash','upi','card','netbanking','wallet','bank_transfer','other') NOT NULL DEFAULT 'cash',
  payment_type ENUM('advance','partial','final','refund','other') NOT NULL DEFAULT 'other',
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  gateway_response JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT chk_payments_amount CHECK (amount > 0),

  KEY idx_payments_booking (booking_id, status, created_at),
  KEY idx_payments_status (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE booking_charges (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  charge_type ENUM(
    'base_fare',
    'distance',
    'minimum_fare',
    'driver_batta',
    'extra_km',
    'extra_hour',
    'toll',
    'parking',
    'permit',
    'night',
    'waiting',
    'discount',
    'gst',
    'other'
  ) NOT NULL,
  amount_type ENUM('estimated','final') NOT NULL DEFAULT 'final',
  description VARCHAR(255) NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_booking_charges_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT chk_booking_charges_amount CHECK (amount >= 0),

  KEY idx_booking_charges_booking (booking_id, amount_type, charge_type)
) ENGINE=InnoDB;

CREATE TABLE booking_invoices (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
  invoice_number VARCHAR(80) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  taxable_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('draft','issued','paid','partially_paid','cancelled') NOT NULL DEFAULT 'draft',
  pdf_url VARCHAR(500) NULL,
  issued_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_booking_invoices_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT chk_booking_invoice_amounts CHECK (
    subtotal >= 0
    AND discount_amount >= 0
    AND taxable_amount >= 0
    AND gst_amount >= 0
    AND total_amount >= 0
    AND amount_paid >= 0
    AND balance_amount >= 0
    AND gst_percentage BETWEEN 0 AND 100
  ),

  KEY idx_invoices_date_status (invoice_date, status)
) ENGINE=InnoDB;

-- ============================================================
-- 10. DRIVER WALLET / PAYOUTS
-- ============================================================

CREATE TABLE driver_wallet_transactions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  driver_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  transaction_type ENUM('credit','debit') NOT NULL,
  source_type ENUM(
    'trip_earning',
    'commission',
    'payout',
    'adjustment',
    'penalty',
    'refund'
  ) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NULL,
  reference_code VARCHAR(120) NULL,
  note VARCHAR(255) NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_driver_wallet_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_driver_wallet_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  CONSTRAINT fk_driver_wallet_admin
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_driver_wallet_amount CHECK (amount > 0),

  KEY idx_driver_wallet_driver_date (driver_id, created_at),
  KEY idx_driver_wallet_booking (booking_id),
  KEY idx_driver_wallet_reference (reference_code)
) ENGINE=InnoDB;

CREATE TABLE driver_payouts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  driver_id BIGINT UNSIGNED NOT NULL,
  payout_reference VARCHAR(120) NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('cash','upi','bank_transfer','other') NOT NULL DEFAULT 'upi',
  status ENUM('pending','approved','paid','rejected','cancelled') NOT NULL DEFAULT 'pending',
  requested_at DATETIME NULL,
  approved_by_admin_id BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  paid_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_driver_payouts_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_driver_payouts_admin
    FOREIGN KEY (approved_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_driver_payouts_amount CHECK (amount > 0),

  KEY idx_driver_payouts_driver (driver_id, created_at),
  KEY idx_driver_payouts_status (status, created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 11. RATINGS / WEBSITE TESTIMONIALS
-- ============================================================

CREATE TABLE trip_ratings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NULL,
  driver_id BIGINT UNSIGNED NULL,
  customer_rating TINYINT UNSIGNED NULL,
  customer_review TEXT NULL,
  driver_rating TINYINT UNSIGNED NULL,
  driver_review TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_trip_ratings_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_ratings_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_trip_ratings_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT chk_trip_ratings_customer CHECK (
    customer_rating IS NULL OR customer_rating BETWEEN 1 AND 5
  ),
  CONSTRAINT chk_trip_ratings_driver CHECK (
    driver_rating IS NULL OR driver_rating BETWEEN 1 AND 5
  ),

  KEY idx_trip_ratings_driver (driver_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE testimonials (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(20) NULL,
  rating TINYINT UNSIGNED NOT NULL,
  review TEXT NOT NULL,
  admin_reply TEXT NULL,
  approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  approved_by_admin_id BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_testimonials_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_testimonials_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  CONSTRAINT fk_testimonials_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_testimonials_admin
    FOREIGN KEY (approved_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,

  KEY idx_testimonials_public (approval_status, is_featured)
) ENGINE=InnoDB;

-- ============================================================
-- 12. CONTACT / CMS / BLOG / FAQ / SEO
-- ============================================================

CREATE TABLE contact_enquiries (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(20) NULL,
  subject VARCHAR(180) NULL,
  message TEXT NOT NULL,
  status ENUM('new','in_progress','closed','spam') NOT NULL DEFAULT 'new',
  assigned_admin_id BIGINT UNSIGNED NULL,
  admin_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_contact_admin
    FOREIGN KEY (assigned_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,

  KEY idx_contact_status (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE cms_pages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  page_type ENUM('static','service','policy','landing') NOT NULL DEFAULT 'static',
  excerpt TEXT NULL,
  content LONGTEXT NULL,
  banner_image_url VARCHAR(500) NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_cms_created_admin
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_updated_admin
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,

  KEY idx_cms_status (status, published_at)
) ENGINE=InnoDB;

CREATE TABLE blog_posts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  excerpt TEXT NULL,
  content LONGTEXT NOT NULL,
  featured_image_url VARCHAR(500) NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  author_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_blog_author
    FOREIGN KEY (author_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,

  KEY idx_blog_status_date (status, published_at)
) ENGINE=InnoDB;

CREATE TABLE faqs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) NULL,
  related_type ENUM('general','route','service') NOT NULL DEFAULT 'general',
  route_id BIGINT UNSIGNED NULL,
  cms_page_id BIGINT UNSIGNED NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_faq_route
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT fk_faq_cms
    FOREIGN KEY (cms_page_id) REFERENCES cms_pages(id) ON DELETE CASCADE,

  CONSTRAINT chk_faq_relation CHECK (
    (related_type = 'general' AND route_id IS NULL AND cms_page_id IS NULL)
    OR
    (related_type = 'route' AND route_id IS NOT NULL AND cms_page_id IS NULL)
    OR
    (related_type = 'service' AND route_id IS NULL AND cms_page_id IS NOT NULL)
  ),

  KEY idx_faq_public (related_type, is_active, display_order)
) ENGINE=InnoDB;

CREATE TABLE seo_meta (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  entity_type ENUM('home','cms_page','blog_post','route','vehicle_category','custom') NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  url_path VARCHAR(255) NOT NULL UNIQUE,
  meta_title VARCHAR(255) NULL,
  meta_description VARCHAR(500) NULL,
  canonical_url VARCHAR(500) NULL,
  og_title VARCHAR(255) NULL,
  og_description VARCHAR(500) NULL,
  og_image_url VARCHAR(500) NULL,
  schema_json JSON NULL,
  robots_index TINYINT(1) NOT NULL DEFAULT 1,
  robots_follow TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_seo_robots CHECK (
    robots_index IN (0,1) AND robots_follow IN (0,1)
  ),

  KEY idx_seo_entity (entity_type, entity_id)
) ENGINE=InnoDB;

-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================

CREATE TABLE notification_templates (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  template_key VARCHAR(100) NOT NULL UNIQUE,
  channel ENUM('push','in_app','email','sms','whatsapp') NOT NULL,
  recipient_type ENUM('customer','driver','admin','all') NOT NULL DEFAULT 'customer',
  subject VARCHAR(180) NULL,
  title VARCHAR(180) NULL,
  body TEXT NOT NULL,
  deep_link VARCHAR(500) NULL,
  variables JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE notification_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  template_id BIGINT UNSIGNED NULL,
  booking_id BIGINT UNSIGNED NULL,

  sender_type ENUM('system','admin') NOT NULL DEFAULT 'system',
  sender_admin_id BIGINT UNSIGNED NULL,

  recipient_type ENUM('customer','driver','admin') NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  driver_id BIGINT UNSIGNED NULL,
  admin_user_id BIGINT UNSIGNED NULL,
  device_id BIGINT UNSIGNED NULL,

  channel ENUM('push','in_app','email','sms','whatsapp') NOT NULL,
  title VARCHAR(180) NULL,
  body TEXT NOT NULL,
  data_payload JSON NULL,

  delivery_status ENUM(
    'queued','sent','delivered','read','failed','cancelled'
  ) NOT NULL DEFAULT 'queued',

  provider_message_id VARCHAR(180) NULL,
  error_message TEXT NULL,
  scheduled_at DATETIME NULL,
  sent_at DATETIME NULL,
  delivered_at DATETIME NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notification_logs_template
    FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_notification_logs_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  CONSTRAINT fk_notification_logs_sender_admin
    FOREIGN KEY (sender_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_notification_logs_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_logs_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_logs_admin
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_logs_device
    FOREIGN KEY (device_id) REFERENCES app_devices(id) ON DELETE SET NULL,

  CONSTRAINT chk_notification_sender CHECK (
    (sender_type = 'system' AND sender_admin_id IS NULL)
    OR
    (sender_type = 'admin' AND sender_admin_id IS NOT NULL)
  ),

  CONSTRAINT chk_notification_recipient CHECK (
    (recipient_type = 'customer'
      AND customer_id IS NOT NULL
      AND driver_id IS NULL
      AND admin_user_id IS NULL)
    OR
    (recipient_type = 'driver'
      AND customer_id IS NULL
      AND driver_id IS NOT NULL
      AND admin_user_id IS NULL)
    OR
    (recipient_type = 'admin'
      AND customer_id IS NULL
      AND driver_id IS NULL
      AND admin_user_id IS NOT NULL)
  ),

  KEY idx_notifications_recipient (
    recipient_type, customer_id, driver_id, admin_user_id, delivery_status
  ),
  KEY idx_notifications_booking (booking_id),
  KEY idx_notifications_scheduled (delivery_status, scheduled_at)
) ENGINE=InnoDB;

-- ============================================================
-- 14. APP SETTINGS / VERSION / REMOTE CONFIG
-- ============================================================

CREATE TABLE app_settings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(120) NOT NULL UNIQUE,
  setting_value TEXT NULL,
  value_type ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  group_name VARCHAR(80) NOT NULL DEFAULT 'general',
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_app_settings_public CHECK (is_public IN (0,1))
) ENGINE=InnoDB;

CREATE TABLE app_versions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  app_type ENUM('customer_app','driver_app','admin_web','user_website') NOT NULL,
  platform ENUM('android','ios','web') NOT NULL,
  latest_version VARCHAR(40) NOT NULL,
  minimum_supported_version VARCHAR(40) NULL,
  force_update TINYINT(1) NOT NULL DEFAULT 0,
  update_title VARCHAR(180) NULL,
  update_message TEXT NULL,
  store_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_app_versions_flags CHECK (
    force_update IN (0,1) AND is_active IN (0,1)
  ),
  UNIQUE KEY uq_app_versions (app_type, platform)
) ENGINE=InnoDB;

CREATE TABLE remote_config_values (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(120) NOT NULL,
  app_type ENUM('customer_app','driver_app','admin_web','user_website','all') NOT NULL DEFAULT 'all',
  platform ENUM('android','ios','web','all') NOT NULL DEFAULT 'all',
  value_type ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  config_value TEXT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_remote_config_active CHECK (is_active IN (0,1)),
  UNIQUE KEY uq_remote_config (config_key, app_type, platform)
) ENGINE=InnoDB;

-- ============================================================
-- 15. SUPPORT
-- ============================================================

CREATE TABLE support_tickets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_reference VARCHAR(40) NOT NULL UNIQUE,
  booking_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NULL,
  driver_id BIGINT UNSIGNED NULL,
  raised_by_type ENUM('customer','driver','admin') NOT NULL,
  subject VARCHAR(180) NOT NULL,
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status ENUM('open','in_progress','waiting_for_user','resolved','closed') NOT NULL DEFAULT 'open',
  assigned_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,

  CONSTRAINT fk_support_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  CONSTRAINT fk_support_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_support_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT fk_support_admin
    FOREIGN KEY (assigned_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,

  CONSTRAINT chk_support_raiser CHECK (
    (raised_by_type = 'customer'
      AND customer_id IS NOT NULL
      AND driver_id IS NULL)
    OR
    (raised_by_type = 'driver'
      AND customer_id IS NULL
      AND driver_id IS NOT NULL)
    OR
    (raised_by_type = 'admin'
      AND customer_id IS NULL
      AND driver_id IS NULL)
  ),

  KEY idx_support_status (status, priority, created_at),
  KEY idx_support_customer (customer_id, created_at),
  KEY idx_support_driver (driver_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE support_ticket_messages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  sender_type ENUM('customer','driver','admin','system') NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  driver_id BIGINT UNSIGNED NULL,
  admin_user_id BIGINT UNSIGNED NULL,
  message TEXT NOT NULL,
  attachment_url VARCHAR(500) NULL,
  is_internal_note TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_support_messages_ticket
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_support_messages_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_support_messages_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT fk_support_messages_admin
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,

  CONSTRAINT chk_support_message_sender CHECK (
    (sender_type = 'customer'
      AND customer_id IS NOT NULL
      AND driver_id IS NULL
      AND admin_user_id IS NULL)
    OR
    (sender_type = 'driver'
      AND customer_id IS NULL
      AND driver_id IS NOT NULL
      AND admin_user_id IS NULL)
    OR
    (sender_type = 'admin'
      AND customer_id IS NULL
      AND driver_id IS NULL
      AND admin_user_id IS NOT NULL)
    OR
    (sender_type = 'system'
      AND customer_id IS NULL
      AND driver_id IS NULL
      AND admin_user_id IS NULL)
  ),

  CONSTRAINT chk_support_internal_note CHECK (
    is_internal_note IN (0,1)
  ),

  KEY idx_support_messages_ticket (ticket_id, created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 16. AUDIT LOG
-- ============================================================

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  admin_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id BIGINT UNSIGNED NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audit_admin
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,

  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_admin_date (admin_user_id, created_at),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 17. SEED - ROLES
-- ============================================================

INSERT INTO admin_roles (id, name, description) VALUES
  (1, 'Super Admin', 'Full access to all admin modules'),
  (2, 'Booking Manager', 'Manage bookings, customers, drivers and enquiries'),
  (3, 'Content Manager', 'Manage website content, SEO, blogs and FAQs'),
  (4, 'Operations Manager', 'Manage drivers, vehicles, assignments and trips'),
  (5, 'Accounts Manager', 'Manage payments, invoices, wallet and payouts');

-- ============================================================
-- 18. SEED - PERMISSIONS
-- ============================================================

INSERT INTO permissions (module, action, label) VALUES
  ('dashboard', 'view', 'View Dashboard'),
  ('bookings', 'view', 'View Bookings'),
  ('bookings', 'create', 'Create Bookings'),
  ('bookings', 'update', 'Update Bookings'),
  ('bookings', 'delete', 'Delete Bookings'),
  ('bookings', 'cancel', 'Cancel Bookings'),
  ('customers', 'view', 'View Customers'),
  ('customers', 'manage', 'Manage Customers'),
  ('drivers', 'view', 'View Drivers'),
  ('drivers', 'manage', 'Manage Drivers'),
  ('driver_documents', 'verify', 'Verify Driver Documents'),
  ('driver_offers', 'manage', 'Manage Driver Booking Offers'),
  ('vehicles', 'manage', 'Manage Vehicles'),
  ('vehicle_categories', 'manage', 'Manage Vehicle Categories'),
  ('driver_assignments', 'manage', 'Manage Driver Vehicle Assignments'),
  ('tariff', 'manage', 'Manage Tariff'),
  ('routes', 'manage', 'Manage Routes'),
  ('coupons', 'manage', 'Manage Coupons'),
  ('cancellation_policies', 'manage', 'Manage Cancellation Policies'),
  ('payments', 'view', 'View Payments'),
  ('invoices', 'manage', 'Manage Invoices'),
  ('driver_wallet', 'manage', 'Manage Driver Wallet'),
  ('driver_payouts', 'manage', 'Manage Driver Payouts'),
  ('reviews', 'approve', 'Approve Reviews'),
  ('notifications', 'send', 'Send Notifications'),
  ('support', 'manage', 'Manage Support Tickets'),
  ('remote_config', 'manage', 'Manage Remote Config'),
  ('app_versions', 'manage', 'Manage App Versions'),
  ('cms', 'manage', 'Manage CMS'),
  ('blog', 'manage', 'Manage Blog'),
  ('faq', 'manage', 'Manage FAQs'),
  ('seo', 'manage', 'Manage SEO'),
  ('reports', 'view', 'View Reports'),
  ('settings', 'manage', 'Manage Settings'),
  ('audit_logs', 'view', 'View Audit Logs');

-- Super Admin gets everything.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Booking Manager.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id
FROM permissions
WHERE module IN (
  'dashboard','bookings','customers','drivers','driver_offers',
  'support','notifications','reports'
);

-- Content Manager.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id
FROM permissions
WHERE module IN ('dashboard','cms','blog','faq','seo','reviews');

-- Operations Manager.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id
FROM permissions
WHERE module IN (
  'dashboard','bookings','drivers','driver_documents',
  'driver_offers','vehicles','vehicle_categories',
  'driver_assignments','routes','reports'
);

-- Accounts Manager.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id
FROM permissions
WHERE module IN (
  'dashboard','payments','invoices','driver_wallet',
  'driver_payouts','reports'
);

-- ============================================================
-- 19. SEED - VEHICLE CATEGORIES
-- ============================================================

INSERT INTO vehicle_categories
  (
    name, slug, seating_capacity, luggage_capacity, description,
    one_way_rate_per_km, round_trip_rate_per_km,
    driver_batta, minimum_km_per_day, display_order
  )
VALUES
  (
    'Sedan 4+1', 'sedan-4-1', 4, '2 bags',
    'Standard AC sedan for small family trips',
    15.00, 14.00, 500.00, 250.00, 1
  ),
  (
    'Ertiga 6+1', 'ertiga-6-1', 6, '3 bags',
    'Comfortable 6 seater AC cab',
    20.00, 19.00, 500.00, 250.00, 2
  ),
  (
    'Innova 6+1', 'innova-6-1', 6, '4 bags',
    'Premium AC cab for family outstation trips',
    20.00, 19.00, 500.00, 250.00, 3
  ),
  (
    'Crysta 7+1', 'crysta-7-1', 7, '4 bags',
    'Premium spacious AC cab',
    22.00, 20.00, 500.00, 250.00, 4
  );

-- ============================================================
-- 20. SEED - CITIES
-- ============================================================

INSERT INTO cities (name, slug, state, is_active) VALUES
  ('Chennai', 'chennai', 'Tamil Nadu', 1),
  ('Madurai', 'madurai', 'Tamil Nadu', 1),
  ('Coimbatore', 'coimbatore', 'Tamil Nadu', 1),
  ('Trichy', 'trichy', 'Tamil Nadu', 1),
  ('Salem', 'salem', 'Tamil Nadu', 1),
  ('Bangalore', 'bangalore', 'Karnataka', 1);

-- ============================================================
-- 21. SEED - ROUTES
-- Lookup by slug instead of assuming auto-increment IDs.
-- ============================================================

INSERT INTO routes
  (
    pickup_city_id, drop_city_id, slug, title,
    distance_km, duration_minutes, is_popular, is_active
  )
SELECT
  c1.id,
  c2.id,
  'chennai-to-madurai-cabs',
  'Chennai to Madurai Cabs',
  462.00,
  480,
  1,
  1
FROM cities c1
JOIN cities c2
WHERE c1.slug = 'chennai'
  AND c2.slug = 'madurai';

INSERT INTO routes
  (
    pickup_city_id, drop_city_id, slug, title,
    distance_km, duration_minutes, is_popular, is_active
  )
SELECT
  c1.id,
  c2.id,
  'chennai-to-coimbatore-cabs',
  'Chennai to Coimbatore Cabs',
  507.00,
  540,
  1,
  1
FROM cities c1
JOIN cities c2
WHERE c1.slug = 'chennai'
  AND c2.slug = 'coimbatore';

INSERT INTO routes
  (
    pickup_city_id, drop_city_id, slug, title,
    distance_km, duration_minutes, is_popular, is_active
  )
SELECT
  c1.id,
  c2.id,
  'chennai-to-trichy-cabs',
  'Chennai to Trichy Cabs',
  331.00,
  360,
  1,
  1
FROM cities c1
JOIN cities c2
WHERE c1.slug = 'chennai'
  AND c2.slug = 'trichy';

INSERT INTO routes
  (
    pickup_city_id, drop_city_id, slug, title,
    distance_km, duration_minutes, is_popular, is_active
  )
SELECT
  c1.id,
  c2.id,
  'madurai-to-chennai-cabs',
  'Madurai to Chennai Cabs',
  462.00,
  480,
  1,
  1
FROM cities c1
JOIN cities c2
WHERE c1.slug = 'madurai'
  AND c2.slug = 'chennai';

-- ============================================================
-- 22. SEED - GENERIC TARIFF PLANS
-- ============================================================

INSERT INTO tariff_plans
  (
    vehicle_category_id, trip_type, route_id,
    rate_per_km, base_fare, driver_batta,
    minimum_km, minimum_fare,
    effective_from
  )
SELECT
  id,
  'one_way',
  NULL,
  one_way_rate_per_km,
  0.00,
  driver_batta,
  0.00,
  0.00,
  CURRENT_DATE
FROM vehicle_categories;

INSERT INTO tariff_plans
  (
    vehicle_category_id, trip_type, route_id,
    rate_per_km, base_fare, driver_batta,
    minimum_km, minimum_fare,
    effective_from
  )
SELECT
  id,
  'round_trip',
  NULL,
  round_trip_rate_per_km,
  0.00,
  driver_batta,
  minimum_km_per_day,
  0.00,
  CURRENT_DATE
FROM vehicle_categories;

-- ============================================================
-- 23. SEED - CMS
-- ============================================================

INSERT INTO cms_pages
  (title, slug, page_type, content, status, published_at)
VALUES
  ('About Us', 'about-us', 'static',
   'About company content goes here.', 'published', NOW()),

  ('One Way Taxi', 'one-way-taxi', 'service',
   'One way taxi service content goes here.', 'published', NOW()),

  ('Round Trip Taxi', 'round-trip-taxi', 'service',
   'Round trip taxi service content goes here.', 'published', NOW()),

  ('Airport Taxi', 'airport-taxi', 'service',
   'Airport taxi service content goes here.', 'published', NOW()),

  ('Privacy Policy', 'privacy-policy', 'policy',
   'Privacy policy content goes here.', 'published', NOW()),

  ('Terms and Conditions', 'terms-and-conditions', 'policy',
   'Terms content goes here.', 'published', NOW());

-- ============================================================
-- 24. SEED - NOTIFICATION TEMPLATES
-- ============================================================

INSERT INTO notification_templates
  (
    template_key, channel, recipient_type,
    subject, title, body, deep_link, variables
  )
VALUES
  (
    'booking_created_email',
    'email',
    'customer',
    'Booking Request Received',
    NULL,
    'Hi {{customer_name}}, your booking {{booking_reference}} has been received.',
    NULL,
    JSON_ARRAY('customer_name','booking_reference')
  ),
  (
    'booking_created_push_user',
    'push',
    'customer',
    NULL,
    'Booking received',
    'Your booking {{booking_reference}} has been received.',
    'cabapp://bookings/{{booking_id}}',
    JSON_ARRAY('booking_reference','booking_id')
  ),
  (
    'booking_confirmed_sms',
    'sms',
    'customer',
    NULL,
    NULL,
    'Your cab booking {{booking_reference}} is confirmed. Pickup: {{pickup_at}}',
    NULL,
    JSON_ARRAY('booking_reference','pickup_at')
  ),
  (
    'booking_confirmed_push_user',
    'push',
    'customer',
    NULL,
    'Booking confirmed',
    'Your cab booking {{booking_reference}} is confirmed.',
    'cabapp://bookings/{{booking_id}}',
    JSON_ARRAY('booking_reference','booking_id')
  ),
  (
    'booking_cancelled_sms',
    'sms',
    'customer',
    NULL,
    NULL,
    'Your cab booking {{booking_reference}} has been cancelled. Reason: {{reason}}',
    NULL,
    JSON_ARRAY('booking_reference','reason')
  ),
  (
    'booking_cancelled_push_user',
    'push',
    'customer',
    NULL,
    'Booking cancelled',
    'Your booking {{booking_reference}} has been cancelled.',
    'cabapp://bookings/{{booking_id}}',
    JSON_ARRAY('booking_reference','booking_id')
  ),
  (
    'new_booking_admin_push',
    'push',
    'admin',
    NULL,
    'New booking',
    'New booking {{booking_reference}} from {{customer_name}}.',
    'admin://bookings/{{booking_id}}',
    JSON_ARRAY('booking_reference','booking_id','customer_name')
  ),
  (
    'driver_booking_offer_push',
    'push',
    'driver',
    NULL,
    'New trip request',
    'Trip request: {{pickup_location}} to {{drop_location}}.',
    'driverapp://offers/{{offer_id}}',
    JSON_ARRAY('offer_id','booking_id','pickup_location','drop_location')
  ),
  (
    'driver_assigned_push_user',
    'push',
    'customer',
    NULL,
    'Driver assigned',
    '{{driver_name}} has been assigned for booking {{booking_reference}}.',
    'cabapp://bookings/{{booking_id}}',
    JSON_ARRAY('driver_name','booking_reference','booking_id')
  ),
  (
    'driver_accepted_admin_push',
    'push',
    'admin',
    NULL,
    'Driver accepted',
    '{{driver_name}} accepted booking {{booking_reference}}.',
    'admin://bookings/{{booking_id}}',
    JSON_ARRAY('driver_name','booking_reference','booking_id')
  ),
  (
    'trip_started_push_user',
    'push',
    'customer',
    NULL,
    'Trip started',
    'Your trip {{booking_reference}} has started.',
    'cabapp://bookings/{{booking_id}}',
    JSON_ARRAY('booking_reference','booking_id')
  ),
  (
    'trip_completed_push_user',
    'push',
    'customer',
    NULL,
    'Trip completed',
    'Your trip is completed. Please share your feedback.',
    'cabapp://feedback/{{booking_id}}',
    JSON_ARRAY('booking_id')
  );

-- ============================================================
-- 25. SEED - APP SETTINGS
-- ============================================================

INSERT INTO app_settings
  (setting_key, setting_value, value_type, group_name, is_public)
VALUES
  ('company_name', 'Your Cab Company', 'string', 'company', 1),
  ('support_phone', '+91XXXXXXXXXX', 'string', 'company', 1),
  ('support_email', 'support@example.com', 'string', 'company', 1),
  ('whatsapp_number', '+91XXXXXXXXXX', 'string', 'company', 1),
  ('currency_code', 'INR', 'string', 'localization', 1),
  ('currency_symbol', '₹', 'string', 'localization', 1),
  ('timezone', 'Asia/Kolkata', 'string', 'localization', 1),
  ('date_format', 'DD-MMM-YYYY', 'string', 'localization', 1),
  ('booking_prefix', 'CAB', 'string', 'booking', 0),
  ('auto_confirm_booking', 'false', 'boolean', 'booking', 0),
  ('default_gst_percentage', '0', 'number', 'fare', 0),
  ('fcm_enabled', 'true', 'boolean', 'notification', 0),
  ('driver_offer_expiry_seconds', '60', 'number', 'booking', 0),
  ('nearby_driver_search_radius_km', '10', 'number', 'booking', 0),
  ('location_tracking_enabled', 'false', 'boolean', 'mobile_app', 0),
  ('customer_app_enabled', 'false', 'boolean', 'mobile_app', 1),
  ('driver_app_enabled', 'false', 'boolean', 'mobile_app', 1);

-- ============================================================
-- 26. SEED - APP VERSIONS
-- ============================================================

INSERT INTO app_versions
  (
    app_type, platform, latest_version,
    minimum_supported_version, force_update,
    update_title, update_message, store_url
  )
VALUES
  (
    'customer_app', 'android', '1.0.0', '1.0.0', 0,
    'Update available',
    'Please update the app for a better booking experience.',
    NULL
  ),
  (
    'customer_app', 'ios', '1.0.0', '1.0.0', 0,
    'Update available',
    'Please update the app for a better booking experience.',
    NULL
  ),
  (
    'driver_app', 'android', '1.0.0', '1.0.0', 0,
    'Update available',
    'Please update the driver app for new trip features.',
    NULL
  ),
  (
    'driver_app', 'ios', '1.0.0', '1.0.0', 0,
    'Update available',
    'Please update the driver app for new trip features.',
    NULL
  );

-- ============================================================
-- 27. SEED - REMOTE CONFIG
-- ============================================================

INSERT INTO remote_config_values
  (
    config_key, app_type, platform,
    value_type, config_value, description, is_active
  )
VALUES
  (
    'maintenance_mode', 'all', 'all',
    'boolean', 'false',
    'Temporarily disable public booking/app features during maintenance.',
    1
  ),
  (
    'home_offer_banner_enabled', 'all', 'all',
    'boolean', 'true',
    'Show offer banner on website and future mobile apps.',
    1
  ),
  (
    'home_offer_banner_text', 'all', 'all',
    'string', 'Get special offers on cab bookings.',
    'Offer banner text.',
    1
  ),
  (
    'booking_cancellation_enabled', 'customer_app', 'all',
    'boolean', 'true',
    'Allow users to cancel booking from app.',
    1
  ),
  (
    'driver_auto_offer_enabled', 'driver_app', 'all',
    'boolean', 'false',
    'Enable automatic nearby driver broadcast.',
    1
  ),
  (
    'live_tracking_enabled', 'all', 'all',
    'boolean', 'false',
    'Enable live trip location tracking when mobile apps are implemented.',
    1
  ),
  (
    'support_whatsapp_enabled', 'all', 'all',
    'boolean', 'true',
    'Show WhatsApp support option.',
    1
  );

-- ============================================================
-- 28. BASIC DEVELOPMENT VERIFICATION
-- ============================================================

-- Confirm expected core tables exist.
SELECT
  COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

-- Confirm seed counts.
SELECT 'admin_roles' AS table_name, COUNT(*) AS row_count FROM admin_roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'vehicle_categories', COUNT(*) FROM vehicle_categories
UNION ALL
SELECT 'cities', COUNT(*) FROM cities
UNION ALL
SELECT 'routes', COUNT(*) FROM routes
UNION ALL
SELECT 'tariff_plans', COUNT(*) FROM tariff_plans
UNION ALL
SELECT 'cms_pages', COUNT(*) FROM cms_pages
UNION ALL
SELECT 'notification_templates', COUNT(*) FROM notification_templates
UNION ALL
SELECT 'app_settings', COUNT(*) FROM app_settings
UNION ALL
SELECT 'app_versions', COUNT(*) FROM app_versions
UNION ALL
SELECT 'remote_config_values', COUNT(*) FROM remote_config_values;

-- ============================================================
-- BOOKING REFERENCE
--
-- Generate in backend/API, not with a database trigger.
--
-- Example:
--   CAB202608100001
--
-- Recommended:
--   prefix + YYYYMMDD + zero-padded sequence/random suffix.
--
-- Always enforce uniqueness using bookings.booking_reference.
-- ============================================================

-- ============================================================
-- IMPORTANT PRODUCTION NOTES
--
-- 1. Never store plaintext passwords or OTPs.
--    Use Argon2id/bcrypt for passwords and hashed OTP values.
--
-- 2. Coupon usage must be updated inside a transaction with
--    appropriate row locking to prevent race conditions.
--
-- 3. Driver vehicle assignment changes should be transactional.
--
-- 4. Booking status changes should create a booking_status_history row.
--
-- 5. Fare values stored in bookings are snapshots and must not be
--    recalculated from today's tariff for old bookings.
--
-- 6. driver_locations can become very large. Add retention/archive
--    strategy and partitioning later if volume becomes high.
--
-- 7. Audit logs should be append-only from the application.
--
-- 8. Do not expose private app_settings or remote_config values
--    marked is_public = 0 through public APIs.
--
-- 9. Use transactions for booking confirmation, driver assignment,
--    payment recording, invoice creation and wallet updates.
--
-- 10. Back up production data before every schema migration.
-- ============================================================
