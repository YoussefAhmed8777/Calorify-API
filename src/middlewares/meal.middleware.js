// All middleware functions for Meal model
// ===========================================

// ========== PRE-SAVE MIDDLEWARE ==========
// Runs AUTOMATICALLY before every .save()
const calculateTotals = function(next) {
  // 'this' = the meal document being saved
  console.log('Calculating totals for meal:', this.name);
  
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  
  // Loop through each food in the meal
  this.food.forEach((item, index) => {
    if (item.nutrition) {
      totalCalories += item.nutrition.calories || 0;
      totalProtein += item.nutrition.protein || 0;
      totalCarbs += item.nutrition.carbs || 0;
      totalFat += item.nutrition.fat || 0;
      
      console.log(`  Food ${index + 1}: +${item.nutrition.calories} cal`);
    }
  });
  
  // Set the totals
  this.total = {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10
  };
  
  console.log(`Total: ${this.total.calories} calories`);
  
  // MUST call next() to continue saving
  next();
};

// ========== PRE-VALIDATE MIDDLEWARE ==========
// Runs before validation checks
const ensureName = function(next) {
  // If no name provided, create one from meal type
  if (!this.name && this.mealType) {
    const date = new Date(this.date);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.name = `${this.mealType} at ${timeStr}`;
    console.log('Generated meal name:', this.name);
  }
  next();
};

// ========== POST-SAVE MIDDLEWARE ==========
// Runs AFTER document is saved
const afterSave = function(doc, next) {
  console.log(`Meal saved successfully! ID: ${doc._id}`);
  // Could trigger notifications, update user stats, etc.
  next();
};

// ========== PRE-FIND MIDDLEWARE ==========
// Runs before ANY find operation
const filterRemoved = function(next) {
  // Automatically exclude removed meals unless specifically asked
  if (!this.getQuery().includeRemoved) {
    this.where({ isRemoved: { $ne: true } });
  }
  next();
};

// Export all middleware functions
module.exports = {
  calculateTotals,
  ensureName,
  afterSave,
  filterRemoved
};