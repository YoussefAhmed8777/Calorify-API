const Progress = require('./../models/progress.model');
const Achievement = require('./../models/achievement.model');
const progressService = require('./../services/progress.services');
const { achievements } = require('./../utilities/achievement');

// GET TODAY'S PROGRESS
// GET /calorify/progress/today
exports.getTodayProgress = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let progress = await Progress.findOne({
      userId,
      date: today
    });

    if (!progress) {
      // Create empty progress for today
      progress = await progressService.updateDailyProgress(userId);
    }

    res.status(200).json({
      success: true,
      data: {
        calories: progress.daily.calories,
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

// GET WEEKLY SUMMARY
// GET /calorify/progress/weekly
exports.getWeeklySummary = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const summary = await progressService.getWeeklySummary(userId);

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.log('Weekly summary error:', error);
    res.status(500).json({ error: 'Failed to get weekly summary' });
  }
};

// GET MONTHLY SUMMARY (PREMIUM)
// GET /calorify/progress/monthly
exports.getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await User.findById(userId);

    // Check if premium
    if (user.subscription?.plan !== 'premium') {
      return res.status(403).json({ 
        error: 'Premium subscription required for monthly analytics' 
      });
    }

    const summary = await progressService.getMonthlySummary(userId);

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.log('Monthly summary error:', error);
    res.status(500).json({ error: 'Failed to get monthly summary' });
  }
};

// LOG WEIGHT
// POST /calorify/progress/weight
exports.logWeight = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { weight, unit, notes } = req.body;

    if (!weight || weight < 20 || weight > 300) {
      return res.status(400).json({ 
        error: 'Please enter a valid weight (20-300)' 
      });
    }

    const progress = await progressService.logWeight(
      userId, 
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

// GET WEIGHT HISTORY
// GET /calorify/progress/weight-history
exports.getWeightHistory = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 30 } = req.query;

    const history = await Progress.find({
      userId,
      'weight.value': { $exists: true }
    })
    .sort({ date: -1 })
    .limit(parseInt(limit))
    .select('date weight');

    res.status(200).json({
      success: true,
      data: history
    });

  } catch (error) {
    console.log('Weight history error:', error);
    res.status(500).json({ error: 'Failed to get weight history' });
  }
};

// GET STREAK INFO
// GET /calorify/progress/streak
exports.getStreak = async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await User.findById(userId).select('stats');

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

// GET ACHIEVEMENTS
// GET /calorify/progress/achievements
exports.getAchievements = async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await User.findById(userId);

    // Get earned achievements
    const earned = await Achievement.find({ userId });

    // Get available badges based on user tier
    const allBadges = Object.values(achievements);
    const available = allBadges.filter(badge => 
      badge.tier === 'free' || 
      (badge.tier === 'premium' && user.subscription?.plan === 'premium')
    );

    // Mark which ones are earned
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
        percentage: Math.round((earned.length / available.length) * 100)
      }
    });

  } catch (error) {
    console.log('Achievements error:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
};

// FORCE CHECK ACHIEVEMENTS (Admin/Test)
// POST /calorify/progress/check-achievements
exports.checkAchievements = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user stats
    const user = await User.findById(userId);
    const progress = await Progress.find({ userId });
    
    // Calculate stats for achievement checks
    const stats = {
      currentStreak: user.stats.currentStreak,
      totalMeals: user.stats.mealsLogged,
      weightLost: 0, // Would need starting weight
      perfectWeekCount: 0, // Would need to calculate
      perfectMonthCount: 0,
      goalAchieved: false
    };

    // Check each achievement
    const earned = [];
    for (const [id, badge] of Object.entries(achievements)) {
      if (badge.check(stats)) {
        // Check if already earned
        const existing = await Achievement.findOne({ userId, badgeId: id });
        if (!existing) {
          const newBadge = await Achievement.create({
            userId,
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