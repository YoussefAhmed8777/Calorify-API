/**
 * Progress Controller
 * --------------------
 * Tracks the user's daily/weekly/monthly nutrition progress, weight history,
 * streaks, and achievements.
 *
 * Data flow:
 *   - meal.controller & scan.controller call progressService.updateDailyProgress()
 *     after every meal create/update/remove
 *   - This controller reads that stored progress data and returns it to the client
 *
 * Dependencies:
 *   - Progress model:      Stores daily snapshots (calories, macros, meals logged, weight)
 *   - Achievement model:    Stores earned badges/achievements
 *   - User model:           Reads calorie goal, fitness goal, and streak stats
 *   - progressService:      Business logic for updating progress and streaks
 *   - nutritionService:     Calculates recommended macro targets based on user's goal
 *   - achievements utility: Defines all available badges and their unlock conditions
 */
const Progress = require('./../models/progress.model');
const Achievement = require('./../models/achievement.model');
const User = require('./../models/user.model');
const progressService = require('./../services/progress.services');
const nutritionService = require('./../services/nutrition.services');
const { achievements } = require('./../utilities/achievement');

/**
 * GET TODAY'S PROGRESS
 * GET /calorify/progress/today
 *
 * Returns the authenticated user's progress for today including:
 *   - Calorie consumption vs. goal (with percentage)
 *   - Consumed macros (protein, carbs, fat in grams)
 *   - Recommended macro targets (calculated from user's calorie goal + fitness goal)
 *   - Number of meals logged today
 *   - Whether the daily calorie goal was reached
 *   - Current streak info
 *
 * If no progress record exists for today, one is created automatically.
 */
