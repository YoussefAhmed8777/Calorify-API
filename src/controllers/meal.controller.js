/**
 * Meal Controller
 * ----------------
 * Handles CRUD operations for user meals (food diary).
 *
 * Each meal contains:
 *   - An array of food items (each with name, quantity, and nutrition)
 *   - Automatically computed totals (via meal.middleware.js pre-validate hook)
 *   - A source field indicating how it was created: 'manual', 'ai_scan', or 'chat'
 *
 * After every create/update/remove:
 *   - Daily progress is recalculated (calories consumed, macros, streak)
 *   - User's lifetime meal count is updated
 *
 * Dependencies:
 *   - Meal model:         MongoDB document with foods[], total{}, and scanData{}
 *   - User model:         For updating stats.mealsLogged
 *   - fatsecretService:   Fetches nutrition when creating meals with FatSecret food IDs
 *   - progressService:    Recalculates daily progress after meal changes
 */
const Meal = require('./../models/meal.model');
const User = require('./../models/user.model');
const fatsecretService = require('./../services/fatsecret.services');
const progressService = require('./../services/progress.services');

/**
 * GET ALL MEALS (Admin/Debug)
 * GET /calorify/meals/all
 *
 * Returns every meal in the database (no user filter).
 * Note: The pre-find middleware in meal.middleware.js auto-excludes soft-deleted meals.
 */
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

/**
 * GET SINGLE MEAL
 * GET /calorify/meals/:id
 *
 * Fetches a specific meal by ID, scoped to the authenticated user.
 * Excluded soft-deleted meals (isRemoved: true).
 */
