-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 03, 2026 at 07:54 PM
-- Server version: 11.4.12-MariaDB-cll-lve
-- PHP Version: 8.4.24

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `yaazhcab_booking`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_profile_photos`
--

CREATE TABLE `admin_profile_photos` (
  `admin_id` bigint(20) UNSIGNED NOT NULL,
  `mime_type` varchar(64) NOT NULL,
  `data_base64` longtext NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_roles`
--

CREATE TABLE `admin_roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `admin_roles`
--

INSERT INTO `admin_roles` (`id`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', 'Full access to all admin modules', 1, '2026-09-01 09:19:45', NULL),
(2, 'Booking Manager', 'Manage bookings, customers, drivers and enquiries', 1, '2026-09-01 09:19:45', NULL),
(3, 'Content Manager', 'Manage website content, SEO, blogs and FAQs', 1, '2026-09-01 09:19:45', NULL),
(4, 'Operations Manager', 'Manage drivers, vehicles, assignments and trips', 1, '2026-09-01 09:19:45', NULL),
(5, 'Accounts Manager', 'Manage payments, invoices, wallet and payouts', 1, '2026-09-01 09:19:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `admin_users`
--

CREATE TABLE `admin_users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `role_id`, `name`, `email`, `phone`, `password_hash`, `avatar_url`, `is_active`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'Yaazh Admin', 'admin@yaazh.in', '9360055761', '$argon2id$v=19$m=65536,t=3,p=4$EhmK++slHVlp2wGlrEDq6g$TR3gT/4eBmlZk1cjt7ibZIfXZNgmRFjm6NMJnEUFyP0', '/api/v1/public/admins/1/photo', 1, '2026-09-02 14:24:33', '2026-08-10 06:26:18', '2026-09-02 08:54:33'),
(2, 1, 'Super Admin', 'admin@yaazh.local', NULL, '$argon2id$v=19$m=65536,t=3,p=4$naZRq5DR7HHVL910jPW33Q$WborSLF6Dl7ghh9TquUNUjwcn4NRMiGg5nIPLiKrHFk', NULL, 1, NULL, '2026-09-02 08:52:34', '2026-09-02 08:52:34');

-- --------------------------------------------------------

--
-- Table structure for table `app_devices`
--

CREATE TABLE `app_devices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_type` enum('customer','driver','admin') NOT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `admin_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `platform` enum('android','ios','web') NOT NULL,
  `device_uuid` varchar(120) DEFAULT NULL,
  `fcm_token` varchar(500) NOT NULL,
  `app_version` varchar(40) DEFAULT NULL,
  `os_version` varchar(80) DEFAULT NULL,
  `device_model` varchar(120) DEFAULT NULL,
  `locale` varchar(20) DEFAULT NULL,
  `timezone` varchar(80) DEFAULT 'Asia/Kolkata',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_seen_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `app_settings`
--

CREATE TABLE `app_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `setting_key` varchar(120) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `value_type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
  `group_name` varchar(80) NOT NULL DEFAULT 'general',
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `app_settings`
--

INSERT INTO `app_settings` (`id`, `setting_key`, `setting_value`, `value_type`, `group_name`, `is_public`, `created_at`, `updated_at`) VALUES
(1, 'company_name', 'Yaazh Cabs', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:36'),
(2, 'support_phone', '9360055761', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:37'),
(3, 'support_email', 'hello@yaazhcabs.in', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:38'),
(4, 'whatsapp_number', '917845456609', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:38'),
(5, 'support_phone_secondary', '6369022364', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:37'),
(6, 'business_address', 'Udumalpet, Tiruppur District, Tamil Nadu 642126', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:39'),
(7, 'business_hours', 'Open 24×7', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:39'),
(8, 'currency_code', 'INR', 'string', 'localization', 1, '2026-09-01 09:19:45', NULL),
(9, 'currency_symbol', '₹', 'string', 'localization', 1, '2026-09-01 09:19:45', NULL),
(10, 'timezone', 'Asia/Kolkata', 'string', 'localization', 1, '2026-09-01 09:19:45', NULL),
(11, 'date_format', 'DD-MMM-YYYY', 'string', 'localization', 1, '2026-09-01 09:19:45', NULL),
(12, 'booking_prefix', 'CAB', 'string', 'booking', 0, '2026-09-01 09:19:45', NULL),
(13, 'auto_confirm_booking', 'true', 'boolean', 'booking', 0, '2026-09-01 09:19:45', NULL),
(14, 'default_gst_percentage', '0', 'number', 'fare', 0, '2026-09-01 09:19:45', NULL),
(15, 'booking_fare_note', 'Note: Toll, parking & permit charges are extra and billed at actuals.', 'string', 'fare', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:40'),
(16, 'fcm_enabled', 'true', 'boolean', 'notification', 0, '2026-09-01 09:19:45', NULL),
(17, 'driver_offer_expiry_seconds', '60', 'number', 'booking', 0, '2026-09-01 09:19:45', NULL),
(18, 'nearby_driver_search_radius_km', '10', 'number', 'booking', 0, '2026-09-01 09:19:45', NULL),
(19, 'location_tracking_enabled', 'true', 'boolean', 'mobile_app', 0, '2026-09-01 09:19:45', NULL),
(20, 'customer_app_enabled', 'true', 'boolean', 'mobile_app', 1, '2026-09-01 09:19:45', NULL),
(21, 'driver_app_enabled', 'true', 'boolean', 'mobile_app', 1, '2026-09-01 09:19:45', NULL),
(22, 'maps_share_url', 'https://maps.app.goo.gl/EUCRv1piSHwJybDD7?g_st=aw', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:41'),
(23, 'map_lat', '10.551642', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:41'),
(24, 'map_lng', '77.306707', 'string', 'company', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:42'),
(25, 'primary_color', '#ffc107', 'string', 'branding', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:43'),
(26, 'secondary_color', '#1f2933', 'string', 'branding', 1, '2026-09-01 09:19:45', '2026-09-02 08:52:43'),
(27, 'admin_primary_color', '#009688', 'string', 'admin_branding', 0, '2026-09-01 09:19:45', '2026-09-02 08:52:44'),
(28, 'admin_secondary_color', '#111827', 'string', 'admin_branding', 0, '2026-09-01 09:19:45', '2026-09-02 08:52:44'),
(29, 'created_by_name', 'G.K. Tech', 'string', 'website', 1, '2026-09-02 08:52:42', '2026-09-02 08:52:42'),
(30, 'created_by_url', 'https://gpdhanush.github.io/portfolio/', 'string', 'website', 1, '2026-09-02 08:52:43', '2026-09-02 08:52:43');

-- --------------------------------------------------------

--
-- Table structure for table `app_versions`
--

CREATE TABLE `app_versions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `app_type` enum('customer_app','driver_app','admin_web','user_website') NOT NULL,
  `platform` enum('android','ios','web') NOT NULL,
  `latest_version` varchar(40) NOT NULL,
  `minimum_supported_version` varchar(40) DEFAULT NULL,
  `force_update` tinyint(1) NOT NULL DEFAULT 0,
  `update_title` varchar(180) DEFAULT NULL,
  `update_message` text DEFAULT NULL,
  `store_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `app_versions`
--

INSERT INTO `app_versions` (`id`, `app_type`, `platform`, `latest_version`, `minimum_supported_version`, `force_update`, `update_title`, `update_message`, `store_url`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'customer_app', 'android', '1.0.0', '1.0.0', 0, 'Update available', 'Please update the app for a better booking experience.', NULL, 1, '2026-09-01 09:19:45', NULL),
(2, 'customer_app', 'ios', '1.0.0', '1.0.0', 0, 'Update available', 'Please update the app for a better booking experience.', NULL, 1, '2026-09-01 09:19:45', NULL),
(3, 'driver_app', 'android', '1.0.0', '1.0.0', 0, 'Update available', 'Please update the driver app for new trip features.', NULL, 1, '2026-09-01 09:19:45', NULL),
(4, 'driver_app', 'ios', '1.0.0', '1.0.0', 0, 'Update available', 'Please update the driver app for new trip features.', NULL, 1, '2026-09-01 09:19:45', NULL),
(5, 'admin_web', 'web', '1.0.0', '1.0.0', 0, 'Update available', 'Admin panel update available.', NULL, 1, '2026-09-01 09:19:45', NULL),
(6, 'user_website', 'web', '1.0.0', '1.0.0', 0, 'Update available', 'Website update available.', NULL, 1, '2026-09-01 09:19:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `admin_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` varchar(120) NOT NULL,
  `entity_type` varchar(80) DEFAULT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auth_otp_requests`
--

CREATE TABLE `auth_otp_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_type` enum('customer','driver','admin') NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `otp_hash` varchar(255) NOT NULL,
  `purpose` enum('login','register','forgot_password','verify_phone','verify_email') NOT NULL DEFAULT 'login',
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `auth_sessions`
--

