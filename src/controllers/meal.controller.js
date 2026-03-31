const Meal = require('./../models/meal.model');
const fatsecretService = require('./../services/fatsecret.services');
const progressService = require('./../services/progress.services');
// const { parseFoodDescription, formatFoodForClient } = require('./../utilities/foodhelpers');

exports.getAllMeals = async(req,res)=>{
  try {
    const getMeals = await Meal.find();
    if (getMeals.length > 0) {
      res.status(200).json({
        success: true,
        message: 'Here are all meals',
        data: getMeals
      });
    }else{
      res.status(404).json({
        success: false,
        message: 'No Meals Found'
      });
    }
  } catch (error) {
    console.log('Error Happened', error);
    res.status(500).json({
      success: false,
      message: 'Something Went Wrong'
    });
  }
};

// exports.getMealById = async(req,res)=>{
//   try {
//     const mealID = await req.params.id;
//     const mealDetailsByID = await Meal.findById(mealID);
//     if (!mealDetailsByID) {
//       return res.status(404).json({
//         success: false,
//         message: 'Meal of current id is not found'
//       });
//     }else{
//       res.status(200).json({
//         success: true,
//         message: 'Meal Found',
//         data: mealDetailsByID
//       });
//     }
//   } catch (error) {
//     console.log('Error Happened', error);
//     res.status(500).json({
//       success: false,
//       message: 'Something Went Wrong'
//     });
//   }
// };


exports.getMealById = async (req, res) => { // GET SINGLE MEAL // GET /calorify/meals/:id
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    console.log(`Fetching meal ${id} for user ${userId}`);

    const meal = await Meal.findOne({
      _id: id,
      userId
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Meal found successfully',
      data: meal
    });

  } catch (error) {
    console.log('Get meal error:', error);
    res.status(500).json({ 
      error: 'Failed to get meal',
      details: error.message 
    });
  }
};

// exports.addMeal = async(req,res)=>{
//   try {
//     const mealData = req.body;
//     const createdMeal = await Meal.create(mealData);
//     console.log(createdMeal);
//     if (createdMeal) {
//       res.status(201).json({
//         success: true,
//         message: 'Meal Added Successfully',
//         data: createdMeal
//       });
//     }
//   } catch (error) {
//     console.log('Error Happened', error);
//     res.status(500).json({
//       message:'Something Went Wrong'
//     });
//   }
// };


exports.createMeal = async (req, res) => {
  // CREATE MEAL
  // POST /calorify/meals
  try {
    const userId = req.user.uid; // From auth middleware
    const { foods, mealType, name, notes } = req.body;

    console.log(`Creating meal for user: ${userId}`);

    // Validate input
    if (!foods || !foods.length) {
      return res.status(400).json({ error: 'At least one food item is required' });
    }

    if (!mealType) {
      return res.status(400).json({ error: 'Meal type is required' });
    }

    // Process each food item
    const processedFoods = await Promise.all(foods.map(async (food) => {
      // If it's from FatSecret, get full details
      if (food.foodId && !food.customName) {
        const details = await fatsecretService.getFoodDetails(food.foodId);
        const serving = details.servings[0]; // Use first serving as default
        
        return {
          foodId: food.foodId,
          customName: details.name,
          quantity: {
            value: food.quantity || 1,
            unit: 'serving'
          },
          nutrition: {
            calories: serving.calories * (food.quantity || 1),
            protein: serving.protein * (food.quantity || 1),
            carbs: serving.carbs * (food.quantity || 1),
            fat: serving.fat * (food.quantity || 1)
          }
        };
      } 
      // Custom food entry
      else {
        return {
          customName: food.name,
          quantity: {
            value: food.quantity || 1,
            unit: food.unit || 'serving'
          },
          nutrition: food.nutrition
        };
      }
    }));

    // Create meal
    const meal = await Meal.create({
      userId,
      name: name || `${mealType} meal`,
      mealType,
      foods: processedFoods,
      notes,
      source: 'manual'
    });

      // 1. Update daily progress (streaks, calories)
      await progressService.updateDailyProgress(userId, new Date());
      
      // 2. Increment user's total meal count
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.mealsLogged': 1 }
      });

    res.status(201).json({
      success: true,
      message: 'Meal created successfully',
      data: meal
    });

  } catch (error) {
    console.log('Create meal error:', error);
    res.status(500).json({ 
      error: 'Failed to create meal',
      details: error.message 
    });
  }
};

