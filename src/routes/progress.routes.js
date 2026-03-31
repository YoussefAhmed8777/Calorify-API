const express = require('express');
const router = express.Router();
const progressController = require('./../controllers/progress.controller');
const { authMiddleware } = require('./../middlewares/auth.middleware');

// Daily/Weekly progress
router.get('/today', authMiddleware, progressController.getTodayProgress);
router.get('/weekly', authMiddleware, progressController.getWeeklySummary);
router.get('/monthly', authMiddleware, progressController.getMonthlySummary);

// Streak
router.get('/streak', authMiddleware, progressController.getStreak);

// Weight tracking
router.post('/weight', authMiddleware, progressController.logWeight);
router.get('/weight-history', progressController.getWeightHistory);

// Achievements
router.get('/achievements', progressController.getAchievements);
router.post('/check-achievements', progressController.checkAchievements);

module.exports = router;