const express = require('express');
const {
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
} = require('../controllers/reelController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createReel);
router.get('/', listReels);
router.get('/:id', getReel);
router.put('/:id', updateReel);
router.post('/:id/generate', generateReel);
router.get('/:id/status', getReelStatus);
router.post('/:id/regenerate', regenerateReel);
router.delete('/:id', deleteReel);

router.post('/:id/media', upload.single('file'), addMedia);
router.delete('/:id/media/:mediaId', deleteMedia);

module.exports = router;