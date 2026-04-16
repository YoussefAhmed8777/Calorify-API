/**
 * Nutrition Service
 * -----------------
 * Calculates recommended daily macronutrient targets (protein, carbs, fat)
 * based on a user's calorie goal and fitness objective.
 *
 * Calorie-to-gram conversion factors:
 *   - Protein: 4 calories per gram
 *   - Carbs:   4 calories per gram
 *   - Fat:     9 calories per gram
 *
 * Used by: progress.controller.js → getTodayProgress() to return macro targets in the daily dashboard
 */
class NutritionService {

  /**
   * Calculate macro targets using a balanced 25/50/25 split.
   * Returns a detailed breakdown with both grams and percentages.
   *
   * @param {number} calorieGoal - The user's daily calorie target (e.g. 2000)
   * @returns {{ calories: number, protein: { grams: number, percentage: number },
   *             carbs: { grams: number, percentage: number },
   *             fat: { grams: number, percentage: number } }}
   *
   * Example: calorieGoal = 2000
   *   protein → 2000 * 0.25 / 4 = 125g
   *   carbs   → 2000 * 0.50 / 4 = 250g
   *   fat     → 2000 * 0.25 / 9 ≈  56g
   */
  calculateMacrosFromCalories(calorieGoal) {
    return {
      calories: calorieGoal,
      protein: {
        grams: Math.round((calorieGoal * 0.25) / 4), // 4 calories per gram of protein
        percentage: 25
      },
      carbs: {
        grams: Math.round((calorieGoal * 0.50) / 4), // 4 calories per gram of carbs
        percentage: 50
      },
      fat: {
        grams: Math.round((calorieGoal * 0.25) / 9), // 9 calories per gram of fat
        percentage: 25
      }
    };
  }

  /**
   * Calculate macro targets adjusted for a specific fitness goal.
   *
   * Goal-specific macro ratios (protein / carbs / fat):
   *   - Lose Weight:     30 / 40 / 30  → Higher protein for satiety
   *   - Maintain Weight: 25 / 50 / 25  → Balanced distribution
   *   - Gain Weight:     25 / 55 / 20  → Higher carbs for energy
   *
   * Falls back to "Maintain Weight" ratios if the goal string is unrecognized.
   *
   * @param {number} calorieGoal - The user's daily calorie target (e.g. 2000)
   * @param {string} goal        - One of: 'Lose Weight', 'Maintain Weight', 'Gain Weight'
   *                                (must match the User model's `goal` enum values)
   * @returns {{ calories: number, protein: number, carbs: number, fat: number }}
   *          Macros in grams, rounded to the nearest whole number.
   *
   * Example: calorieGoal = 2000, goal = 'Lose Weight'
   *   protein → 2000 * 0.30 / 4 = 150g
   *   carbs   → 2000 * 0.40 / 4 = 200g
   *   fat     → 2000 * 0.30 / 9 ≈  67g
   */
  getMacrosForGoal(calorieGoal, goal) {
    // Macro percentage splits per goal — values must add up to 100
    const ratios = {
      'Lose Weight':     { protein: 30, carbs: 40, fat: 30 },
      'Maintain Weight': { protein: 25, carbs: 50, fat: 25 },
      'Gain Weight':     { protein: 25, carbs: 55, fat: 20 }
    };

    // Default to "Maintain Weight" if goal string doesn't match any key
    const selected = ratios[goal] || ratios['Maintain Weight'];

    return {
      calories: calorieGoal,
      protein: Math.round((calorieGoal * selected.protein / 100) / 4), // 4 cal/g
      carbs:   Math.round((calorieGoal * selected.carbs   / 100) / 4), // 4 cal/g
      fat:     Math.round((calorieGoal * selected.fat     / 100) / 9)  // 9 cal/g
    };
  }
}

module.exports = new NutritionService();