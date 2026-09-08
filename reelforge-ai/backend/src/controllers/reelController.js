const Reel = require('../models/reelModel');
const ReelMedia = require('../models/reelMediaModel');
const pool = require('../db');
const aiService = require('../services/aiService');
const voiceService = require('../services/voiceService');
const videoService = require('../services/videoService');

/**
 * POST /api/reels
 * Create a reel record (draft) with business details.
 */
const createReel = async (req, res, next) => {
  try {
    const {
      business_name,
      business_type,
      description,
      festival,
      location,
      shop_number,
      address,
      offer,
      target_audience,
      language,
      style,
      goal,
      voice_preference,
    } = req.body;

    if (!business_name || !business_name.trim()) {
      return res.status(400).json({ success: false, message: 'Business name is required' });
    }
    if (!business_type) {
      return res.status(400).json({ success: false, message: 'Business type is required' });
    }

    const reelId = await Reel.create({
      user_id: req.user.id,
      business_name: business_name.trim(),
      business_type,
      description: description || null,
      festival: festival || null,
      location: location || null,
      shop_number: shop_number || null,
      address: address || null,
      offer: offer || null,
      target_audience: target_audience || null,
      language: language || 'English',
      style: style || 'Viral',
      goal: goal || null,
      voice_preference: voice_preference || 'auto',
      status: 'draft',
    });

    const reel = await Reel.findById(reelId);

    return res.status(201).json({
      success: true,
      message: 'Reel created',
      data: { reel },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reels?status=
 * List current user's reels.
 */
const listReels = async (req, res, next) => {
  try {
    const reels = await Reel.findByUser(req.user.id, req.query.status || 'all');

    return res.json({
      success: true,
      message: 'Reels fetched successfully',
      data: { reels },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/reels/:id
 * Update business details of a draft reel.
 */
const updateReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    if (reel.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (reel.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft reels can be edited' });
    }

    const allowed = ['business_name', 'business_type', 'description', 'festival', 'location', 'shop_number', 'address', 'offer', 'target_audience', 'language', 'style', 'goal', 'voice_preference'];
    const fields = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) fields[k] = req.body[k];
    });
    if (fields.business_name !== undefined && (!fields.business_name || !String(fields.business_name).trim())) {
      return res.status(400).json({ success: false, message: 'Business name cannot be empty' });
    }

    await Reel.update(reel.id, fields);
    const updated = await Reel.findById(reel.id);
    return res.json({ success: true, message: 'Reel updated', data: { reel: updated } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reels/:id
 * Get a single reel with media.
 */
const getReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    if (reel.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const media = await ReelMedia.findByReel(reel.id);

    let scenes = null;
    if (reel.script) {
      try {
        const parsed = JSON.parse(reel.script);
        scenes = parsed.scenes || null;
      } catch {
        scenes = null;
      }
    }

    return res.json({
      success: true,
      message: 'Reel fetched successfully',
      data: { reel, media, scenes },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Check subscription limit. Returns true when the user may generate.
 */
const checkUsageLimit = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  const sub = rows[0];
  if (!sub) return { allowed: false, message: 'No active subscription' };
  if (sub.reels_used >= sub.reels_limit) {
    return { allowed: false, message: 'Monthly reels limit reached. Upgrade your plan to continue.' };
  }
  return { allowed: true, subscription: sub };
};

const simulateProgress = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST /api/reels/:id/generate
 * Runs the full generation pipeline:
 *   1. validate ownership + usage limit
 *   2. AI generates concept (hook, scenes, script, caption, hashtags, cta)
 *   3. Voice generation
 *   4. Video rendering (demo or Creatomate)
 */
const generateReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    if (reel.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const limitCheck = await checkUsageLimit(req.user.id);
    if (!limitCheck.allowed) {
      return res.status(403).json({ success: false, message: limitCheck.message });
    }

    if (reel.status === 'generating' || reel.status === 'voice_generating' || reel.status === 'rendering') {
      return res.status(409).json({ success: false, message: 'This reel is already generating' });
    }

    await Reel.update(reel.id, { status: 'generating', error: null });

    // Fire and forget so the client can poll /status
    runGeneration(reel.id, req.user.id).catch((err) => {
      console.error('[Generation failed]', err);
      Reel.update(reel.id, { status: 'failed', error: err.message }).catch(() => {});
    });

    return res.json({
      success: true,
      message: 'Generation started',
      data: { reelId: reel.id, status: 'generating' },
    });
  } catch (err) {
    next(err);
  }
};

async function runGeneration(reelId, userId) {
  const reel = await Reel.findById(reelId);
  if (!reel) return;

  const media = await ReelMedia.findByReel(reelId);

  await Reel.update(reelId, { status: 'generating' });
  await simulateProgress(2000);

  // Step 1: AI concept
  const concept = await aiService.generateReelConcept({
    business_name: reel.business_name,
    business_type: reel.business_type,
    description: reel.description,
    festival: reel.festival,
    location: reel.location,
    offer: reel.offer,
    target_audience: reel.target_audience,
    language: reel.language,
    style: reel.style,
    goal: reel.goal,
  });

  await Reel.update(reelId, {
    hook: concept.hook,
    script: JSON.stringify({ concept: concept.concept, scenes: concept.scenes }),
    caption: concept.caption,
    cta: concept.cta,
    hashtags: JSON.stringify(concept.hashtags),
    status: 'voice_generating',
  });

  // Step 2: Voice generation
  let voiceUrl = null;
  try {
    const voiceResult = await voiceService.generateVoice(concept.voiceover, reel.language, {
      voice: reel.voice_preference || 'auto',
    });
    if (voiceResult.url) {
      voiceUrl = voiceResult.url;
    }
    await Reel.update(reelId, { voice_url: voiceUrl, status: 'rendering' });
  } catch (err) {
    console.error('[Voice generation error]', err.message);
  }

  // Step 3: Video rendering
  const brandKit = await fetchBrandKit(userId);
  let videoUrl = null;
  const videoResult = await videoService.createReelVideo({
    template: {
      name: reel.style,
      business_name: reel.business_name,
      business_type: reel.business_type,
      offer: reel.offer,
      location: reel.location,
      description: reel.description,
      festival: reel.festival,
      language: reel.language,
      style: reel.style,
    },
    scenes: concept.scenes,
    media,
    voiceUrl,
    brandKit,
  });

  if (videoResult.url) {
    videoUrl = videoResult.url;
  }

  // Log usage
  await pool.execute(
    'INSERT INTO `usage` (user_id, reel_id, operation) VALUES (?, ?, ?)',
    [userId, reelId, 'generate_reel']
  );
  await pool.execute(
    'UPDATE subscriptions SET reels_used = reels_used + 1 WHERE user_id = ?',
    [userId]
  );

  await Reel.update(reelId, { video_url: videoUrl, status: 'completed' });
}

async function fetchBrandKit(userId) {
  const [rows] = await pool.execute('SELECT * FROM brand_kits WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

/**
 * GET /api/reels/:id/status
 * Poll endpoint for generation status.
 */
const getReelStatus = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    if (reel.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let scenes = null;
    if (reel.script) {
      try {
        scenes = JSON.parse(reel.script).scenes || null;
      } catch {
        scenes = null;
      }
    }

    return res.json({
      success: true,
      message: 'Reel status fetched',
      data: { reel, scenes, sceneCount: scenes ? scenes.length : 0 },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reels/:id/regenerate
 * Re-runs AI generation using the same business info.
 */
const regenerateReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    if (reel.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Reel.update(reel.id, { status: 'generating', error: null });

    runGeneration(reel.id, req.user.id).catch((err) => {
      console.error('[Regeneration failed]', err);
      Reel.update(reel.id, { status: 'failed', error: err.message }).catch(() => {});
    });

    return res.json({
      success: true,
      message: 'Regeneration started',
      data: { reelId: reel.id, status: 'generating' },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/reels/:id
 */
const deleteReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    if (reel.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const media = await ReelMedia.findByReel(reel.id);
    const fs = require('fs');
    const path = require('path');

    media.forEach((m) => {
      if (m.file_url && m.file_url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '../../', m.file_url);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {}
      }
    });

    await Reel.delete(reel.id);

    return res.json({ success: true, message: 'Reel deleted successfully', data: null });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reels/:id/media
 * Upload media for a reel.
 */
const addMedia = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    if (reel.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileType = req.body.file_type || (req.file.mimetype.startsWith('video') ? 'video' : 'image');
    const mediaId = await ReelMedia.create({
      reel_id: reel.id,
      file_url: `/uploads/${req.file.filename}`,
      file_type: fileType,
      original_name: req.file.originalname,
    });

    const media = await ReelMedia.findByReel(reel.id);

    return res.status(201).json({
      success: true,
      message: 'Media uploaded',
      data: { mediaId, media },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/reels/:id/media/:mediaId
 */
const deleteMedia = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    if (reel.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [mediaRows] = await pool.execute('SELECT * FROM reel_media WHERE id = ?', [req.params.mediaId]);
    const mediaItem = mediaRows[0];
    if (!mediaItem || mediaItem.reel_id !== reel.id) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    if (mediaItem.file_url && mediaItem.file_url.startsWith('/uploads/')) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../', mediaItem.file_url);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    }

    await ReelMedia.delete(mediaItem.id);
    const media = await ReelMedia.findByReel(reel.id);

    return res.json({
      success: true,
      message: 'Media deleted',
      data: { media },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/brand-kit
 * POST /api/brand-kit
 * PUT /api/brand-kit  (same as POST, upsert)
 */
const getBrandKit = async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM brand_kits WHERE user_id = ?', [req.user.id]);
    return res.json({
      success: true,
      message: 'Brand kit fetched',
      data: { brandKit: rows[0] || null },
    });
  } catch (err) {
    next(err);
  }
};

const upsertBrandKit = async (req, res, next) => {
  try {
    const {
      business_name,
      logo_url,
      primary_color,
      secondary_color,
      font_preference,
      instagram_username,
      website,
      phone,
      address,
      default_cta,
    } = req.body;

    await pool.execute(
      `INSERT INTO brand_kits (
        user_id, business_name, logo_url, primary_color, secondary_color,
        font_preference, instagram_username, website, phone, address, default_cta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        business_name = VALUES(business_name),
        logo_url = VALUES(logo_url),
        primary_color = VALUES(primary_color),
        secondary_color = VALUES(secondary_color),
        font_preference = VALUES(font_preference),
        instagram_username = VALUES(instagram_username),
        website = VALUES(website),
        phone = VALUES(phone),
        address = VALUES(address),
        default_cta = VALUES(default_cta)`,
      [
        req.user.id,
        business_name || null,
        logo_url || null,
        primary_color || '#6C5CE7',
        secondary_color || '#00CEA7',
        font_preference || 'Modern',
        instagram_username || null,
        website || null,
        phone || null,
        address || null,
        default_cta || 'Visit us today',
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM brand_kits WHERE user_id = ?', [req.user.id]);

    return res.json({
      success: true,
      message: 'Brand kit saved',
      data: { brandKit: rows[0] },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/usage
 */
const getUsage = async (req, res, next) => {
  try {
    const [sub] = await pool.execute(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    const [usageRows] = await pool.execute(
      'SELECT operation, COUNT(*) AS count, DATE(created_at) AS date FROM `usage` WHERE user_id = ? GROUP BY DATE(created_at), operation ORDER BY date DESC LIMIT 30',
      [req.user.id]
    );

    const subscription = sub[0] || {
      plan: 'free',
      status: 'active',
      reels_limit: 50,
      reels_used: 0,
    };

    return res.json({
      success: true,
      message: 'Usage fetched',
      data: {
        plan: subscription.plan,
        reelsLimit: subscription.reels_limit,
        reelsUsed: subscription.reels_used,
        reelsRemaining: Math.max(0, subscription.reels_limit - subscription.reels_used),
        resetDate: subscription.end_date || null,
        history: usageRows,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReel,
  updateReel,
  listReels,
  getReel,
  generateReel,
  getReelStatus,
  regenerateReel,
  deleteReel,
  addMedia,
  deleteMedia,
  getBrandKit,
  upsertBrandKit,
  getUsage,
};