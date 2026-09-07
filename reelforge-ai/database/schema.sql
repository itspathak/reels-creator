-- =============================================================
-- ReelForge AI - MySQL Database Schema
-- Run this file in MySQL to create the database and tables.
-- =============================================================

CREATE DATABASE IF NOT EXISTS reelforge
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE reelforge;

-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- reels
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reels (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  business_name VARCHAR(190) NOT NULL,
  business_type VARCHAR(120) NULL,
  description TEXT NULL,
  festival VARCHAR(100) NULL,
  location VARCHAR(190) NULL,
  offer VARCHAR(190) NULL,
  target_audience VARCHAR(190) NULL,
  language VARCHAR(60) DEFAULT 'English',
  style VARCHAR(60) DEFAULT 'Viral',
  goal VARCHAR(120) NULL,
  hook TEXT NULL,
  script LONGTEXT NULL,
  caption TEXT NULL,
  cta VARCHAR(190) NULL,
  hashtags TEXT NULL,
  voice_url VARCHAR(500) NULL,
  video_url VARCHAR(500) NULL,
  status ENUM('draft','generating','voice_generating','rendering','completed','failed') NOT NULL DEFAULT 'draft',
  error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reels_user (user_id),
  CONSTRAINT fk_reels_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- reel_media
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reel_media (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reel_id INT UNSIGNED NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type ENUM('image','video','logo') NOT NULL DEFAULT 'image',
  original_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reel_media_reel (reel_id),
  CONSTRAINT fk_reel_media_reel FOREIGN KEY (reel_id) REFERENCES reels(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- brand_kits
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brand_kits (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  business_name VARCHAR(190) NULL,
  logo_url VARCHAR(500) NULL,
  primary_color VARCHAR(20) DEFAULT '#6C5CE7',
  secondary_color VARCHAR(20) DEFAULT '#00CEA7',
  font_preference VARCHAR(120) DEFAULT 'Modern',
  instagram_username VARCHAR(120) NULL,
  website VARCHAR(190) NULL,
  phone VARCHAR(60) NULL,
  address VARCHAR(255) NULL,
  default_cta VARCHAR(190) DEFAULT 'Visit us today',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brand_kits_user (user_id),
  CONSTRAINT fk_brand_kits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- templates
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(190) NOT NULL,
  category VARCHAR(120) NOT NULL,
  description TEXT NULL,
  preview_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- subscriptions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  plan VARCHAR(60) NOT NULL DEFAULT 'free',
  status ENUM('active','trialing','canceled','past_due') NOT NULL DEFAULT 'active',
  reels_limit INT NOT NULL DEFAULT 5,
  reels_used INT NOT NULL DEFAULT 0,
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_subscriptions_user (user_id),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- usage  (backticked: "usage" is a reserved word in MariaDB/MySQL)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usage` (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  reel_id INT UNSIGNED NULL,
  operation VARCHAR(60) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_usage_user (user_id),
  CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_usage_reel FOREIGN KEY (reel_id) REFERENCES reels(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Seed: default templates
-- -------------------------------------------------------------
INSERT INTO templates (name, category, description) VALUES
('Viral Restaurant Reel', 'Restaurant', 'Fast-paced food showcase with bold text overlays'),
('Product Spotlight', 'Product', 'Clean product-focused reel with lifestyle shots'),
('Mega Sale Countdown', 'Sale', 'Urgent sale announcement with countdown energy'),
('Festival Celebration', 'Festival', 'Festive themed reel with colors and music'),
('Luxury Showcase', 'Luxury', 'Premium slow-motion style luxury presentation'),
('Minimal Business Intro', 'Minimal', 'Simple elegant business introduction'),
('Real Estate Walkthrough', 'Real Estate', 'Property tour with highlight captions'),
('Local Service Trust', 'Service', 'Service business credibility and social proof')
ON DUPLICATE KEY UPDATE name = VALUES(name);
