-- Persist public uploads (gallery, fleet, routes) so they survive Render disk resets.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS stored_media (
  path VARCHAR(500) NOT NULL PRIMARY KEY,
  mime_type VARCHAR(64) NOT NULL,
  data_base64 LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