CREATE TABLE `auth_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_type` enum('customer','driver','admin') NOT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `admin_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `refresh_token_hash` varchar(255) NOT NULL,
  `device_name` varchar(120) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `auth_sessions`
--

INSERT INTO `auth_sessions` (`id`, `user_type`, `customer_id`, `driver_id`, `admin_user_id`, `refresh_token_hash`, `device_name`, `ip_address`, `user_agent`, `expires_at`, `revoked_at`, `last_used_at`, `created_at`) VALUES
(1, 'admin', NULL, NULL, 1, '0c43aff250fc6d7e6d6be6cd18491e055c7de74e48ef6014ae1854cc0737dbb7', NULL, '127.0.0.1', 'bruno-runtime/4.1.0', '2026-10-02 12:51:36', NULL, '2026-09-02 12:51:36', '2026-09-02 07:21:36'),
(2, 'admin', NULL, NULL, 1, 'caf7cc2c9cda870e67a778f3c17d66b88361f0682472818e9f878b2b6b01e7cb', NULL, '127.0.0.1', 'bruno-runtime/4.1.0', '2026-10-02 14:24:34', '2026-09-02 14:24:45', '2026-09-02 14:24:34', '2026-09-02 08:54:34'),
(3, 'admin', NULL, NULL, 1, 'c0d5f2a978cef8b80e165f8b14ec57d90d2e761bdb26a3192f6d2208c1cb5535', NULL, '127.0.0.1', 'bruno-runtime/4.1.0', '2026-10-02 14:24:46', NULL, '2026-09-02 14:24:46', '2026-09-02 08:54:46');

-- --------------------------------------------------------

--
-- Table structure for table `blog_posts`
--

CREATE TABLE `blog_posts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `slug` varchar(220) NOT NULL,
  `excerpt` text DEFAULT NULL,
  `content` longtext NOT NULL,
  `featured_image_url` varchar(500) DEFAULT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `published_at` datetime DEFAULT NULL,
  `author_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `booking_reference` varchar(30) NOT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_vehicle_id` bigint(20) UNSIGNED DEFAULT NULL,
  `vehicle_category_id` bigint(20) UNSIGNED NOT NULL,
  `route_id` bigint(20) UNSIGNED DEFAULT NULL,
  `coupon_id` bigint(20) UNSIGNED DEFAULT NULL,
  `trip_type` enum('one_way','round_trip','airport','outstation','local_rental') NOT NULL,
  `booking_source` enum('website','admin','phone','whatsapp','customer_app','driver_app') NOT NULL DEFAULT 'website',
  `customer_name` varchar(120) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `customer_email` varchar(150) DEFAULT NULL,
  `pickup_location` varchar(255) NOT NULL,
  `drop_location` varchar(255) NOT NULL,
  `pickup_city` varchar(120) DEFAULT NULL,
  `drop_city` varchar(120) DEFAULT NULL,
  `pickup_latitude` decimal(10,7) DEFAULT NULL,
  `pickup_longitude` decimal(10,7) DEFAULT NULL,
  `drop_latitude` decimal(10,7) DEFAULT NULL,
  `drop_longitude` decimal(10,7) DEFAULT NULL,
  `pickup_at` datetime NOT NULL,
  `return_at` datetime DEFAULT NULL,
  `passenger_count` tinyint(3) UNSIGNED DEFAULT NULL,
  `luggage_note` varchar(255) DEFAULT NULL,
  `special_note` text DEFAULT NULL,
  `estimated_distance_km` decimal(10,2) NOT NULL DEFAULT 0.00,
  `actual_distance_km` decimal(10,2) DEFAULT NULL,
  `start_odometer_km` decimal(10,2) DEFAULT NULL,
  `end_odometer_km` decimal(10,2) DEFAULT NULL,
  `estimated_duration_minutes` int(10) UNSIGNED DEFAULT NULL,
  `actual_duration_minutes` int(10) UNSIGNED DEFAULT NULL,
  `rate_per_km` decimal(10,2) NOT NULL DEFAULT 0.00,
  `base_fare` decimal(10,2) NOT NULL DEFAULT 0.00,
  `driver_batta` decimal(10,2) NOT NULL DEFAULT 0.00,
  `minimum_fare` decimal(10,2) NOT NULL DEFAULT 0.00,
  `extra_km_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
  `extra_hour_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
  `toll_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `parking_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `permit_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `night_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
  `waiting_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `gst_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estimated_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `final_total` decimal(10,2) DEFAULT NULL,
  `payment_status` enum('unpaid','partial','paid','refunded','failed') NOT NULL DEFAULT 'unpaid',
  `status` enum('pending','confirmed','driver_notified','driver_accepted','driver_rejected','driver_assigned','on_the_way','arrived','trip_started','completed','cancelled','rejected','no_show') NOT NULL DEFAULT 'pending',
  `cancellation_reason` text DEFAULT NULL,
  `cancelled_by_type` enum('customer','driver','admin','system') DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `booking_charges`
--

CREATE TABLE `booking_charges` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `charge_type` enum('base_fare','distance','minimum_fare','driver_batta','extra_km','extra_hour','toll','parking','permit','night','waiting','discount','gst','other') NOT NULL,
  `amount_type` enum('estimated','final') NOT NULL DEFAULT 'final',
  `description` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `booking_driver_offers`
--

CREATE TABLE `booking_driver_offers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `driver_id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED DEFAULT NULL,
  `offer_type` enum('manual_assign','broadcast','nearby_driver') NOT NULL DEFAULT 'manual_assign',
  `offered_fare` decimal(10,2) DEFAULT NULL,
  `status` enum('sent','seen','accepted','rejected','expired','cancelled') NOT NULL DEFAULT 'sent',
  `rejection_reason` varchar(255) DEFAULT NULL,
  `sent_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `sent_at` datetime NOT NULL DEFAULT current_timestamp(),
  `seen_at` datetime DEFAULT NULL,
  `responded_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `booking_invoices`
--

CREATE TABLE `booking_invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `invoice_number` varchar(80) NOT NULL,
  `invoice_date` date NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `taxable_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `gst_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `balance_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `status` enum('draft','issued','paid','partially_paid','cancelled') NOT NULL DEFAULT 'draft',
  `pdf_url` varchar(500) DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `booking_status_history`
--

CREATE TABLE `booking_status_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `note` text DEFAULT NULL,
  `changed_by_type` enum('system','admin','customer','driver') NOT NULL DEFAULT 'system',
  `changed_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `changed_by_customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `changed_by_driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cancellation_policies`
--

CREATE TABLE `cancellation_policies` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `trip_type` enum('one_way','round_trip','airport','outstation','local_rental','all') NOT NULL DEFAULT 'all',
  `cancelled_by_type` enum('customer','driver','admin','system') NOT NULL,
  `minimum_hours_before_pickup` decimal(6,2) NOT NULL DEFAULT 0.00,
  `cancellation_fee_type` enum('flat','percentage','none') NOT NULL DEFAULT 'none',
  `cancellation_fee_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `max_fee_amount` decimal(10,2) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `cities`
--

CREATE TABLE `cities` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `slug` varchar(140) NOT NULL,
  `state` varchar(120) NOT NULL DEFAULT 'Tamil Nadu',
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `is_airport` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `cities`
--

