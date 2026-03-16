const express = require('express');
const { addMeal, getAllMeals, getMealById, removeMeal, updateMeal, createMeal, getUserMeals } = require('./../controllers/meal.controller');
const router = express.Router();
const { authMiddleware } = require('./../middlewares/auth.middleware');

// router.get('/meals', getAllMeals);
// router.get('/meal/:id', getMealById);
// router.post('/meal', addMeal);
// router.put('/meal/:id', updateMeal);
// router.put('/meal/:id', removeMeal);

// All meal routes require authentication
// router.use(authMiddleware);

// ========== MEAL CRUD ==========
router.post('/', createMeal);
router.get('/', getUserMeals);
router.get('/:id', getMealById);
router.put('/:id', updateMeal);

// ========== SUMMARIES ==========
// router.get('/summary/daily', mealController.getDailySummary);

module.exports = router;