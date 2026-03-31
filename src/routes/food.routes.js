const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./../middlewares/auth.middleware');
const { searchFoods, getFoodDetails } = require('../controllers/food.controller');

// FOOD SEARCH
router.get('/search', authMiddleware, searchFoods);
router.get('/food/:id', authMiddleware, getFoodDetails);

module.exports = router;