exports.getTodayProgress = async (req, res) => {
  try {
    const userID = req.user.uid;
    
    // Get the start of today (midnight) for date comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Look for an existing progress record for today
    let progress = await Progress.findOne({
      userID,
      date: today
    });

    if (!progress) {
      // No progress yet today — create an empty one (will show 0 calories consumed)
      progress = await progressService.updateDailyProgress(userID);
    }

    // Get the user's calorie goal and fitness goal to calculate macro targets
    const user = await User.findById(userID).select('dailyCalorieGoal goal');
    const calorieGoal = user?.dailyCalorieGoal || 2000;
    const fitnessGoal = user?.goal || 'Maintain Weight';

    // Calculate recommended daily macro targets based on the user's goal
    // Uses the NutritionService to split calories into protein/carbs/fat grams
    // Returns { calories, protein, carbs, fat } in grams
    const macroTargets = nutritionService.getMacrosForGoal(calorieGoal, fitnessGoal);

    res.status(200).json({
      success: true,
      data: {
        calories: {
          ...progress.daily.calories,
          remaining: Math.max(0, calorieGoal - progress.daily.calories.consumed)
        },
        // Consumed macros (what the user ate today)
        protein: {
          consumed: progress.daily.protein,
          target: macroTargets.protein,
          remaining: Math.max(0, macroTargets.protein - progress.daily.protein)
        },
        carbs: {
          consumed: progress.daily.carbs,
          target: macroTargets.carbs,
          remaining: Math.max(0, macroTargets.carbs - progress.daily.carbs)
        },
        fat: {
          consumed: progress.daily.fat,
          target: macroTargets.fat,
          remaining: Math.max(0, macroTargets.fat - progress.daily.fat)
        },
        // Recommended macro targets (raw targets)
        macroTargets,
        mealsLogged: progress.daily.mealsLogged,
        completed: progress.daily.completed,
        streak: progress.streak
      }
    });

  } catch (error) {
    console.log('Get today progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
};

/**
 * GET WEEKLY SUMMARY
 * GET /calorify/progress/weekly
 *
 * Returns the last 7 days of progress data including:
 *   - Daily calorie breakdown, meals count, and completion status
 *   - Total and average calories for the week
 *   - Number of active days (days with at least 1 meal)
 *   - Current and longest streak
 */
exports.getWeeklySummary = async (req, res) => {
  try {
    const userID = req.user.uid;
    
    const summary = await progressService.getWeeklySummary(userID);

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.log('Weekly summary error:', error);
    res.status(500).json({ error: 'Failed to get weekly summary' });
  }
};

/**
 * GET MONTHLY SUMMARY (Premium Only)
 * GET /calorify/progress/monthly
 *
 * Returns the last 30 days of progress data including:
 *   - Daily calorie map (date → calories)
 *   - Weight history map (date → weight) for days with logged weight
 *   - Consistency percentage (active days / 30 × 100)
 *   - Total meals logged across the month
 *
 * Returns 403 if the user does not have a premium subscription.
 */
exports.getMonthlySummary = async (req, res) => {
  try {
    const userID = req.user.uid;
    const user = await User.findById(userID);

    // Check if premium subscription is active
    if (user.subscription?.plan !== 'premium') {
      return res.status(403).json({ 
        error: 'Premium subscription required for monthly analytics' 
      });
    }

    const summary = await progressService.getMonthlySummary(userID);

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.log('Monthly summary error:', error);
    res.status(500).json({ error: 'Failed to get monthly summary' });
  }
};

/**
 * LOG WEIGHT
 * POST /calorify/progress/weight
 *
 * Records the user's weight for today. If a progress record already exists
 * for today, it updates the weight field. Otherwise creates a new record.
 *
 * Body:
 *   {
 *     weight: 75.5,        // Required — must be between 20 and 300
 *     unit:   'kg',        // Optional — defaults to 'kg'
 *     notes:  'After gym'  // Optional
 *   }
 *
 * Also triggers weight-related achievement checks.
 */
exports.logWeight = async (req, res) => {
  try {
    const userID = req.user.uid;
    const { weight, unit, notes } = req.body;

    // Validate weight range
    if (!weight || weight < 20 || weight > 300) {
      return res.status(400).json({ 
        error: 'Please enter a valid weight (20-300)' 
      });
    }

    const progress = await progressService.logWeight(
      userID, 
      weight, 
      unit || 'kg', 
      notes
    );

    res.status(200).json({
      success: true,
      message: 'Weight logged successfully',
      data: progress.weight
    });

  } catch (error) {
    console.log('Log weight error:', error);
    res.status(500).json({ error: 'Failed to log weight' });
  }
};

/**
 * GET WEIGHT HISTORY
 * GET /calorify/progress/weight-history?limit=30
 *
 * Returns the user's weight history sorted by most recent first.
 * Only returns progress records that have a weight value logged.
 *
 * Query params:
 *   - limit: Max number of entries (default: 30)
 */
exports.getWeightHistory = async (req, res) => {
  try {
    const userID = req.user.uid;
    const { limit = 30 } = req.query;

    // Only fetch records that have a weight entry (not all progress records have one)
    const history = await Progress.find({
      userID,
      'weight.value': { $exists: true }
    })
    .sort({ date: -1 })       // Most recent first
    .limit(parseInt(limit))
    .select('date weight');    // Only return date and weight fields

    res.status(200).json({
      success: true,
      data: history
    });

  } catch (error) {
    console.log('Weight history error:', error);
    res.status(500).json({ error: 'Failed to get weight history' });
  }
};

/**
 * GET STREAK INFO
 * GET /calorify/progress/streak
 *
 * Returns the user's current and longest logging streaks.
 * Streaks are updated by progressService._updateStreak() every time a meal is logged.
 */
exports.getStreak = async (req, res) => {
  try {
    const userID = req.user.uid;
    const user = await User.findById(userID).select('stats');

    res.status(200).json({
      success: true,
      data: {
        current: user?.stats?.currentStreak || 0,
        longest: user?.stats?.longestStreak || 0,
        lastActive: user?.stats?.lastActive
      }
    });

  } catch (error) {
    console.log('Streak error:', error);
    res.status(500).json({ error: 'Failed to get streak' });
  }
};

/**
 * GET ACHIEVEMENTS
 * GET /calorify/progress/achievements
 *
 * Returns all available achievement badges with their earned status.
 * Premium badges are only shown to users with a premium subscription.
 *
 * Response includes:
 *   - Full list of badges (with earned: true/false and earnedDate)
 *   - Summary: earned count, total available, percentage complete
 */
exports.getAchievements = async (req, res) => {
  try {
    const userID = req.user.uid;
    const user = await User.findById(userID);

    // Get all achievements this user has earned
    const earned = await Achievement.find({ userID });

    // Filter available badges based on user subscription tier
    const allBadges = Object.values(achievements);
    const available = allBadges.filter(badge => 
      badge.tier === 'free' || 
      (badge.tier === 'premium' && user.subscription?.plan === 'premium')
    );

    // Merge earned status into the available badges list
    const earnedIds = new Set(earned.map(e => e.badgeId));
    const achievementsList = available.map(badge => ({
      ...badge,
      earned: earnedIds.has(badge.id),
      earnedDate: earned.find(e => e.badgeId === badge.id)?.earnedDate
    }));

    res.status(200).json({
      success: true,
      data: achievementsList,
      summary: {
        earned: earned.length,
        total: available.length,
        percentage: available.length > 0 ? Math.round((earned.length / available.length) * 100) : 0
      }
    });

  } catch (error) {
    console.log('Achievements error:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
};

/**
 * FORCE CHECK ACHIEVEMENTS (Admin/Test)
 * POST /calorify/progress/check-achievements
 *
 * Manually triggers achievement checks for the authenticated user.
 * Compares the user's current stats against each badge's unlock condition.
 * Creates Achievement documents for any newly earned badges.
 *
 * This is meant for testing — in production, achievements would be
 * checked automatically after key events (meal logged, streak milestone, etc.)
 */
exports.checkAchievements = async (req, res) => {
  try {
    const userID = req.user.uid;
    
    // Get current user stats and all progress records
    const user = await User.findById(userID);
    const progress = await Progress.find({ userID });
    
    // Build a stats object for achievement condition checks
    const stats = {
      currentStreak: user.stats.currentStreak,
      totalMeals: user.stats.mealsLogged,
      weightLost: 0,           // TODO: Calculate from first weight log vs latest
      perfectWeekCount: 0,     // TODO: Count weeks where all 7 days had meals
      perfectMonthCount: 0,    // TODO: Count months where all days had meals
      goalAchieved: false      // TODO: Check if user reached their fitness goal
    };

    // Check each defined achievement against the user's stats
    const earned = [];
    for (const [id, badge] of Object.entries(achievements)) {
      if (badge.check(stats)) {
        // Only award if not already earned (prevents duplicates)
        const existing = await Achievement.findOne({ userID, badgeId: id });
        if (!existing) {
          const newBadge = await Achievement.create({
            userID,
            badgeId: id,
            badgeName: badge.name,
            badgeIcon: badge.icon,
            description: badge.description,
            earnedDate: new Date()
          });
          earned.push(newBadge);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Earned ${earned.length} new badges`,
      data: earned
    });

  } catch (error) {
    console.log('Check achievements error:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
};