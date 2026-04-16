const router = require('express').Router();
const scanController = require('./../controllers/scan.controller');
const { authMiddleware } = require('./../middlewares/auth.middleware');
const { scanLimiter, premiumScanLimiter } = require('./../middlewares/rateLimiter.middleware');

// Scan endpoint (3/day for free tier)
router.post('/meal', authMiddleware, scanLimiter, scanController.uploadSingle, scanController.scanMeal);
// router.post('/meal', authMiddleware,  scanController.uploadSingle, scanController.scanMeal);

// Premium scan endpoint (unlimited)
// router.post('/meal/premium', authMiddleware, premiumScanLimiter, scanController.upload, scanController.scanMeal);
// router.post('/meal/premium', premiumScanLimiter, scanController.uploadSingle, scanController.scanMeal);

// Save scanned meal
router.post('/save', authMiddleware, scanController.saveScanAsMeal);

module.exports = router;