const express = require('express');
const { getMealById, removeMeal, updateMeal, createMeal, getUserMeals, getDailySummary } = require('./../controllers/meal.controller');
const router = express.Router();
const { authMiddleware } = require('./../middlewares/auth.middleware');


// router.put('/meal/:id', removeMeal);

// MEAL CRUD
router.post('/', authMiddleware, createMeal);
router.get('/', authMiddleware, getUserMeals);
router.get('/:id', authMiddleware, getMealById);
router.put('/:id', authMiddleware, updateMeal);

// SUMMARIES
router.get('/summary/daily', getDailySummary);

module.exports = router;