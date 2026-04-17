const notificationService = require('./../services/notification.services');
const User = require('./../models/user.model');

// REGISTER DEVICE TOKEN
// POST /calorify/notifications/register
exports.registerToken = async (req, res) => {
  try {
    const userID = req.user.uid;
    const { deviceToken, platform } = req.body;

    // Store token in user document
    await User.findByIdAndUpdate(userID, {
      $push: {
        deviceTokens: {
          token: deviceToken,
          platform,
          registeredAt: new Date()
        }
      }
    });

    // Subscribe to general topic
    await notificationService.subscribeToTopic([deviceToken], 'all_users');

    res.json({
      success: true,
      message: 'Device registered for notifications'
    });

  } catch (error) {
    console.log('Token registration error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
};

// REMOVE DEVICE TOKEN
// POST /calorify/notifications/unregister
exports.unregisterToken = async (req, res) => {
  try {
    const userID = req.user.uid;
    const { deviceToken } = req.body;

    await User.findByIdAndUpdate(userID, {
      $pull: {
        deviceTokens: { token: deviceToken }
      }
    });

    res.json({
      success: true,
      message: 'Device unregistered'
    });

  } catch (error) {
    console.log('Token removal error:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
};

// SEND TEST NOTIFICATION
// POST /calorify/notifications/test
exports.sendTestNotification = async (req, res) => {
  try {
    const userID = req.user.uid;
    const user = await User.findById(userID);

    if (!user.deviceTokens || user.deviceTokens.length === 0) {
      return res.status(400).json({ 
        error: 'No registered devices found' 
      });
    }

    const tokens = user.deviceTokens.map(dt => dt.token);
    
    const result = await notificationService.sendToMultipleDevices(tokens, {
      title: 'Test Notification',
      body: 'This is a test from Calorify!',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      result
    });

  } catch (error) {
    console.log('Test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};

// SEND MEAL REMINDER
// This would be called by a cron job
exports.sendMealReminders = async () => {
  try {
    // Get all users who haven't logged meals today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const users = await User.aggregate([
      {
        $lookup: {
          from: 'meals',
          let: { userID: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userID', '$$userID'] },
                    { $gte: ['$date', today] }
                  ]
                }
              }
            }
          ],
          as: 'todayMeals'
        }
      },
      {
        $match: {
          'deviceTokens.0': { $exists: true },
          'todayMeals': { $size: 0 }
        }
      }
    ]);

    for (const user of users) {
      const tokens = user.deviceTokens.map(dt => dt.token);
      
      await notificationService.sendToMultipleDevices(tokens, {
        title: 'Time to log your meal!',
        body: 'You haven\'t logged any meals today. What did you eat?',
        data: {
          type: 'reminder',
          screen: 'meals'
        }
      });
    }

    console.log(`Sent reminders to ${users.length} users`);

  } catch (error) {
    console.log('Meal reminder error:', error);
  }
};

// SEND GOAL ACHIEVEMENT
exports.sendGoalAchieved = async (userID, goalType) => {
  try {
    const user = await User.findById(userID);
    
    if (!user.deviceTokens || user.deviceTokens.length === 0) {
      return;
    }

    const tokens = user.deviceTokens.map(dt => dt.token);
    
    const messages = {
      streak: {
        title: '🔥 Streak Achievement!',
        body: `You've logged meals for ${user.stats.currentStreak} days in a row!`
      },
      weight: {
        title: '🎉 Goal Achieved!',
        body: 'Congratulations on reaching your weight goal!'
      },
      meals: {
        title: '📊 Milestone Reached',
        body: `You've logged ${user.stats.mealsLogged} meals so far!`
      }
    };

    const notification = messages[goalType];
    if (!notification) {
      console.log(`Unknown goal type: ${goalType}`);
      return;
    }

    await notificationService.sendToMultipleDevices(tokens, {
      title: notification.title,
      body: notification.body,
      data: {
        type: 'achievement',
        goalType
      }
    });

  } catch (error) {
    console.log('Goal achievement notification error:', error);
  }
};