-- Website gallery: groups (cars outside / inside / destinations) + images.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS gallery_groups (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  group_type VARCHAR(40) NOT NULL DEFAULT 'custom',
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_gallery_groups_order (is_active, display_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gallery_images (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(180) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gallery_images_group
    FOREIGN KEY (group_id) REFERENCES gallery_groups(id) ON DELETE CASCADE,
  KEY idx_gallery_images_group (group_id, display_order)
) ENGINE=InnoDB;

INSERT IGNORE INTO gallery_groups (slug, title, group_type, display_order, is_active) VALUES
  ('cars-outside', 'Cars — Outside', 'cars_outside', 1, 1),
  ('cars-inside', 'Cars — Inside', 'cars_inside', 2, 1),
  ('destinations', 'Destinations', 'destinations', 3, 1);
