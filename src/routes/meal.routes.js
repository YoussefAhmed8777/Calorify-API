const express = require('express');
const { addMeal, getAllMeals, getMealById, removeMeal, updateMeal } = require('./../controllers/meal.controller');
const router = express.Router();

router.get('/meals', getAllMeals);
router.get('/meal/:id', getMealById);
router.post('/meal', addMeal);
router.put('/meal/:id', updateMeal);
router.put('/meal/:id', removeMeal);

module.exports = router;