// exports.updateMeal = async(req,res)=>{
//   try {
//     const currentMealID = await req.params.id;
//     const updateMealData = await Meal.findByIdAndUpdate(currentMealID, req.body, {returnDocument:'after'});
//     if (!updateMealData) {
//       res.status(400).json({
//         success: true,
//         message: 'Meal data is not updated'
//       });
//     }else{
//       res.status(200).json({
//         success: true,
//         message: 'Meal Data Updated Successfully',
//         data: updateMealData
//       });
//     }
//   } catch (error) {
//     console.log('Error Happened', error);
//     res.status(500).json({
//       message:'Something Went Wrong'
//     });
//   }
// };


exports.updateMeal = async (req, res) => {
  // UPDATE MEAL
  // PUT /calorify/meals/:id
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const updates = req.body;

    console.log(`Updating meal ${id} for user ${userId}`);

    const meal = await Meal.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Meal updated successfully',
      data: meal
    });

  } catch (error) {
    console.log('Update meal error:', error);
    res.status(500).json({ 
      error: 'Failed to update meal',
      details: error.message 
    });
  }
};

exports.removeMeal = async(req,res)=>{
  try {
    const currentMealID = await req.params.id;
    const removedMeal = await Meal.findByIdAndUpdate(currentMealID, {isRemoved:true});
    if(!removedMeal){
      res.status(400).json({
        success: false,
        message: 'Meal is not removed'
      });
    }else{
      res.status(200).json({
        success: true,
        message: 'Meal is removed successfully',
        data: removedMeal
      });
    }
  } catch (error) {
    console.log('Error Happened', error);
    res.status(500).json({
      message:'Something Went Wrong'
    });
  }
};

// GET USER MEALS
// GET /calorify/meals
exports.getUserMeals = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { page = 1, limit = 10 } = req.query;

    console.log(`Fetching meals for user: ${userId}, page: ${page}`);

    const meals = await Meal.find({ userId })
      .sort({ date: -1 }) // Newest first
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Meal.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: meals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.log('Get meals error:', error);
    res.status(500).json({ 
      error: 'Failed to get meals',
      details: error.message 
    });
  }
};

// GET DAILY SUMMARY
// GET /calorify/meals/summary/daily?date=2024-03-13
exports.getDailySummary = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { date } = req.query;

    // Use today if no date provided
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Getting daily summary for user ${userId} on ${targetDate.toDateString()}`);

    const meals = await Meal.find({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ date: 1 });

    // Calculate totals
    const summary = {
      date: targetDate.toISOString().split('T')[0],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: [],
      mealCount: meals.length
    };

    meals.forEach(meal => {
      summary.totalCalories += meal.total.calories || 0;
      summary.totalProtein += meal.total.protein || 0;
      summary.totalCarbs += meal.total.carbs || 0;
      summary.totalFat += meal.total.fat || 0;
      
      summary.meals.push({
        id: meal._id,
        type: meal.mealType,
        name: meal.name,
        time: meal.date,
        calories: meal.total.calories,
        foodCount: meal.foods.length
      });
    });

    // Round to 1 decimal
    summary.totalProtein = Math.round(summary.totalProtein * 10) / 10;
    summary.totalCarbs = Math.round(summary.totalCarbs * 10) / 10;
    summary.totalFat = Math.round(summary.totalFat * 10) / 10;

    res.status(200).json({
      success: true,
      message: 'Summary found successfully',
      data: summary
    });

  } catch (error) {
    console.log('Daily summary error:', error);
    res.status(500).json({ 
      error: 'Failed to get daily summary',
      details: error.message 
    });
  }
};