INSERT INTO `cities` (`id`, `name`, `slug`, `state`, `latitude`, `longitude`, `is_airport`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Chennai', 'chennai', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-01 09:19:45', NULL),
(2, 'Madurai', 'madurai', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-01 09:19:45', NULL),
(3, 'Coimbatore', 'coimbatore', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-01 09:19:45', NULL),
(4, 'Trichy', 'trichy', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-01 09:19:45', NULL),
(5, 'Salem', 'salem', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-01 09:19:45', NULL),
(6, 'Bangalore', 'bangalore', 'Karnataka', NULL, NULL, 0, 1, '2026-09-01 09:19:45', NULL),
(7, 'Udumalpet', 'udumalpet', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-01 09:19:45', NULL),
(8, 'Tiruppur', 'tiruppur', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-01 09:19:45', NULL),
(9, 'Palani', 'palani', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-02 08:52:47', '2026-09-02 08:52:47'),
(10, 'Dindigul', 'dindigul', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-02 08:52:49', '2026-09-02 08:52:49'),
(11, 'Munnar', 'munnar', 'Kerala', NULL, NULL, 0, 1, '2026-09-02 08:52:49', '2026-09-02 08:52:49'),
(12, 'Theni', 'theni', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-02 08:52:50', '2026-09-02 08:52:50'),
(13, 'Erode', 'erode', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-02 08:52:50', '2026-09-02 08:52:50'),
(14, 'Karur', 'karur', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-02 08:52:51', '2026-09-02 08:52:51'),
(15, 'Pollachi', 'pollachi', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-02 08:52:51', '2026-09-02 08:52:51'),
(16, 'Ooty', 'ooty', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-02 08:52:52', '2026-09-02 08:52:52'),
(17, 'Kodaikanal', 'kodaikanal', 'Tamil Nadu', NULL, NULL, 0, 1, '2026-09-02 08:52:52', '2026-09-02 08:52:52');

-- --------------------------------------------------------

--
-- Table structure for table `cms_pages`
--

CREATE TABLE `cms_pages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(180) NOT NULL,
  `slug` varchar(200) NOT NULL,
  `page_type` enum('static','service','policy','landing') NOT NULL DEFAULT 'static',
  `excerpt` text DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `banner_image_url` varchar(500) DEFAULT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `published_at` datetime DEFAULT NULL,
  `created_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cms_pages`
--

INSERT INTO `cms_pages` (`id`, `title`, `slug`, `page_type`, `excerpt`, `content`, `banner_image_url`, `status`, `published_at`, `created_by_admin_id`, `updated_by_admin_id`, `created_at`, `updated_at`) VALUES
(1, 'About Us', 'about-us', 'static', NULL, 'About Yaazh Cabs company and our mission.', NULL, 'published', '2026-09-01 14:49:45', NULL, NULL, '2026-09-01 09:19:45', NULL),
(2, 'One Way Taxi', 'one-way-taxi', 'service', NULL, 'Professional one-way cab service across Tamil Nadu.', NULL, 'published', '2026-09-01 14:49:45', NULL, NULL, '2026-09-01 09:19:45', NULL),
(3, 'Round Trip Taxi', 'round-trip-taxi', 'service', NULL, 'Economical round trip cab booking service.', NULL, 'published', '2026-09-01 14:49:45', NULL, NULL, '2026-09-01 09:19:45', NULL),
(4, 'Airport Taxi', 'airport-taxi', 'service', NULL, 'Reliable airport transfer and taxi service.', NULL, 'published', '2026-09-01 14:49:45', NULL, NULL, '2026-09-01 09:19:45', NULL),
(5, 'Privacy Policy', 'privacy-policy', 'policy', NULL, 'Your privacy is important to us.', NULL, 'published', '2026-09-01 14:49:45', NULL, NULL, '2026-09-01 09:19:45', NULL),
(6, 'Terms and Conditions', 'terms-and-conditions', 'policy', NULL, 'Please read our terms of service carefully.', NULL, 'published', '2026-09-01 14:49:45', NULL, NULL, '2026-09-01 09:19:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `contact_enquiries`
--

CREATE TABLE `contact_enquiries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `subject` varchar(180) DEFAULT NULL,
  `message` text NOT NULL,
  `status` enum('new','in_progress','closed','spam') NOT NULL DEFAULT 'new',
  `assigned_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coupons`
--

CREATE TABLE `coupons` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `title` varchar(150) NOT NULL,
  `discount_type` enum('flat','percentage') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `max_discount_amount` decimal(10,2) DEFAULT NULL,
  `min_booking_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `usage_limit` int(10) UNSIGNED DEFAULT NULL,
  `per_customer_limit` int(10) UNSIGNED DEFAULT NULL,
  `used_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `valid_from` datetime NOT NULL,
  `valid_to` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `alternate_phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `profile_image_url` varchar(500) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `preferred_language` enum('en','ta') NOT NULL DEFAULT 'en',
  `referral_code` varchar(40) DEFAULT NULL,
  `referred_by_customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `phone_verified_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `app_status` enum('active','blocked','deleted') NOT NULL DEFAULT 'active',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `customer_saved_places`
--

CREATE TABLE `customer_saved_places` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `label` enum('home','work','other') NOT NULL DEFAULT 'other',
  `title` varchar(120) NOT NULL,
  `address` varchar(500) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `drivers`
--

CREATE TABLE `drivers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `profile_image_url` varchar(500) DEFAULT NULL,
  `license_no` varchar(80) DEFAULT NULL,
  `license_expiry_date` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `online_status` enum('offline','online','busy') NOT NULL DEFAULT 'offline',
  `availability_status` enum('available','on_trip','on_leave','suspended') NOT NULL DEFAULT 'available',
  `current_latitude` decimal(10,7) DEFAULT NULL,
  `current_longitude` decimal(10,7) DEFAULT NULL,
  `last_location_at` datetime DEFAULT NULL,
  `rating_avg` decimal(3,2) NOT NULL DEFAULT 0.00,
  `total_completed_trips` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `email_verified_at` datetime DEFAULT NULL,
  `phone_verified_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `verification_status` enum('pending','approved','rejected','blocked') NOT NULL DEFAULT 'pending',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `drivers`
--

INSERT INTO `drivers` (`id`, `name`, `phone`, `email`, `password_hash`, `profile_image_url`, `license_no`, `license_expiry_date`, `address`, `online_status`, `availability_status`, `current_latitude`, `current_longitude`, `last_location_at`, `rating_avg`, `total_completed_trips`, `email_verified_at`, `phone_verified_at`, `last_login_at`, `verification_status`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Demo Driver', '9000000001', NULL, '$argon2id$v=19$m=65536,t=3,p=4$V3o95yknxXS/Ymk8OEjUqA$jJWoFuh9QtMHOqFga9QNqlpBLpLLvszaZlad1IhiUzc', NULL, NULL, NULL, NULL, 'offline', 'available', NULL, NULL, NULL, 0.00, 0, NULL, NULL, NULL, 'approved', 1, '2026-09-02 08:52:36', '2026-09-02 08:52:36');

-- --------------------------------------------------------

--
-- Table structure for table `driver_documents`
--

CREATE TABLE `driver_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `driver_id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED DEFAULT NULL,
  `document_type` enum('license','aadhaar','pan','rc','insurance','permit','pollution','fitness','profile_photo','other') NOT NULL,
  `document_no` varchar(120) DEFAULT NULL,
  `file_url` varchar(500) NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `verification_status` enum('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
  `rejection_reason` text DEFAULT NULL,
  `verified_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `driver_locations`
--

CREATE TABLE `driver_locations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `driver_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `heading` decimal(6,2) DEFAULT NULL,
  `speed_kmph` decimal(6,2) DEFAULT NULL,
  `accuracy_meters` decimal(8,2) DEFAULT NULL,
  `battery_percentage` tinyint(3) UNSIGNED DEFAULT NULL,
  `recorded_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `driver_payouts`
--

CREATE TABLE `driver_payouts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `driver_id` bigint(20) UNSIGNED NOT NULL,
  `payout_reference` varchar(120) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('cash','upi','bank_transfer','other') NOT NULL DEFAULT 'upi',
  `status` enum('pending','approved','paid','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `requested_at` datetime DEFAULT NULL,
  `approved_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `driver_vehicle_assignments`
--

CREATE TABLE `driver_vehicle_assignments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `driver_id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED NOT NULL,
  `assigned_from` datetime NOT NULL,
  `assigned_to` datetime DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `current_driver_key` bigint(20) UNSIGNED GENERATED ALWAYS AS (case when `is_current` = 1 then `driver_id` else NULL end) STORED,
  `current_vehicle_key` bigint(20) UNSIGNED GENERATED ALWAYS AS (case when `is_current` = 1 then `vehicle_id` else NULL end) STORED,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `driver_wallet_transactions`
--

CREATE TABLE `driver_wallet_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `driver_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED DEFAULT NULL,
  `transaction_type` enum('credit','debit') NOT NULL,
  `source_type` enum('trip_earning','commission','payout','adjustment','penalty','refund') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance_after` decimal(10,2) DEFAULT NULL,
  `reference_code` varchar(120) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `faqs`
--

CREATE TABLE `faqs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `question` varchar(255) NOT NULL,
  `answer` text NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `related_type` enum('general','route','service') NOT NULL DEFAULT 'general',
  `route_id` bigint(20) UNSIGNED DEFAULT NULL,
  `cms_page_id` bigint(20) UNSIGNED DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `faqs`
--

INSERT INTO `faqs` (`id`, `question`, `answer`, `category`, `related_type`, `route_id`, `cms_page_id`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'How do I book a cab with Yaazh Cabs?', 'Fill the booking form on this page or call 93600 55761. We confirm your cab, driver name and number on WhatsApp within minutes.', NULL, 'general', NULL, NULL, 1, 1, '2026-09-02 08:52:45', '2026-09-02 08:52:45'),
(2, 'Do you charge for the return trip on one-way rides?', 'No. One-way trips are billed only for the distance you travel, plus driver bata and applicable tolls or permits.', NULL, 'general', NULL, NULL, 2, 1, '2026-09-02 08:52:45', '2026-09-02 08:52:45'),
(3, 'Are night-time and early morning pickups available?', 'Yes. We operate 24×7, including airport pickups at 2 AM. Book at least 3 hours ahead for night trips wherever possible.', NULL, 'general', NULL, NULL, 3, 1, '2026-09-02 08:52:45', '2026-09-02 08:52:45'),
(4, 'Which vehicles can I choose from?', 'Dzire sedans, Ertiga and Innova MPVs, full-size SUVs and 14-seat tempo travellers for groups and tour packages.', NULL, 'general', NULL, NULL, 4, 1, '2026-09-02 08:52:45', '2026-09-02 08:52:45'),
(5, 'How is the final fare calculated?', 'Base fare plus per-kilometre rate for your chosen vehicle. Tolls, parking, state permits and driver allowance are billed at actuals and shown up front.', NULL, 'general', NULL, NULL, 5, 1, '2026-09-02 08:52:45', '2026-09-02 08:52:45'),
(6, 'Do you cover Ooty, Kodaikanal and Kerala?', 'Absolutely. Outstation and tour packages to Ooty, Kodaikanal, Valparai, Munnar and across Kerala are among our most-booked trips.', NULL, 'general', NULL, NULL, 6, 1, '2026-09-02 08:52:45', '2026-09-02 08:52:45');

-- --------------------------------------------------------

--
-- Table structure for table `gallery_groups`
--

CREATE TABLE `gallery_groups` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `slug` varchar(80) NOT NULL,
  `title` varchar(120) NOT NULL,
  `group_type` varchar(40) NOT NULL DEFAULT 'custom',
  `display_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `gallery_groups`
--

INSERT INTO `gallery_groups` (`id`, `slug`, `title`, `group_type`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'cars-outside', 'Cars — Outside', 'cars_outside', 1, 1, '2026-09-01 09:19:45', NULL),
(2, 'cars-inside', 'Cars — Inside', 'cars_inside', 2, 1, '2026-09-01 09:19:45', NULL),
(3, 'destinations', 'Destinations', 'destinations', 3, 1, '2026-09-01 09:19:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `gallery_images`
--

CREATE TABLE `gallery_images` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `group_id` bigint(20) UNSIGNED NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `caption` varchar(180) DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `idempotency_keys`
--

CREATE TABLE `idempotency_keys` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `user_type` enum('customer','driver','admin','public') NOT NULL DEFAULT 'public',
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `route` varchar(200) NOT NULL,
  `request_hash` varchar(64) NOT NULL,
  `response_code` int(11) NOT NULL,
  `response_body` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`response_body`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_queue`
--

CREATE TABLE `job_queue` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_type` varchar(80) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  `attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `max_attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 5,
  `available_at` datetime NOT NULL DEFAULT current_timestamp(),
  `locked_at` datetime DEFAULT NULL,
  `locked_by` varchar(120) DEFAULT NULL,
  `last_error` text DEFAULT NULL,
  `idempotency_key` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_queue`
--

INSERT INTO `job_queue` (`id`, `job_type`, `payload`, `status`, `attempts`, `max_attempts`, `available_at`, `locked_at`, `locked_by`, `last_error`, `idempotency_key`, `created_at`, `updated_at`) VALUES
(1, 'purge_queued_notifications', '{}', 'completed', 1, 5, '2026-09-01 09:48:13', NULL, NULL, NULL, 'purge_queued_notifications_2026-09-01', '2026-09-01 04:18:13', '2026-09-01 04:18:13');

-- --------------------------------------------------------

--
-- Table structure for table `notification_logs`
--

CREATE TABLE `notification_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `template_id` bigint(20) UNSIGNED DEFAULT NULL,
  `booking_id` bigint(20) UNSIGNED DEFAULT NULL,
  `sender_type` enum('system','admin') NOT NULL DEFAULT 'system',
  `sender_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `recipient_type` enum('customer','driver','admin') NOT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `admin_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `device_id` bigint(20) UNSIGNED DEFAULT NULL,
  `channel` enum('push','in_app','email','sms','whatsapp') NOT NULL,
  `title` varchar(180) DEFAULT NULL,
  `body` text NOT NULL,
  `data_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data_payload`)),
  `delivery_status` enum('queued','sent','delivered','read','failed','cancelled') NOT NULL DEFAULT 'queued',
  `provider_message_id` varchar(180) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_templates`
--

CREATE TABLE `notification_templates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `template_key` varchar(100) NOT NULL,
  `channel` enum('push','in_app','email','sms','whatsapp') NOT NULL,
  `recipient_type` enum('customer','driver','admin','all') NOT NULL DEFAULT 'customer',
  `subject` varchar(180) DEFAULT NULL,
  `title` varchar(180) DEFAULT NULL,
  `body` text NOT NULL,
  `deep_link` varchar(500) DEFAULT NULL,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variables`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notification_templates`
--

INSERT INTO `notification_templates` (`id`, `template_key`, `channel`, `recipient_type`, `subject`, `title`, `body`, `deep_link`, `variables`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'booking_created_email', 'email', 'customer', 'Booking Request Received', NULL, 'Hi {{customer_name}}, your booking {{booking_reference}} has been received.', NULL, '[\"customer_name\", \"booking_reference\"]', 1, '2026-09-01 09:19:45', NULL),
(2, 'booking_created_push_user', 'push', 'customer', NULL, 'Booking received', 'Your booking {{booking_reference}} has been received.', 'cabapp://bookings/{{booking_id}}', '[\"booking_reference\", \"booking_id\"]', 1, '2026-09-01 09:19:45', NULL),
(3, 'booking_confirmed_sms', 'sms', 'customer', NULL, NULL, 'Your cab booking {{booking_reference}} is confirmed. Pickup: {{pickup_at}}', NULL, '[\"booking_reference\", \"pickup_at\"]', 1, '2026-09-01 09:19:45', NULL),
(4, 'booking_confirmed_push_user', 'push', 'customer', NULL, 'Booking confirmed', 'Your cab booking {{booking_reference}} is confirmed.', 'cabapp://bookings/{{booking_id}}', '[\"booking_reference\", \"booking_id\"]', 1, '2026-09-01 09:19:45', NULL),
(5, 'booking_cancelled_sms', 'sms', 'customer', NULL, NULL, 'Your cab booking {{booking_reference}} has been cancelled. Reason: {{reason}}', NULL, '[\"booking_reference\", \"reason\"]', 1, '2026-09-01 09:19:45', NULL),
(6, 'booking_cancelled_push_user', 'push', 'customer', NULL, 'Booking cancelled', 'Your booking {{booking_reference}} has been cancelled.', 'cabapp://bookings/{{booking_id}}', '[\"booking_reference\", \"booking_id\"]', 1, '2026-09-01 09:19:45', NULL),
(7, 'new_booking_admin_push', 'push', 'admin', NULL, 'New booking', 'New booking {{booking_reference}} from {{customer_name}}.', 'admin://bookings/{{booking_id}}', '[\"booking_reference\", \"booking_id\", \"customer_name\"]', 1, '2026-09-01 09:19:45', NULL),
(8, 'driver_booking_offer_push', 'push', 'driver', NULL, 'New trip request', 'Trip request: {{pickup_location}} to {{drop_location}}.', 'driverapp://offers/{{offer_id}}', '[\"offer_id\", \"booking_id\", \"pickup_location\", \"drop_location\"]', 1, '2026-09-01 09:19:45', NULL),
(9, 'driver_assigned_push_user', 'push', 'customer', NULL, 'Driver assigned', '{{driver_name}} has been assigned for booking {{booking_reference}}.', 'cabapp://bookings/{{booking_id}}', '[\"driver_name\", \"booking_reference\", \"booking_id\"]', 1, '2026-09-01 09:19:45', NULL),
(10, 'driver_accepted_admin_push', 'push', 'admin', NULL, 'Driver accepted', '{{driver_name}} accepted booking {{booking_reference}}.', 'admin://bookings/{{booking_id}}', '[\"driver_name\", \"booking_reference\", \"booking_id\"]', 1, '2026-09-01 09:19:45', NULL),
(11, 'trip_started_push_user', 'push', 'customer', NULL, 'Trip started', 'Your trip {{booking_reference}} has started.', 'cabapp://bookings/{{booking_id}}', '[\"booking_reference\", \"booking_id\"]', 1, '2026-09-01 09:19:45', NULL),
(12, 'trip_completed_push_user', 'push', 'customer', NULL, 'Trip completed', 'Your trip is completed. Please share your feedback.', 'cabapp://feedback/{{booking_id}}', '[\"booking_id\"]', 1, '2026-09-01 09:19:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `payment_reference` varchar(120) DEFAULT NULL,
  `gateway` varchar(80) DEFAULT NULL,
  `method` enum('cash','upi','card','netbanking','wallet','bank_transfer','other') NOT NULL DEFAULT 'cash',
  `payment_type` enum('advance','partial','final','refund','other') NOT NULL DEFAULT 'other',
  `amount` decimal(10,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `status` enum('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `gateway_response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`gateway_response`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `module` varchar(80) NOT NULL,
  `action` varchar(80) NOT NULL,
  `label` varchar(120) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `module`, `action`, `label`, `created_at`) VALUES
(1, 'dashboard', 'view', 'View Dashboard', '2026-09-01 09:19:45'),
(2, 'bookings', 'view', 'View Bookings', '2026-09-01 09:19:45'),
(3, 'bookings', 'create', 'Create Bookings', '2026-09-01 09:19:45'),
(4, 'bookings', 'update', 'Update Bookings', '2026-09-01 09:19:45'),
(5, 'bookings', 'delete', 'Delete Bookings', '2026-09-01 09:19:45'),
(6, 'bookings', 'cancel', 'Cancel Bookings', '2026-09-01 09:19:45'),
(7, 'customers', 'view', 'View Customers', '2026-09-01 09:19:45'),
(8, 'customers', 'manage', 'Manage Customers', '2026-09-01 09:19:45'),
(9, 'drivers', 'view', 'View Drivers', '2026-09-01 09:19:45'),
(10, 'drivers', 'manage', 'Manage Drivers', '2026-09-01 09:19:45'),
(11, 'driver_documents', 'verify', 'Verify Driver Documents', '2026-09-01 09:19:45'),
(12, 'driver_offers', 'manage', 'Manage Driver Booking Offers', '2026-09-01 09:19:45'),
(13, 'vehicles', 'manage', 'Manage Vehicles', '2026-09-01 09:19:45'),
(14, 'vehicle_categories', 'manage', 'Manage Vehicle Categories', '2026-09-01 09:19:45'),
(15, 'driver_assignments', 'manage', 'Manage Driver Vehicle Assignments', '2026-09-01 09:19:45'),
(16, 'tariff', 'manage', 'Manage Tariff', '2026-09-01 09:19:45'),
(17, 'routes', 'manage', 'Manage Routes', '2026-09-01 09:19:45'),
(18, 'coupons', 'manage', 'Manage Coupons', '2026-09-01 09:19:45'),
(19, 'cancellation_policies', 'manage', 'Manage Cancellation Policies', '2026-09-01 09:19:45'),
(20, 'payments', 'view', 'View Payments', '2026-09-01 09:19:45'),
(21, 'invoices', 'manage', 'Manage Invoices', '2026-09-01 09:19:45'),
(22, 'driver_wallet', 'manage', 'Manage Driver Wallet', '2026-09-01 09:19:45'),
(23, 'driver_payouts', 'manage', 'Manage Driver Payouts', '2026-09-01 09:19:45'),
(24, 'reviews', 'approve', 'Approve Reviews', '2026-09-01 09:19:45'),
(25, 'notifications', 'send', 'Send Notifications', '2026-09-01 09:19:45'),
(26, 'support', 'manage', 'Manage Support Tickets', '2026-09-01 09:19:45'),
(27, 'remote_config', 'manage', 'Manage Remote Config', '2026-09-01 09:19:45'),
(28, 'app_versions', 'manage', 'Manage App Versions', '2026-09-01 09:19:45'),
(29, 'cms', 'manage', 'Manage CMS', '2026-09-01 09:19:45'),
(30, 'blog', 'manage', 'Manage Blog', '2026-09-01 09:19:45'),
(31, 'faq', 'manage', 'Manage FAQs', '2026-09-01 09:19:45'),
(32, 'seo', 'manage', 'Manage SEO', '2026-09-01 09:19:45'),
(33, 'reports', 'view', 'View Reports', '2026-09-01 09:19:45'),
(34, 'settings', 'manage', 'Manage Settings', '2026-09-01 09:19:45'),
(35, 'audit_logs', 'view', 'View Audit Logs', '2026-09-01 09:19:45'),
(36, 'admin_users', 'view', 'View Admin Users', '2026-09-01 09:19:45'),
(37, 'admin_users', 'manage', 'Manage Admin Users', '2026-09-01 09:19:45'),
(38, 'gallery', 'view', 'View Gallery', '2026-09-01 09:19:45'),
(39, 'gallery', 'manage', 'Manage Gallery', '2026-09-01 09:19:45');

-- --------------------------------------------------------

--
-- Table structure for table `remote_config_values`
--

CREATE TABLE `remote_config_values` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `config_key` varchar(120) NOT NULL,
  `app_type` enum('customer_app','driver_app','admin_web','user_website','all') NOT NULL DEFAULT 'all',
  `platform` enum('android','ios','web','all') NOT NULL DEFAULT 'all',
  `value_type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
  `config_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `remote_config_values`
--

INSERT INTO `remote_config_values` (`id`, `config_key`, `app_type`, `platform`, `value_type`, `config_value`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'maintenance_mode', 'all', 'all', 'boolean', 'false', 'Temporarily disable public booking/app features during maintenance.', 1, '2026-09-01 09:19:45', NULL),
(2, 'home_offer_banner_enabled', 'all', 'all', 'boolean', 'true', 'Show offer banner on website and future mobile apps.', 1, '2026-09-01 09:19:45', NULL),
(3, 'home_offer_banner_text', 'all', 'all', 'string', 'Get special offers on cab bookings.', 'Offer banner text.', 1, '2026-09-01 09:19:45', NULL),
(4, 'booking_cancellation_enabled', 'customer_app', 'all', 'boolean', 'true', 'Allow users to cancel booking from app.', 1, '2026-09-01 09:19:45', NULL),
(5, 'driver_auto_offer_enabled', 'driver_app', 'all', 'boolean', 'false', 'Enable automatic nearby driver broadcast.', 1, '2026-09-01 09:19:45', NULL),
(6, 'live_tracking_enabled', 'all', 'all', 'boolean', 'false', 'Enable live trip location tracking when mobile apps are implemented.', 1, '2026-09-01 09:19:45', NULL),
(7, 'support_whatsapp_enabled', 'all', 'all', 'boolean', 'true', 'Show WhatsApp support option.', 1, '2026-09-01 09:19:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `permission_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(5, 1),
(1, 2),
(2, 2),
(4, 2),
(1, 3),
(2, 3),
(4, 3),
(1, 4),
(2, 4),
(4, 4),
(1, 5),
(2, 5),
(4, 5),
(1, 6),
(2, 6),
(4, 6),
(1, 7),
(2, 7),
(1, 8),
(2, 8),
(1, 9),
(2, 9),
(4, 9),
(1, 10),
(2, 10),
(4, 10),
(1, 11),
(4, 11),
(1, 12),
(2, 12),
(4, 12),
(1, 13),
(4, 13),
(1, 14),
(4, 14),
(1, 15),
(4, 15),
(1, 16),
(1, 17),
(4, 17),
(1, 18),
(1, 19),
(1, 20),
(5, 20),
(1, 21),
(5, 21),
(1, 22),
(5, 22),
(1, 23),
(5, 23),
(1, 24),
(3, 24),
(1, 25),
(2, 25),
(1, 26),
(2, 26),
(1, 27),
(1, 28),
(1, 29),
(3, 29),
(1, 30),
(3, 30),
(1, 31),
(3, 31),
(1, 32),
(3, 32),
(1, 33),
(2, 33),
(4, 33),
(5, 33),
(1, 34),
(1, 35),
(1, 36),
(1, 37),
(1, 38),
(3, 38),
(1, 39),
(3, 39);

-- --------------------------------------------------------

--
-- Table structure for table `routes`
--

CREATE TABLE `routes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `pickup_city_id` bigint(20) UNSIGNED NOT NULL,
  `drop_city_id` bigint(20) UNSIGNED NOT NULL,
  `slug` varchar(180) NOT NULL,
  `title` varchar(180) NOT NULL,
  `distance_km` decimal(10,2) NOT NULL DEFAULT 0.00,
  `duration_minutes` int(10) UNSIGNED DEFAULT NULL,
  `route_map_embed_url` text DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `faq_content` longtext DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `is_popular` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `routes`
--

INSERT INTO `routes` (`id`, `pickup_city_id`, `drop_city_id`, `slug`, `title`, `distance_km`, `duration_minutes`, `route_map_embed_url`, `content`, `faq_content`, `image_url`, `amount`, `is_popular`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'chennai-to-madurai-cabs', 'Chennai to Madurai Cabs', 462.00, 480, NULL, NULL, NULL, NULL, NULL, 1, 1, '2026-09-01 09:19:45', NULL),
(2, 1, 3, 'chennai-to-coimbatore-cabs', 'Chennai to Coimbatore Cabs', 507.00, 540, NULL, NULL, NULL, NULL, NULL, 1, 1, '2026-09-01 09:19:45', NULL),
(3, 1, 4, 'chennai-to-trichy-cabs', 'Chennai to Trichy Cabs', 331.00, 360, NULL, NULL, NULL, NULL, NULL, 1, 1, '2026-09-01 09:19:45', NULL),
(4, 2, 1, 'madurai-to-chennai-cabs', 'Madurai to Chennai Cabs', 462.00, 480, NULL, NULL, NULL, NULL, NULL, 1, 1, '2026-09-01 09:19:45', NULL),
(5, 7, 3, 'udumalpet-to-coimbatore-cabs', 'Udumalpet to Coimbatore Cabs', 68.00, 80, NULL, 'City ride', NULL, NULL, NULL, 1, 1, '2026-09-01 09:19:45', '2026-09-02 08:52:54'),
(6, 7, 9, 'udumalpet-to-palani-cabs', 'Udumalpet to Palani Cabs', 55.00, 65, NULL, 'Temple town', NULL, NULL, NULL, 1, 1, '2026-09-02 08:52:53', '2026-09-02 08:52:53'),
(7, 7, 2, 'udumalpet-to-madurai-cabs', 'Udumalpet to Madurai Cabs', 165.00, 180, NULL, 'One way', NULL, NULL, NULL, 1, 1, '2026-09-02 08:52:55', '2026-09-02 08:52:55'),
(8, 7, 10, 'udumalpet-to-dindigul-cabs', 'Udumalpet to Dindigul Cabs', 120.00, 135, NULL, 'One way', NULL, NULL, NULL, 1, 1, '2026-09-02 08:52:56', '2026-09-02 08:52:56'),
(9, 7, 11, 'udumalpet-to-munnar-cabs', 'Udumalpet to Munnar Cabs', 145.00, 210, NULL, 'Hill station', NULL, NULL, NULL, 1, 1, '2026-09-02 08:52:57', '2026-09-02 08:52:57'),
(10, 7, 12, 'udumalpet-to-theni-cabs', 'Udumalpet to Theni Cabs', 130.00, 165, NULL, 'One way', NULL, NULL, NULL, 1, 1, '2026-09-02 08:52:57', '2026-09-02 08:52:57'),
(11, 7, 8, 'udumalpet-to-tiruppur-cabs', 'Udumalpet to Tiruppur Cabs', 95.00, 120, NULL, 'Knit city', NULL, NULL, NULL, 1, 1, '2026-09-02 08:52:59', '2026-09-02 08:52:59'),
(12, 7, 13, 'udumalpet-to-erode-cabs', 'Udumalpet to Erode Cabs', 110.00, 135, NULL, 'One way', NULL, NULL, NULL, 1, 1, '2026-09-02 08:53:00', '2026-09-02 08:53:00'),
(13, 7, 14, 'udumalpet-to-karur-cabs', 'Udumalpet to Karur Cabs', 140.00, 165, NULL, 'One way', NULL, NULL, NULL, 1, 1, '2026-09-02 08:53:01', '2026-09-02 08:53:01');

-- --------------------------------------------------------

--
-- Table structure for table `route_estimate_cache`
--

CREATE TABLE `route_estimate_cache` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cache_key` varchar(64) NOT NULL,
  `pickup_latitude` decimal(10,7) NOT NULL,
  `pickup_longitude` decimal(10,7) NOT NULL,
  `drop_latitude` decimal(10,7) NOT NULL,
  `drop_longitude` decimal(10,7) NOT NULL,
  `distance_km` decimal(10,2) NOT NULL,
  `duration_minutes` int(10) UNSIGNED NOT NULL,
  `provider` varchar(40) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `seo_meta`
--

CREATE TABLE `seo_meta` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `entity_type` enum('home','cms_page','blog_post','route','vehicle_category','custom') NOT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `url_path` varchar(255) NOT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` varchar(500) DEFAULT NULL,
  `canonical_url` varchar(500) DEFAULT NULL,
  `og_title` varchar(255) DEFAULT NULL,
  `og_description` varchar(500) DEFAULT NULL,
  `og_image_url` varchar(500) DEFAULT NULL,
  `schema_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`schema_json`)),
  `robots_index` tinyint(1) NOT NULL DEFAULT 1,
  `robots_follow` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `stored_media`
--

CREATE TABLE `stored_media` (
  `path` varchar(500) NOT NULL,
  `mime_type` varchar(64) NOT NULL,
  `data_base64` longtext NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_tickets`
--

CREATE TABLE `support_tickets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ticket_reference` varchar(40) NOT NULL,
  `booking_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `raised_by_type` enum('customer','driver','admin') NOT NULL,
  `subject` varchar(180) NOT NULL,
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `status` enum('open','in_progress','waiting_for_user','resolved','closed') NOT NULL DEFAULT 'open',
  `assigned_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `closed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_ticket_messages`
--

CREATE TABLE `support_ticket_messages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ticket_id` bigint(20) UNSIGNED NOT NULL,
  `sender_type` enum('customer','driver','admin','system') NOT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `admin_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `message` text NOT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `is_internal_note` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `tariff_plans`
--

CREATE TABLE `tariff_plans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_category_id` bigint(20) UNSIGNED NOT NULL,
  `trip_type` enum('one_way','round_trip','airport','outstation','local_rental') NOT NULL,
  `route_id` bigint(20) UNSIGNED DEFAULT NULL,
  `rate_per_km` decimal(10,2) NOT NULL,
  `base_fare` decimal(10,2) NOT NULL DEFAULT 0.00,
  `driver_batta` decimal(10,2) NOT NULL DEFAULT 0.00,
  `minimum_km` decimal(10,2) NOT NULL DEFAULT 0.00,
  `minimum_fare` decimal(10,2) NOT NULL DEFAULT 0.00,
  `extra_km_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `extra_hour_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `night_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
  `waiting_charge_per_hour` decimal(10,2) NOT NULL DEFAULT 0.00,
  `permit_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
  `toll_included` tinyint(1) NOT NULL DEFAULT 0,
  `parking_included` tinyint(1) NOT NULL DEFAULT 0,
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `tariff_plans`
--

INSERT INTO `tariff_plans` (`id`, `vehicle_category_id`, `trip_type`, `route_id`, `rate_per_km`, `base_fare`, `driver_batta`, `minimum_km`, `minimum_fare`, `extra_km_rate`, `extra_hour_rate`, `night_charge`, `waiting_charge_per_hour`, `permit_charge`, `toll_included`, `parking_included`, `gst_percentage`, `effective_from`, `effective_to`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'one_way', NULL, 15.00, 0.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-01', NULL, 1, '2026-09-01 09:19:45', NULL),
(2, 2, 'one_way', NULL, 20.00, 0.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-01', NULL, 1, '2026-09-01 09:19:45', NULL),
(3, 3, 'one_way', NULL, 20.00, 0.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-01', NULL, 1, '2026-09-01 09:19:45', NULL),
(4, 4, 'one_way', NULL, 22.00, 0.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-01', NULL, 1, '2026-09-01 09:19:45', NULL),
(8, 1, 'round_trip', NULL, 14.00, 0.00, 500.00, 250.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-01', NULL, 1, '2026-09-01 09:19:45', NULL),
(9, 2, 'round_trip', NULL, 19.00, 0.00, 500.00, 250.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-01', NULL, 1, '2026-09-01 09:19:45', NULL),
(10, 3, 'round_trip', NULL, 19.00, 0.00, 500.00, 250.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-01', NULL, 1, '2026-09-01 09:19:45', NULL),
(11, 4, 'round_trip', NULL, 20.00, 0.00, 500.00, 250.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-01', NULL, 1, '2026-09-01 09:19:45', NULL),
(12, 1, 'one_way', 6, 0.00, 1500.00, 0.00, 0.00, 1500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:52:54', '2026-09-02 08:52:54'),
(13, 1, 'one_way', 5, 0.00, 2700.00, 0.00, 0.00, 2700.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:52:55', '2026-09-02 08:52:55'),
(14, 1, 'one_way', 7, 0.00, 3600.00, 0.00, 0.00, 3600.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:52:55', '2026-09-02 08:52:55'),
(15, 1, 'one_way', 8, 0.00, 2900.00, 0.00, 0.00, 2900.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:52:56', '2026-09-02 08:52:56'),
(16, 1, 'one_way', 9, 0.00, 4000.00, 0.00, 0.00, 4000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:52:57', '2026-09-02 08:52:57'),
(17, 1, 'one_way', 10, 0.00, 3300.00, 0.00, 0.00, 3300.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:52:58', '2026-09-02 08:52:58'),
(18, 1, 'one_way', 11, 0.00, 2700.00, 0.00, 0.00, 2700.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:52:59', '2026-09-02 08:52:59'),
(19, 1, 'one_way', 12, 0.00, 3000.00, 0.00, 0.00, 3000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:53:00', '2026-09-02 08:53:00'),
(20, 1, 'one_way', 13, 0.00, 3600.00, 0.00, 0.00, 3600.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:53:02', '2026-09-02 08:53:02'),
(21, 5, 'one_way', NULL, 23.00, 0.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:53:03', '2026-09-02 08:53:03'),
(22, 5, 'round_trip', NULL, 21.00, 0.00, 500.00, 250.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:53:03', '2026-09-02 08:53:03'),
(23, 6, 'one_way', NULL, 28.00, 0.00, 700.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:53:04', '2026-09-02 08:53:04'),
(24, 6, 'round_trip', NULL, 26.00, 0.00, 700.00, 250.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0, 0, 0.00, '2026-09-02', NULL, 1, '2026-09-02 08:53:04', '2026-09-02 08:53:04');

-- --------------------------------------------------------

--
-- Table structure for table `testimonials`
--

CREATE TABLE `testimonials` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_name` varchar(120) NOT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL,
  `review` text NOT NULL,
  `admin_reply` text DEFAULT NULL,
  `approval_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `approved_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `testimonials`
--

INSERT INTO `testimonials` (`id`, `booking_id`, `customer_id`, `customer_name`, `customer_phone`, `rating`, `review`, `admin_reply`, `approval_status`, `is_featured`, `approved_by_admin_id`, `approved_at`, `created_at`, `updated_at`) VALUES
(1, NULL, NULL, 'Karthik R.', NULL, 5, 'Booked an Innova for a Kodaikanal trip. Driver was on time, car spotless, and the fare was exactly what was quoted.', NULL, 'approved', 1, NULL, '2026-09-02 14:22:46', '2026-09-02 08:52:46', '2026-09-02 08:52:46'),
(2, NULL, NULL, 'Divya S.', NULL, 5, '3 AM airport drop and they confirmed on WhatsApp within minutes. This is my go-to cab service now.', NULL, 'approved', 1, NULL, '2026-09-02 14:22:46', '2026-09-02 08:52:46', '2026-09-02 08:52:46'),
(3, NULL, NULL, 'Mohan Kumar', NULL, 5, 'We use Yaazh for all our company guest pickups. Billing is clean and drivers are courteous.', NULL, 'approved', 1, NULL, '2026-09-02 14:22:46', '2026-09-02 08:52:46', '2026-09-02 08:52:46'),
(4, NULL, NULL, 'Anitha P.', NULL, 5, 'Valparai tour package was well planned. The driver knew every viewpoint worth stopping at.', NULL, 'approved', 1, NULL, '2026-09-02 14:22:46', '2026-09-02 08:52:46', '2026-09-02 08:52:46'),
(5, NULL, NULL, 'Suresh V.', NULL, 5, 'Fair pricing for one-way. No hidden return charges like other operators.', NULL, 'approved', 1, NULL, '2026-09-02 14:22:46', '2026-09-02 08:52:46', '2026-09-02 08:52:46'),
(6, NULL, NULL, 'Lakshmi N.', NULL, 5, 'Travelled with my elderly parents. The driver was patient and helped with luggage throughout.', NULL, 'approved', 1, NULL, '2026-09-02 14:22:46', '2026-09-02 08:52:46', '2026-09-02 08:52:46');

-- --------------------------------------------------------

--
-- Table structure for table `trip_events`
--

CREATE TABLE `trip_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `event_type` enum('driver_notified','driver_accepted','driver_rejected','driver_assigned','driver_started_to_pickup','driver_arrived','otp_verified','trip_started','stop_added','trip_completed','trip_cancelled','payment_collected','customer_rated','fare_adjusted') NOT NULL,
  `event_note` text DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `event_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`event_payload`)),
  `created_by_type` enum('system','admin','customer','driver') NOT NULL DEFAULT 'system',
  `created_by_admin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trip_ratings`
--

CREATE TABLE `trip_ratings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `driver_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_rating` tinyint(3) UNSIGNED DEFAULT NULL,
  `customer_review` text DEFAULT NULL,
  `driver_rating` tinyint(3) UNSIGNED DEFAULT NULL,
  `driver_review` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_name` varchar(120) NOT NULL,
  `registration_no` varchar(50) DEFAULT NULL,
  `model_name` varchar(120) DEFAULT NULL,
  `color` varchar(60) DEFAULT NULL,
  `fuel_type` enum('petrol','diesel','cng','electric','hybrid','other') NOT NULL DEFAULT 'diesel',
  `rc_expiry_date` date DEFAULT NULL,
  `insurance_expiry_date` date DEFAULT NULL,
  `permit_expiry_date` date DEFAULT NULL,
  `pollution_expiry_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_categories`
--

CREATE TABLE `vehicle_categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `seating_capacity` tinyint(3) UNSIGNED NOT NULL,
  `luggage_capacity` varchar(80) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `one_way_rate_per_km` decimal(10,2) NOT NULL DEFAULT 0.00,
  `round_trip_rate_per_km` decimal(10,2) NOT NULL DEFAULT 0.00,
  `driver_batta` decimal(10,2) NOT NULL DEFAULT 0.00,
  `minimum_km_per_day` decimal(10,2) NOT NULL DEFAULT 0.00,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `vehicle_categories`
--

INSERT INTO `vehicle_categories` (`id`, `name`, `slug`, `seating_capacity`, `luggage_capacity`, `description`, `image_url`, `one_way_rate_per_km`, `round_trip_rate_per_km`, `driver_batta`, `minimum_km_per_day`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Sedan 4+1', 'sedan-4-1', 4, '2 bags', 'Standard AC sedan for small family trips', NULL, 15.00, 14.00, 500.00, 250.00, 1, 1, '2026-09-01 09:19:45', NULL),
(2, 'Ertiga 6+1', 'ertiga-6-1', 6, '3 bags', 'Comfortable 6 seater AC cab', NULL, 20.00, 19.00, 500.00, 250.00, 2, 1, '2026-09-01 09:19:45', NULL),
(3, 'Innova 6+1', 'innova-6-1', 6, '4 bags', 'Premium AC cab for family outstation trips', NULL, 20.00, 19.00, 500.00, 250.00, 3, 1, '2026-09-01 09:19:45', NULL),
(4, 'Crysta 7+1', 'crysta-7-1', 7, '4 bags', 'Premium spacious AC cab', NULL, 22.00, 20.00, 500.00, 250.00, 4, 1, '2026-09-01 09:19:45', NULL),
(5, 'SUV 7+1', 'suv-7-1', 7, '5 bags', 'Highway cruiser AC SUV', NULL, 23.00, 21.00, 500.00, 250.00, 5, 1, '2026-09-02 08:53:02', '2026-09-02 08:53:02'),
(6, 'Tempo Traveller 12+1', 'tempo-12-1', 14, '10 bags', 'Group travel AC tempo traveller', NULL, 28.00, 26.00, 700.00, 250.00, 6, 1, '2026-09-02 08:53:04', '2026-09-02 08:53:04');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_profile_photos`
--
ALTER TABLE `admin_profile_photos`
  ADD PRIMARY KEY (`admin_id`);

--
-- Indexes for table `admin_roles`
--
ALTER TABLE `admin_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD KEY `idx_admin_users_role_active` (`role_id`,`is_active`);

--
-- Indexes for table `app_devices`
--
ALTER TABLE `app_devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_app_devices_fcm_token` (`fcm_token`),
  ADD KEY `fk_app_devices_customer` (`customer_id`),
  ADD KEY `fk_app_devices_driver` (`driver_id`),
  ADD KEY `fk_app_devices_admin` (`admin_user_id`),
  ADD KEY `idx_app_devices_user` (`user_type`,`customer_id`,`driver_id`,`admin_user_id`),
  ADD KEY `idx_app_devices_active` (`platform`,`is_active`);

--
-- Indexes for table `app_settings`
--
ALTER TABLE `app_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `app_versions`
--
ALTER TABLE `app_versions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_app_versions` (`app_type`,`platform`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_admin_date` (`admin_user_id`,`created_at`),
  ADD KEY `idx_audit_created` (`created_at`);

--
-- Indexes for table `auth_otp_requests`
--
ALTER TABLE `auth_otp_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_otp_lookup` (`user_type`,`phone`,`purpose`,`expires_at`),
  ADD KEY `idx_otp_email` (`user_type`,`email`,`purpose`,`expires_at`),
  ADD KEY `idx_otp_created` (`created_at`);

--
-- Indexes for table `auth_sessions`
--
ALTER TABLE `auth_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_auth_sessions_customer` (`customer_id`),
  ADD KEY `fk_auth_sessions_driver` (`driver_id`),
  ADD KEY `fk_auth_sessions_admin` (`admin_user_id`),
  ADD KEY `idx_auth_sessions_hash` (`refresh_token_hash`),
  ADD KEY `idx_auth_sessions_user` (`user_type`,`customer_id`,`driver_id`,`admin_user_id`),
  ADD KEY `idx_auth_sessions_expires` (`expires_at`);

--
-- Indexes for table `blog_posts`
--
ALTER TABLE `blog_posts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `fk_blog_author` (`author_admin_id`),
  ADD KEY `idx_blog_status_date` (`status`,`published_at`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `booking_reference` (`booking_reference`),
  ADD KEY `fk_bookings_vehicle` (`assigned_vehicle_id`),
  ADD KEY `fk_bookings_vehicle_category` (`vehicle_category_id`),
  ADD KEY `fk_bookings_route` (`route_id`),
  ADD KEY `fk_bookings_coupon` (`coupon_id`),
  ADD KEY `fk_bookings_created_admin` (`created_by_admin_id`),
  ADD KEY `idx_bookings_status_date` (`status`,`pickup_at`),
  ADD KEY `idx_bookings_customer` (`customer_id`,`created_at`),
  ADD KEY `idx_bookings_driver_date` (`assigned_driver_id`,`pickup_at`),
  ADD KEY `idx_bookings_customer_phone` (`customer_phone`),
  ADD KEY `idx_bookings_payment_status` (`payment_status`),
  ADD KEY `idx_bookings_created_at` (`created_at`);

--
-- Indexes for table `booking_charges`
--
ALTER TABLE `booking_charges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_booking_charges_booking` (`booking_id`,`amount_type`,`charge_type`);

--
-- Indexes for table `booking_driver_offers`
--
ALTER TABLE `booking_driver_offers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_booking_offers_driver` (`driver_id`),
  ADD KEY `fk_booking_offers_vehicle` (`vehicle_id`),
  ADD KEY `fk_booking_offers_admin` (`sent_by_admin_id`),
  ADD KEY `idx_booking_driver_offer_lookup` (`booking_id`,`driver_id`,`created_at`),
  ADD KEY `idx_booking_offers_status` (`status`,`expires_at`);

--
-- Indexes for table `booking_invoices`
--
ALTER TABLE `booking_invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `booking_id` (`booking_id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `idx_invoices_date_status` (`invoice_date`,`status`);

--
-- Indexes for table `booking_status_history`
--
ALTER TABLE `booking_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_booking_history_admin` (`changed_by_admin_id`),
  ADD KEY `fk_booking_history_customer` (`changed_by_customer_id`),
  ADD KEY `fk_booking_history_driver` (`changed_by_driver_id`),
  ADD KEY `idx_booking_history_booking` (`booking_id`,`changed_at`);

--
-- Indexes for table `cancellation_policies`
--
ALTER TABLE `cancellation_policies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cancel_policy_lookup` (`trip_type`,`cancelled_by_type`,`is_active`,`priority`);

--
-- Indexes for table `cities`
--
ALTER TABLE `cities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_cities_name_active` (`name`,`is_active`);

--
-- Indexes for table `cms_pages`
--
ALTER TABLE `cms_pages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `fk_cms_created_admin` (`created_by_admin_id`),
  ADD KEY `fk_cms_updated_admin` (`updated_by_admin_id`),
  ADD KEY `idx_cms_status` (`status`,`published_at`);

--
-- Indexes for table `contact_enquiries`
--
ALTER TABLE `contact_enquiries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_contact_admin` (`assigned_admin_id`),
  ADD KEY `idx_contact_status` (`status`,`created_at`);

--
-- Indexes for table `coupons`
--
ALTER TABLE `coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_coupons_validity` (`is_active`,`valid_from`,`valid_to`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD UNIQUE KEY `referral_code` (`referral_code`),
  ADD KEY `fk_customers_referred_by` (`referred_by_customer_id`),
  ADD KEY `idx_customer_email` (`email`),
  ADD KEY `idx_customer_status` (`app_status`,`is_active`);

--
-- Indexes for table `customer_saved_places`
--
ALTER TABLE `customer_saved_places`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_saved_places_customer` (`customer_id`);

--
-- Indexes for table `drivers`
--
ALTER TABLE `drivers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD KEY `idx_drivers_status` (`verification_status`,`online_status`,`availability_status`),
  ADD KEY `idx_drivers_location` (`online_status`,`availability_status`,`last_location_at`);

--
-- Indexes for table `driver_documents`
--
ALTER TABLE `driver_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_driver_documents_admin` (`verified_by_admin_id`),
  ADD KEY `idx_driver_documents_status` (`driver_id`,`document_type`,`verification_status`,`expiry_date`),
  ADD KEY `idx_vehicle_documents_status` (`vehicle_id`,`document_type`,`verification_status`,`expiry_date`);

--
-- Indexes for table `driver_locations`
--
ALTER TABLE `driver_locations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_driver_locations_latest` (`driver_id`,`recorded_at`),
  ADD KEY `idx_driver_locations_booking` (`booking_id`,`recorded_at`);

--
-- Indexes for table `driver_payouts`
--
ALTER TABLE `driver_payouts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payout_reference` (`payout_reference`),
  ADD KEY `fk_driver_payouts_admin` (`approved_by_admin_id`),
  ADD KEY `idx_driver_payouts_driver` (`driver_id`,`created_at`),
  ADD KEY `idx_driver_payouts_status` (`status`,`created_at`);

--
-- Indexes for table `driver_vehicle_assignments`
--
ALTER TABLE `driver_vehicle_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_current_driver` (`current_driver_key`),
  ADD UNIQUE KEY `uq_current_vehicle` (`current_vehicle_key`),
  ADD KEY `idx_driver_vehicle_history` (`driver_id`,`assigned_from`),
  ADD KEY `idx_vehicle_driver_history` (`vehicle_id`,`assigned_from`);

--
-- Indexes for table `driver_wallet_transactions`
--
ALTER TABLE `driver_wallet_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_driver_wallet_admin` (`created_by_admin_id`),
  ADD KEY `idx_driver_wallet_driver_date` (`driver_id`,`created_at`),
  ADD KEY `idx_driver_wallet_booking` (`booking_id`),
  ADD KEY `idx_driver_wallet_reference` (`reference_code`);

--
-- Indexes for table `faqs`
--
ALTER TABLE `faqs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_faq_route` (`route_id`),
  ADD KEY `fk_faq_cms` (`cms_page_id`),
  ADD KEY `idx_faq_public` (`related_type`,`is_active`,`display_order`);

--
-- Indexes for table `gallery_groups`
--
ALTER TABLE `gallery_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_gallery_groups_order` (`is_active`,`display_order`);

--
-- Indexes for table `gallery_images`
--
ALTER TABLE `gallery_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_gallery_images_group` (`group_id`,`display_order`);

--
-- Indexes for table `idempotency_keys`
--
ALTER TABLE `idempotency_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_idempotency_key` (`idempotency_key`),
  ADD KEY `idx_idempotency_expires` (`expires_at`);

--
-- Indexes for table `job_queue`
--
ALTER TABLE `job_queue`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_job_idempotency` (`idempotency_key`),
  ADD KEY `idx_job_queue_poll` (`status`,`available_at`,`id`);

--
-- Indexes for table `notification_logs`
--
ALTER TABLE `notification_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notification_logs_template` (`template_id`),
  ADD KEY `fk_notification_logs_sender_admin` (`sender_admin_id`),
  ADD KEY `fk_notification_logs_customer` (`customer_id`),
  ADD KEY `fk_notification_logs_driver` (`driver_id`),
  ADD KEY `fk_notification_logs_admin` (`admin_user_id`),
  ADD KEY `fk_notification_logs_device` (`device_id`),
  ADD KEY `idx_notifications_recipient` (`recipient_type`,`customer_id`,`driver_id`,`admin_user_id`,`delivery_status`),
  ADD KEY `idx_notifications_booking` (`booking_id`),
  ADD KEY `idx_notifications_scheduled` (`delivery_status`,`scheduled_at`);

--
-- Indexes for table `notification_templates`
--
ALTER TABLE `notification_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `template_key` (`template_key`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payment_reference` (`payment_reference`),
  ADD KEY `idx_payments_booking` (`booking_id`,`status`,`created_at`),
  ADD KEY `idx_payments_status` (`status`,`created_at`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_permission` (`module`,`action`);

--
-- Indexes for table `remote_config_values`
--
ALTER TABLE `remote_config_values`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_remote_config` (`config_key`,`app_type`,`platform`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `fk_role_permissions_permission` (`permission_id`);

--
-- Indexes for table `routes`
--
ALTER TABLE `routes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD UNIQUE KEY `uq_route_city_pair` (`pickup_city_id`,`drop_city_id`),
  ADD KEY `fk_routes_drop_city` (`drop_city_id`),
  ADD KEY `idx_routes_popular` (`is_popular`,`is_active`);

--
-- Indexes for table `route_estimate_cache`
--
ALTER TABLE `route_estimate_cache`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cache_key` (`cache_key`),
  ADD KEY `idx_route_estimate_expires` (`expires_at`);

--
-- Indexes for table `seo_meta`
--
ALTER TABLE `seo_meta`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `url_path` (`url_path`),
  ADD KEY `idx_seo_entity` (`entity_type`,`entity_id`);

--
-- Indexes for table `stored_media`
--
ALTER TABLE `stored_media`
  ADD PRIMARY KEY (`path`);

--
-- Indexes for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ticket_reference` (`ticket_reference`),
  ADD KEY `fk_support_booking` (`booking_id`),
  ADD KEY `fk_support_admin` (`assigned_admin_id`),
  ADD KEY `idx_support_status` (`status`,`priority`,`created_at`),
  ADD KEY `idx_support_customer` (`customer_id`,`created_at`),
  ADD KEY `idx_support_driver` (`driver_id`,`created_at`);

--
-- Indexes for table `support_ticket_messages`
--
ALTER TABLE `support_ticket_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_support_messages_customer` (`customer_id`),
  ADD KEY `fk_support_messages_driver` (`driver_id`),
  ADD KEY `fk_support_messages_admin` (`admin_user_id`),
  ADD KEY `idx_support_messages_ticket` (`ticket_id`,`created_at`);

--
-- Indexes for table `tariff_plans`
--
ALTER TABLE `tariff_plans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tariff_route` (`route_id`),
  ADD KEY `idx_tariff_lookup` (`vehicle_category_id`,`trip_type`,`route_id`,`is_active`,`effective_from`);

--
-- Indexes for table `testimonials`
--
ALTER TABLE `testimonials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_testimonials_booking` (`booking_id`),
  ADD KEY `fk_testimonials_customer` (`customer_id`),
  ADD KEY `fk_testimonials_admin` (`approved_by_admin_id`),
  ADD KEY `idx_testimonials_public` (`approval_status`,`is_featured`);

--
-- Indexes for table `trip_events`
--
ALTER TABLE `trip_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_trip_events_admin` (`created_by_admin_id`),
  ADD KEY `idx_trip_events_booking` (`booking_id`,`created_at`),
  ADD KEY `idx_trip_events_driver` (`driver_id`,`created_at`),
  ADD KEY `idx_trip_events_type` (`event_type`,`created_at`);

--
-- Indexes for table `trip_ratings`
--
ALTER TABLE `trip_ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `booking_id` (`booking_id`),
  ADD KEY `fk_trip_ratings_customer` (`customer_id`),
  ADD KEY `idx_trip_ratings_driver` (`driver_id`,`created_at`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `registration_no` (`registration_no`),
  ADD KEY `idx_vehicles_category_active` (`category_id`,`is_active`),
  ADD KEY `idx_vehicles_expiry` (`rc_expiry_date`,`insurance_expiry_date`,`permit_expiry_date`,`pollution_expiry_date`);

--
-- Indexes for table `vehicle_categories`
--
ALTER TABLE `vehicle_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_vehicle_categories_active_order` (`is_active`,`display_order`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_roles`
--
ALTER TABLE `admin_roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `app_devices`
--
ALTER TABLE `app_devices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `app_settings`
--
ALTER TABLE `app_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `app_versions`
--
ALTER TABLE `app_versions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auth_otp_requests`
--
ALTER TABLE `auth_otp_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auth_sessions`
--
ALTER TABLE `auth_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `blog_posts`
--
ALTER TABLE `blog_posts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_charges`
--
ALTER TABLE `booking_charges`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_driver_offers`
--
ALTER TABLE `booking_driver_offers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_invoices`
--
ALTER TABLE `booking_invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_status_history`
--
ALTER TABLE `booking_status_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cancellation_policies`
--
ALTER TABLE `cancellation_policies`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cities`
--
ALTER TABLE `cities`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cms_pages`
--
ALTER TABLE `cms_pages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `contact_enquiries`
--
ALTER TABLE `contact_enquiries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coupons`
--
ALTER TABLE `coupons`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_saved_places`
--
ALTER TABLE `customer_saved_places`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `drivers`
--
ALTER TABLE `drivers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `driver_documents`
--
ALTER TABLE `driver_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `driver_locations`
--
ALTER TABLE `driver_locations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `driver_payouts`
--
ALTER TABLE `driver_payouts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `driver_vehicle_assignments`
--
ALTER TABLE `driver_vehicle_assignments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `driver_wallet_transactions`
--
ALTER TABLE `driver_wallet_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `faqs`
--
ALTER TABLE `faqs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gallery_groups`
--
ALTER TABLE `gallery_groups`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `gallery_images`
--
ALTER TABLE `gallery_images`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `idempotency_keys`
--
ALTER TABLE `idempotency_keys`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_queue`
--
ALTER TABLE `job_queue`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `notification_logs`
--
ALTER TABLE `notification_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_templates`
--
ALTER TABLE `notification_templates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `remote_config_values`
--
ALTER TABLE `remote_config_values`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `routes`
--
ALTER TABLE `routes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `route_estimate_cache`
--
ALTER TABLE `route_estimate_cache`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seo_meta`
--
ALTER TABLE `seo_meta`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_tickets`
--
ALTER TABLE `support_tickets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_ticket_messages`
--
ALTER TABLE `support_ticket_messages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tariff_plans`
--
ALTER TABLE `tariff_plans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `testimonials`
--
ALTER TABLE `testimonials`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trip_events`
--
ALTER TABLE `trip_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trip_ratings`
--
ALTER TABLE `trip_ratings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicle_categories`
--
ALTER TABLE `vehicle_categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_profile_photos`
--
ALTER TABLE `admin_profile_photos`
  ADD CONSTRAINT `fk_admin_profile_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD CONSTRAINT `fk_admin_users_role` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`id`);

--
-- Constraints for table `app_devices`
--
ALTER TABLE `app_devices`
  ADD CONSTRAINT `fk_app_devices_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_app_devices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_app_devices_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `auth_sessions`
--
ALTER TABLE `auth_sessions`
  ADD CONSTRAINT `fk_auth_sessions_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_auth_sessions_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_auth_sessions_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `blog_posts`
--
ALTER TABLE `blog_posts`
  ADD CONSTRAINT `fk_blog_author` FOREIGN KEY (`author_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_bookings_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bookings_created_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bookings_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bookings_driver` FOREIGN KEY (`assigned_driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bookings_route` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bookings_vehicle` FOREIGN KEY (`assigned_vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bookings_vehicle_category` FOREIGN KEY (`vehicle_category_id`) REFERENCES `vehicle_categories` (`id`);

--
-- Constraints for table `booking_charges`
--
ALTER TABLE `booking_charges`
  ADD CONSTRAINT `fk_booking_charges_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `booking_driver_offers`
--
ALTER TABLE `booking_driver_offers`
  ADD CONSTRAINT `fk_booking_offers_admin` FOREIGN KEY (`sent_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_booking_offers_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_booking_offers_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_booking_offers_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `booking_invoices`
--
ALTER TABLE `booking_invoices`
  ADD CONSTRAINT `fk_booking_invoices_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `booking_status_history`
--
ALTER TABLE `booking_status_history`
  ADD CONSTRAINT `fk_booking_history_admin` FOREIGN KEY (`changed_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_booking_history_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_booking_history_customer` FOREIGN KEY (`changed_by_customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_booking_history_driver` FOREIGN KEY (`changed_by_driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `cms_pages`
--
ALTER TABLE `cms_pages`
  ADD CONSTRAINT `fk_cms_created_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cms_updated_admin` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `contact_enquiries`
--
ALTER TABLE `contact_enquiries`
  ADD CONSTRAINT `fk_contact_admin` FOREIGN KEY (`assigned_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_referred_by` FOREIGN KEY (`referred_by_customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `customer_saved_places`
--
ALTER TABLE `customer_saved_places`
  ADD CONSTRAINT `fk_saved_places_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `driver_documents`
--
ALTER TABLE `driver_documents`
  ADD CONSTRAINT `fk_driver_documents_admin` FOREIGN KEY (`verified_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_driver_documents_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_driver_documents_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `driver_locations`
--
ALTER TABLE `driver_locations`
  ADD CONSTRAINT `fk_driver_locations_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_driver_locations_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `driver_payouts`
--
ALTER TABLE `driver_payouts`
  ADD CONSTRAINT `fk_driver_payouts_admin` FOREIGN KEY (`approved_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_driver_payouts_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `driver_vehicle_assignments`
--
ALTER TABLE `driver_vehicle_assignments`
  ADD CONSTRAINT `fk_driver_vehicle_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_driver_vehicle_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `driver_wallet_transactions`
--
ALTER TABLE `driver_wallet_transactions`
  ADD CONSTRAINT `fk_driver_wallet_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_driver_wallet_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_driver_wallet_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `faqs`
--
ALTER TABLE `faqs`
  ADD CONSTRAINT `fk_faq_cms` FOREIGN KEY (`cms_page_id`) REFERENCES `cms_pages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_faq_route` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `gallery_images`
--
ALTER TABLE `gallery_images`
  ADD CONSTRAINT `fk_gallery_images_group` FOREIGN KEY (`group_id`) REFERENCES `gallery_groups` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notification_logs`
--
ALTER TABLE `notification_logs`
  ADD CONSTRAINT `fk_notification_logs_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notification_logs_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notification_logs_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notification_logs_device` FOREIGN KEY (`device_id`) REFERENCES `app_devices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notification_logs_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notification_logs_sender_admin` FOREIGN KEY (`sender_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notification_logs_template` FOREIGN KEY (`template_id`) REFERENCES `notification_templates` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `routes`
--
ALTER TABLE `routes`
  ADD CONSTRAINT `fk_routes_drop_city` FOREIGN KEY (`drop_city_id`) REFERENCES `cities` (`id`),
  ADD CONSTRAINT `fk_routes_pickup_city` FOREIGN KEY (`pickup_city_id`) REFERENCES `cities` (`id`);

--
-- Constraints for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD CONSTRAINT `fk_support_admin` FOREIGN KEY (`assigned_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_support_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_support_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_support_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `support_ticket_messages`
--
ALTER TABLE `support_ticket_messages`
  ADD CONSTRAINT `fk_support_messages_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_support_messages_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_support_messages_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_support_messages_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tariff_plans`
--
ALTER TABLE `tariff_plans`
  ADD CONSTRAINT `fk_tariff_route` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tariff_vehicle_category` FOREIGN KEY (`vehicle_category_id`) REFERENCES `vehicle_categories` (`id`);

--
-- Constraints for table `testimonials`
--
ALTER TABLE `testimonials`
  ADD CONSTRAINT `fk_testimonials_admin` FOREIGN KEY (`approved_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_testimonials_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_testimonials_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `trip_events`
--
ALTER TABLE `trip_events`
  ADD CONSTRAINT `fk_trip_events_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_trip_events_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_trip_events_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `trip_ratings`
--
ALTER TABLE `trip_ratings`
  ADD CONSTRAINT `fk_trip_ratings_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_trip_ratings_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_trip_ratings_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `fk_vehicles_category` FOREIGN KEY (`category_id`) REFERENCES `vehicle_categories` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
