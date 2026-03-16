/**
 * Parse FatSecret's food description to extract nutrition
 * Example: "Per 100g - Calories: 52kcal | Fat: 0.17g | Carbs: 13.81g | Protein: 0.26g"
 */
const parseFoodDescription = (description) => {
  const nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  };

  if (!description) return nutrition;

  // Extract calories (look for "Calories: 52kcal")
  const caloriesMatch = description.match(/Calories:\s*(\d+(?:\.\d+)?)/i);
  if (caloriesMatch) nutrition.calories = parseFloat(caloriesMatch[1]);

  // Extract protein
  const proteinMatch = description.match(/Protein:\s*(\d+(?:\.\d+)?)/i);
  if (proteinMatch) nutrition.protein = parseFloat(proteinMatch[1]);

  // Extract carbs
  const carbsMatch = description.match(/Carbs:\s*(\d+(?:\.\d+)?)/i);
  if (carbsMatch) nutrition.carbs = parseFloat(carbsMatch[1]);

  // Extract fat
  const fatMatch = description.match(/Fat:\s*(\d+(?:\.\d+)?)/i);
  if (fatMatch) nutrition.fat = parseFloat(fatMatch[1]);

  return nutrition;
};

/**
 * Format food data for client response
 */
const formatFoodForClient = (food) => {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand || null,
    nutrition: food.nutrition || parseFoodDescription(food.description),
    servingSizes: food.servings?.map(s => ({
      description: s.description,
      calories: s.calories,
      protein: s.protein,
      carbs: s.carbs,
      fat: s.fat
    })) || []
  };
};

module.exports = {
  parseFoodDescription,
  formatFoodForClient
};