exports.getMealById = async (req, res) => { 
  try {
    const { id } = req.params;
    const userID = req.user.uid;

    console.log(`Fetching meal ${id} for user ${userID}`);

    // Find meal owned by the current user that hasn't been soft-deleted
    const meal = await Meal.findOne({
      _id: id,
      userID,
      isRemoved: { $ne: true }
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

/**
 * CREATE MEAL
 * POST /calorify/meals
 *
 * Body:
 *   {
 *     mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'pre-workout' | 'post-workout',
 *     name:     'My meal name' (optional — auto-generated if missing),
 *     notes:    'Optional notes' (max 200 chars),
 *     foods: [{
 *       // Option A: FatSecret food (nutrition auto-fetched)
 *       foodId:   '35718',
 *       quantity: 2,
 *
 *       // Option B: Custom food (nutrition provided by client)
 *       name:      'Homemade soup',
 *       quantity:  1,
 *       unit:      'cup',
 *       nutrition: { calories: 150, protein: 8, carbs: 20, fat: 4 }
 *     }]
 *   }
 *
 * Food processing:
 *   - FatSecret foods (have foodId, no customName): nutrition is fetched from FatSecret API
 *   - Custom foods (have name, no foodId): nutrition comes from the request body
 *
 * After saving:
 *   - meal.middleware.js auto-calculates the meal's total nutrition
 *   - Daily progress is updated (calories consumed, macros, streak)
 *   - User's stats.mealsLogged is incremented
 */
exports.createMeal = async (req, res) => {
  try {
    const userID = req.user.uid; // From auth middleware
    const { foods, mealType, name, notes } = req.body;

    console.log(  `Creating meal for user: ${userID}`);

    // Validate input — at least one food item required
    if (!foods || !foods.length) {
      return res.status(400).json({ error: 'At least one food item is required' });
    }

    if (!mealType) {
      return res.status(400).json({ error: 'Meal type is required' });
    }

    // Process each food item — fetch nutrition from FatSecret or use provided data
    const processedFoods = await Promise.all(foods.map(async (food) => {
      // FatSecret food: has foodId but no customName → fetch nutrition from API
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
          // Multiply per-serving nutrition by the quantity
          nutrition: {
            calories: serving.calories * (food.quantity || 1),
            protein: serving.protein * (food.quantity || 1),
            carbs: serving.carbs * (food.quantity || 1),
            fat: serving.fat * (food.quantity || 1)
          }
        };
      } 
      // Custom food: user provided the nutrition data manually
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

    // Create meal document — pre-validate middleware will auto-calculate total{}
    const meal = await Meal.create({
      userID,
      name: name || `${mealType} meal`,
      mealType,
      foods: processedFoods,
      notes,
      source: 'manual'
    });

    // Update daily progress (recalculates total calories, macros, and streak for today)
    const progress = await progressService.updateDailyProgress(userID, new Date());
    
    // Increment user's lifetime meal count
    await User.findByIdAndUpdate(userID, {
      $inc: { 'stats.mealsLogged': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Meal created successfully',
      data: meal,
      dailyProgress: {
        caloriesConsumed: progress.daily.calories.consumed,
        caloriesGoal: progress.daily.calories.goal,
        caloriesRemaining: Math.max(0, progress.daily.calories.goal - progress.daily.calories.consumed),
        percentage: progress.daily.calories.percentage,
        protein: progress.daily.protein,
        carbs: progress.daily.carbs,
        fat: progress.daily.fat,
        mealsLogged: progress.daily.mealsLogged
      }
    });

  } catch (error) {
    console.log('Create meal error:', error);
    res.status(500).json({ 
      error: 'Failed to create meal',
      details: error.message 
    });
  }
};

/**
 * UPDATE MEAL
 * PUT /calorify/meals/:id
 *
 * Updates any fields on an existing meal (scoped to the authenticated user).
 * Uses findOneAndUpdate with runValidators to ensure schema rules are enforced.
 *
 * Note: If foods[] is updated, the pre-validate hook in meal.middleware.js
 *       does NOT run because findOneAndUpdate bypasses Mongoose middleware.
 *       The total{} field will only be recalculated if the document is
 *       loaded and saved explicitly.
 *
 * After updating:
 *   - Daily progress is recalculated for the meal's date
 */
exports.updateMeal = async (req, res) => {  
  try {
    const { id } = req.params;
    const userID = req.user.uid;
    const updates = req.body;

    console.log(`Updating meal ${id} for user ${userID}`);

    // Find and update — returnDocument: 'after' returns the updated document
    const meal = await Meal.findOneAndUpdate(
      { _id: id, userID},
      updates,
      { returnDocument: 'after', runValidators: true }
    );

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Recalculate daily progress for the meal's date (not necessarily today)
    const progress = await progressService.updateDailyProgress(userID, meal.date || new Date());

    res.status(200).json({
      success: true,
      message: 'Meal updated successfully',
      data: meal,
      dailyProgress: {
        caloriesConsumed: progress.daily.calories.consumed,
        caloriesGoal: progress.daily.calories.goal,
        caloriesRemaining: Math.max(0, progress.daily.calories.goal - progress.daily.calories.consumed),
        percentage: progress.daily.calories.percentage,
        protein: progress.daily.protein,
        carbs: progress.daily.carbs,
        fat: progress.daily.fat,
        mealsLogged: progress.daily.mealsLogged
      }
    });

  } catch (error) {
    console.log('Update meal error:', error);
    res.status(500).json({ 
      error: 'Failed to update meal',
      details: error.message 
    });
  }
};

/**
 * REMOVE MEAL (Soft Delete)
 * PUT /calorify/meals/meal/:id
 *
 * Sets isRemoved: true on the meal instead of deleting it from the database.
 * This preserves historical data while hiding the meal from normal queries.
 * The pre-find middleware in meal.middleware.js auto-excludes removed meals.
 *
 * After removing:
 *   - Daily progress is recalculated (calories will decrease)
 *   - User's stats.mealsLogged is decremented
 */
exports.removeMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const userID = req.user.uid;

    console.log(`Removing meal ${id} for user ${userID}`);

    // Soft-delete: set isRemoved flag to true (not an actual database delete)
    const removedMeal = await Meal.findOneAndUpdate(
      { _id: id, userID },
      { isRemoved: true },
      { returnDocument: 'after' }
    );

    if (!removedMeal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found or already removed'
      });
    }

    // Recalculate daily progress for the meal's date (total calories will decrease)
    const progress = await progressService.updateDailyProgress(userID, removedMeal.date || new Date());
    
    // Decrement user's lifetime meal count
    await User.findByIdAndUpdate(userID, {
      $inc: { 'stats.mealsLogged': -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Meal is removed successfully',
      data: removedMeal,
      dailyProgress: {
        caloriesConsumed: progress.daily.calories.consumed,
        caloriesGoal: progress.daily.calories.goal,
        caloriesRemaining: Math.max(0, progress.daily.calories.goal - progress.daily.calories.consumed),
        percentage: progress.daily.calories.percentage,
        protein: progress.daily.protein,
        carbs: progress.daily.carbs,
        fat: progress.daily.fat,
        mealsLogged: progress.daily.mealsLogged
      }
    });
  } catch (error) {
    console.log('Remove meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Something Went Wrong',
      details: error.message
    });
  }
};

/**
 * GET USER MEALS (Paginated)
 * GET /calorify/meals?page=1&limit=10
 *
 * Returns the authenticated user's meals sorted by newest first.
 * Automatically excludes soft-deleted meals (isRemoved: true).
 *
 * Query params:
 *   - page:  Page number (default: 1)
 *   - limit: Results per page (default: 10)
 *
 * Response includes pagination metadata:
 *   { page, limit, total, pages }
 */
exports.getUserMeals = async (req, res) => {
  try {
    const userID = req.user.uid;
    const { page = 1, limit = 10 } = req.query;

    console.log(`Fetching meals for user: ${userID}, page: ${page}`);

    // Fetch paginated meals, newest first, excluding soft-deleted
    const meals = await Meal.find({ userID, isRemoved: { $ne: true } })
      .sort({ date: -1 }) // Newest first
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Get total count for pagination calculation
    const total = await Meal.countDocuments({ userID, isRemoved: { $ne: true } });

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

/**
 * GET DAILY SUMMARY
 * GET /calorify/meals/summary/daily?date=2024-03-13
 *
 * Calculates a nutrition summary for all meals on a specific date.
 * If no date query param is provided, defaults to today.
 *
 * Response includes:
 *   - Total calories, protein, carbs, fat for the day
 *   - List of individual meals with type, name, time, and calorie count
 *   - Total meal count for the day
 */
exports.getDailySummary = async (req, res) => {
  try {
    const userID = req.user.uid;
    const { date } = req.query;

    // Use today if no date provided
    const targetDate = date ? new Date(date) : new Date();

    // Build start/end of day range for the query
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Getting daily summary for user ${userID} on ${targetDate.toDateString()}`);

    // Get all non-removed meals for the target date, sorted chronologically
    const meals = await Meal.find({
      userID,
      isRemoved: { $ne: true },
      date: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ date: 1 }); // Earliest meal first

    // Calculate totals by summing each meal's pre-computed total{}
    const summary = {
      date: targetDate.toISOString().split('T')[0], // Format: "2024-03-13"
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: [],
      mealCount: meals.length
    };

    meals.forEach(meal => {
      // Accumulate daily totals from each meal's total field
      summary.totalCalories += meal.total.calories || 0;
      summary.totalProtein += meal.total.protein || 0;
      summary.totalCarbs += meal.total.carbs || 0;
      summary.totalFat += meal.total.fat || 0;
      
      // Add a summary entry for each meal
      summary.meals.push({
        id: meal._id,
        type: meal.mealType,
        name: meal.name,
        time: meal.date,
        calories: meal.total.calories,
        foodCount: meal.foods.length
      });
    });

    // Round macros to 1 decimal place for clean display
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