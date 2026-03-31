const express = require('express');
const router = express.Router();
const chatController = require('./../controllers/chat.controller');
const { authMiddleware } = require('./../middlewares/auth.middleware');

// Basic chat
router.post('/message', chatController.sendMessage);
router.get('/history', chatController.getHistory);
router.delete('/history', chatController.clearHistory);

// Nutrition-specific
router.post('/nutrition', authMiddleware, chatController.askNutrition);

// Meal extraction features
router.post('/extract-meal', authMiddleware, chatController.extractMeal);
router.post('/save-meal', authMiddleware, chatController.saveMealFromChat);


module.exports = router;