const router = require('express').Router();
const chatController = require('./../controllers/chat.controller');
const { authMiddleware } = require('./../middlewares/auth.middleware');

// All chat routes require authentication
// router.use(authMiddleware);

// Basic chat
router.post('/message', chatController.sendMessage);
router.get('/history', chatController.getHistory);
router.delete('/history', chatController.clearHistory);

// Nutrition-specific
router.post('/nutrition', chatController.askNutrition);

// Meal extraction features
router.post('/extract-meal', chatController.extractMeal);
router.post('/save-meal', chatController.saveMealFromChat);

module.exports = router;