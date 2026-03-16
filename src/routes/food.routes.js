const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./../middlewares/auth.middleware');
const { searchFoods, getFoodDetails } = require('../controllers/food.controller');

// All meal routes require authentication
// router.use(authMiddleware);

// FOOD SEARCH
router.get('/search', searchFoods);
router.get('/food/:id', getFoodDetails);

module.exports = router;