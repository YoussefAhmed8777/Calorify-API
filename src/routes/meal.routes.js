const express = require('express');
const { getMealById, removeMeal, updateMeal, createMeal, getUserMeals, getDailySummary } = require('./../controllers/meal.controller');
const   router = express.Router();
const { authMiddleware } = require('./../middlewares/auth.middleware');
const validate = require('./../middlewares/validate.middleware');

// MEAL CRUD
router.post('/', authMiddleware, validate('createMeal'), createMeal);
router.get('/', authMiddleware, getUserMeals);
router.get('/:id', authMiddleware, getMealById);
router.put('/:id', authMiddleware, validate('updateMeal'), updateMeal);
router.put('/meal/:id', authMiddleware, removeMeal);

// SUMMARIES
router.get('/summary/daily', authMiddleware, getDailySummary);

module.exports = router;