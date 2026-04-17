const geminiService = require('./../services/gemini.services');
const Meal = require('./../models/meal.model');
const User = require('./../models/user.model');

// Store chat history in memory (for demo)
// In production, use MongoDB
const chatHistories = new Map();

// SIMPLE CHAT 
// POST /calorify/chat/message
exports.sendMessage = async (req, res) => {
  try {
    // const userID = req.user.uid;
    const { message } = req.body;

    if (!message || message.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Message must be at least 2 characters' 
      });
    }

    console.log(`Chat from user "${message}"`);
    // console.log(`Chat from user ${userID}: "${message}"`);

    // Get user's chat history
    // let history = chatHistories.get(userID) || [];

    // Get response from Gemini
    const result = await geminiService.chat(message);
    // const result = await geminiService.chat(message, history);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Update history (keep last 10 messages)
    // history.push(
    //   { role: 'user', content: message },
    //   { role: 'model', content: result.response }
    // );
    
    // if (history.length > 20) {
    //   history = history.slice(-20);
    // }
    // chatHistories.set(userID, history);

    res.status(200).json({
      success: true,
      message: 'Gemini responded successfully',
      response: result.response,
      timestamp: result.timestamp
    });

  } catch (error) {
    console.log('Chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
};

// NUTRITION CHAT
// POST /calorify/chat/nutrition
exports.askNutrition = async (req, res) => {
  try {
    const userID = req.user.uid;
    const { question } = req.body;

    // Get user profile for context
    const user = await User.findById(userID).select('-refreshToken');
    
    const context = {
      dailyGoal: user?.dailyCalorieGoal || 2000,
      height: user?.height,
      weight: user?.weight,
      goal: user?.goal
    };

    if (!question || question.trim().length < 2) {
      return res.status(400).json({ error: 'Question must be at least 2 characters' });
    }

    // const response = await geminiService.askNutrition(question);
    const response = await geminiService.askNutrition(question, context);

    res.status(200).json({
      success: true,
      message: 'Gemini responded successfully',
      response,
      timestamp: new Date()
    });

  } catch (error) {
    console.log('Nutrition chat error:', error);
    res.status(500).json({ error: 'Failed to get nutrition advice' });
  }
};

// MEAL EXTRACTION (TEXT TO LOG)
// POST /calorify/chat/extract-meal
exports.extractMeal = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length < 2) {
      return res.status(400).json({ error: 'Message must be at least 2 characters' });
    }

    const mealData = await geminiService.extractMealFromText(message);

    res.status(200).json({
      success: true,
      message: 'Gemini extracted meal successfully',
      data: mealData
    });

  } catch (error) {
    console.log('Meal extraction error:', error);
    res.status(500).json({ error: 'Failed to extract meal' });
  }
};

// CONFIRM AND SAVE MEAL
// POST /calorify/chat/save-meal
exports.saveMealFromChat = async (req, res) => {
  try {
    const userID = req.user.uid;
    const { mealData } = req.body;

    // Create meal from extracted data
    const meal = await Meal.create({
      userID,
      name: `Chat: ${mealData.foods?.map(f => f.name).join(', ') || 'Meal'}`,
      mealType: mealData.mealType || 'snack',
      foods: mealData.foods?.map(f => ({
        customName: f.name,
        quantity: {
          value: f.quantity || 1,
          unit: f.unit || 'serving'
        },
        nutrition: {
          calories: f.calories || 0
        }
      })) || [],
      source: 'chat',
      notes: `Created via chat. Confidence: ${mealData.confidence}`
    });

    res.status(201).json({
      success: true,
      message: 'Meal saved from chat',
      data: meal
    });

  } catch (error) {
    console.log('Save chat meal error:', error);
    res.status(500).json({ error: 'Failed to save meal' });
  }
};

// GET CHAT HISTORY 
// GET /calorify/chat/history
exports.getHistory = async (req, res) => {
  try {
    const userID = req.user.uid;
    const history = chatHistories.get(userID) || [];
    
    res.status(200).json({
      success: true,
      message: 'Chat history restored successfully',
      data: history
    });

  } catch (error) {
    console.log('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
};

// CLEAR HISTORY 
// DELETE /calorify/chat/history
exports.clearHistory = async (req, res) => {
  try {
    const userID = req.user.uid;
    chatHistories.delete(userID);
    
    res.status(200).json({
      success: true,
      message: 'Chat history cleared'
    });

  } catch (error) {
    console.log('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};