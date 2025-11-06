-- Create DB
CREATE DATABASE IF NOT EXISTS dashboarddb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dashboarddb;

-- Persist uploaded dataset info
CREATE TABLE IF NOT EXISTS datasets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  original_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(255) NOT NULL,
  row_count INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Raw preview data (JSON of first N rows; you can scale this as needed)
CREATE TABLE IF NOT EXISTS dataset_preview (
  dataset_id BIGINT UNSIGNED PRIMARY KEY,
  preview_json LONGTEXT NOT NULL,
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

-- Full computed stats for charts (JSON blob from the backend)
CREATE TABLE IF NOT EXISTS dataset_statistics (
  dataset_id BIGINT UNSIGNED PRIMARY KEY,
  stats_json LONGTEXT NOT NULL,
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

-- Optional: save chart/pipeline presets
CREATE TABLE IF NOT EXISTS presets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  config_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
