const express = require('express');
const { getBrandKit, upsertBrandKit, getUsage } = require('../controllers/reelController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/brand-kit', getBrandKit);
router.post('/brand-kit', upsertBrandKit);
router.put('/brand-kit', upsertBrandKit);

router.get('/usage', getUsage);

module.exports = router;