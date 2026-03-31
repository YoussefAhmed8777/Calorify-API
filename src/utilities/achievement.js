const achievements = {
  // STREAK BADGES
  streak_3: {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Log meals for 3 days in a row',
    icon: '🔥',
    tier: 'free',
    check: (stats) => stats.currentStreak >= 3
  },
  
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Log meals for 7 days in a row',
    icon: '⚡',
    tier: 'free',
    check: (stats) => stats.currentStreak >= 7
  },
  
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Log meals for 30 days in a row',
    icon: '🌙',
    tier: 'premium',
    check: (stats) => stats.currentStreak >= 30
  },
  
  // MEAL COUNT BADGES
  meals_10: {
    id: 'meals_10',
    name: 'Getting Started',
    description: 'Log 10 meals total',
    icon: '📝',
    tier: 'free',
    check: (stats) => stats.totalMeals >= 10
  },
  
  meals_100: {
    id: 'meals_100',
    name: 'Century Logger',
    description: 'Log 100 meals total',
    icon: '📚',
    tier: 'free',
    check: (stats) => stats.totalMeals >= 100
  },
  
  meals_500: {
    id: 'meals_500',
    name: 'Half Thousand',
    description: 'Log 500 meals total',
    icon: '📖',
    tier: 'premium',
    check: (stats) => stats.totalMeals >= 500
  },
  
  // WEIGHT BADGES
  weight_1: {
    id: 'weight_1',
    name: 'First Kilo',
    description: 'Lose 1kg from starting weight',
    icon: '🎯',
    tier: 'free',
    check: (stats) => stats.weightLost >= 1
  },
  
  weight_5: {
    id: 'weight_5',
    name: '5kg Club',
    description: 'Lose 5kg from starting weight',
    icon: '🏅',
    tier: 'premium',
    check: (stats) => stats.weightLost >= 5
  },
  
  weight_10: {
    id: 'weight_10',
    name: 'Double Digits',
    description: 'Lose 10kg from starting weight',
    icon: '🎖️',
    tier: 'premium',
    check: (stats) => stats.weightLost >= 10
  },
  
  // CONSISTENCY BADGES
  perfect_week: {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Log meals every day for a week',
    icon: '✨',
    tier: 'free',
    check: (stats) => stats.perfectWeekCount >= 1
  },
  
  perfect_month: {
    id: 'perfect_month',
    name: 'Perfect Month',
    description: 'Log meals every day for a month',
    icon: '🌟',
    tier: 'premium',
    check: (stats) => stats.perfectMonthCount >= 1
  },
  
  // GOAL BADGES
  goal_achieved: {
    id: 'goal_achieved',
    name: 'Goal Crusher',
    description: 'Reach your target weight',
    icon: '🏆',
    tier: 'free',
    check: (stats) => stats.goalAchieved === true
  }
};

// Group by tier for easy filtering
const getBadgesByTier = (tier) => {
  return Object.values(achievements).filter(b => b.tier === tier);
};

module.exports = {
  achievements,
  getBadgesByTier
};