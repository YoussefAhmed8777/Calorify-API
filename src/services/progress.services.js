const Progress = require("./../models/progress.model");
const Meal = require("./../models/meal.model");
const User = require("./../models/user.model");

class ProgressService {
  // UPDATE DAILY PROGRESS
  // Called after each meal is logged
  async updateDailyProgress(userID, date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all meals for this day
      const meals = await Meal.find({
        userID,
        isRemoved: { $ne: true },
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      // Get user's daily goal
      const user = await User.findById(userID);
      const calorieGoal = user?.dailyCalorieGoal || 2000;

      // Calculate totals
      const totalCalories = meals.reduce(
        (sum, meal) => sum + (meal.total?.calories || 0),
        0,
      );

      const totalProtein = meals.reduce(
        (sum, meal) => sum + (meal.total?.protein || 0),
        0,
      );

      const totalCarbs = meals.reduce(
        (sum, meal) => sum + (meal.total?.carbs || 0),
        0,
      );

      const totalFat = meals.reduce(
        (sum, meal) => sum + (meal.total?.fat || 0),
        0,
      );

      // Find or create progress record
      let progress = await Progress.findOne({
        userID,
        date: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      });

      if (!progress) {
        progress = new Progress({ userID, date: startOfDay });
      }

      // Update daily stats
      progress.daily = {
        calories: {
          consumed: totalCalories,
          goal: calorieGoal,
          percentage: Math.min(
            100,
            Math.round((totalCalories / calorieGoal) * 100),
          ),
        },
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        mealsLogged: meals.length,
        completed: totalCalories >= calorieGoal,
      };

      // Update streak
      await this._updateStreak(userID, meals.length > 0);

      await progress.save();
      return progress;
    } catch (error) {
      console.log("Error updating daily progress:", error);
      throw error;
    }
  }

  // UPDATE STREAK (PRIVATE)
  async _updateStreak(userID, loggedToday) {
    try {
      const user = await User.findById(userID);
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get yesterday's progress
      const yesterdayProgress = await Progress.findOne({
        userID,
        date: yesterday,
      });

      let currentStreak = 0;

      if (loggedToday) {
        // If logged yesterday, increment streak
        if (yesterdayProgress && yesterdayProgress.daily.mealsLogged > 0) {
          currentStreak = (user.stats?.currentStreak || 0) + 1;
        } else {
          // First day of new streak
          currentStreak = 1;
        }
      } else {
        // Didn't log today, streak broken
        currentStreak = 0;
      }

      // Update user stats
      user.stats.currentStreak = currentStreak;
      if (currentStreak > (user.stats.longestStreak || 0)) {
        user.stats.longestStreak = currentStreak;
      }

      await user.save();
    } catch (error) {
      console.log("Error updating streak:", error);
    }
  }

  // LOG WEIGHT
  async logWeight(userID, weight, unit = "kg", notes = "") {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let progress = await Progress.findOne({
        userID,
        date: today,
      });

      if (!progress) {
        progress = new Progress({
          userID,
          date: today,
        });
      }

      progress.weight = { value: weight, unit, notes };
      await progress.save();

      // Check for weight loss achievements
      await this._checkWeightAchievements(userID);

      return progress;
    } catch (error) {
      console.log("Error logging weight:", error);
      throw error;
    }
  }

  // GET WEEKLY SUMMARY
  async getWeeklySummary(userID) {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const progress = await Progress.find({
        userID,
        date: { $gte: sevenDaysAgo, $lte: today },
      }).sort({ date: 1 });

      const summary = {
        days: [],
        totalCalories: 0,
        averageCalories: 0,
        mealsLogged: 0,
        activeDays: 0,
        streak: { current: 0, longest: 0 },
      };

      progress.forEach((day) => {
        summary.days.push({
          date: day.date,
          calories: day.daily.calories.consumed,
          meals: day.daily.mealsLogged,
          completed: day.daily.completed,
        });

        summary.totalCalories += day.daily.calories.consumed;
        summary.mealsLogged += day.daily.mealsLogged;
        if (day.daily.mealsLogged > 0) summary.activeDays++;
      });

      summary.averageCalories = Math.round(
        summary.totalCalories / (progress.length || 1),
      );

      // Get current streak from user
      const user = await User.findById(userID);
      summary.streak.current = user?.stats?.currentStreak || 0;
      summary.streak.longest = user?.stats?.longestStreak || 0;

      return summary;
    } catch (error) {
      console.log("Error getting weekly summary:", error);
      throw error;
    }
  }

  // GET MONTHLY SUMMARY (PREMIUM)
  async getMonthlySummary(userID) {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const progress = await Progress.find({
        userID,
        date: { $gte: thirtyDaysAgo, $lte: today },
      }).sort({ date: 1 });

      const caloriesByDay = {};
      const weightByDay = {};

      progress.forEach((day) => {
        const dateStr = day.date.toISOString().split("T")[0];
        caloriesByDay[dateStr] = day.daily.calories.consumed;
        if (day.weight?.value) {
          weightByDay[dateStr] = day.weight.value;
        }
      });

      return {
        calories: caloriesByDay,
        weight: weightByDay,
        consistency: Math.round(
          (progress.filter((d) => d.daily.mealsLogged > 0).length / 30) * 100,
        ),
        totalMeals: progress.reduce((sum, d) => sum + d.daily.mealsLogged, 0),
      };
    } catch (error) {
      console.log("Error getting monthly summary:", error);
      throw error;
    }
  }

  // CHECK ACHIEVEMENTS
  async checkAchievements(userID) {
    // This would be called periodically
    // We'll implement this in the controller
    return [];
  }

  // WEIGHT ACHIEVEMENTS (PRIVATE)
  async _checkWeightAchievements(userID) {
    // Will be implemented with the achievements system
    return true;
  }
}

module.exports = new ProgressService();
