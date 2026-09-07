-- =============================================================
-- ReelForge AI - PostgreSQL Schema (Vercel Storage / Neon)
-- Mirrors database/schema.sql. Idempotent.
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS reels (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  business_name VARCHAR(190) NOT NULL,
  business_type VARCHAR(120),
  description TEXT,
  festival VARCHAR(100),
  location VARCHAR(190),
  offer VARCHAR(190),
  target_audience VARCHAR(190),
  language VARCHAR(60) DEFAULT 'English',
  style VARCHAR(60) DEFAULT 'Viral',
  goal VARCHAR(120),
  hook TEXT,
  script TEXT,
  caption TEXT,
  cta VARCHAR(190),
  hashtags TEXT,
  voice_url VARCHAR(500),
  video_url VARCHAR(500),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_reels_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reels_user ON reels (user_id);

CREATE TABLE IF NOT EXISTS reel_media (
  id BIGSERIAL PRIMARY KEY,
  reel_id BIGINT NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(20) NOT NULL DEFAULT 'image',
  original_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_reel_media_reel FOREIGN KEY (reel_id) REFERENCES reels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reel_media_reel ON reel_media (reel_id);

CREATE TABLE IF NOT EXISTS brand_kits (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  business_name VARCHAR(190),
  logo_url VARCHAR(500),
  primary_color VARCHAR(20) DEFAULT '#6C5CE7',
  secondary_color VARCHAR(20) DEFAULT '#00CEA7',
  font_preference VARCHAR(120) DEFAULT 'Modern',
  instagram_username VARCHAR(120),
  website VARCHAR(190),
  phone VARCHAR(60),
  address VARCHAR(255),
  default_cta VARCHAR(190) DEFAULT 'Visit us today',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_brand_kits_user UNIQUE (user_id),
  CONSTRAINT fk_brand_kits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(190) NOT NULL UNIQUE,
  category VARCHAR(120) NOT NULL,
  description TEXT,
  preview_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  plan VARCHAR(60) NOT NULL DEFAULT 'free',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  reels_limit INT NOT NULL DEFAULT 5,
  reels_used INT NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);

CREATE TABLE IF NOT EXISTS "usage" (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  reel_id BIGINT,
  operation VARCHAR(60) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_usage_reel FOREIGN KEY (reel_id) REFERENCES reels(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON "usage" (user_id);

-- Seed: default templates
INSERT INTO templates (name, category, description) VALUES
  ('Viral Restaurant Reel', 'Restaurant', 'Fast-paced food showcase with bold text overlays'),
  ('Product Spotlight', 'Product', 'Clean product-focused reel with lifestyle shots'),
  ('Mega Sale Countdown', 'Sale', 'Urgent sale announcement with countdown energy'),
  ('Festival Celebration', 'Festival', 'Festive themed reel with colors and music'),
  ('Luxury Showcase', 'Luxury', 'Premium slow-motion style luxury presentation'),
  ('Minimal Business Intro', 'Minimal', 'Simple elegant business introduction'),
  ('Real Estate Walkthrough', 'Real Estate', 'Property tour with highlight captions'),
  ('Local Service Trust', 'Service', 'Service business credibility and social proof')
ON CONFLICT (name) DO NOTHING;