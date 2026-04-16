const Joi = require('joi');

// Validation schemas
const schemas = {
  // User registration schema
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(32).required(),
    height: Joi.number().min(50).max(300).required(),
    weight: Joi.number().min(20).max(500).required(),
    dailyCalorieGoal: Joi.number().min(500).max(8000).default(2000),
    gender: Joi.string().valid('Male', 'Female').required(),
    age: Joi.number().min(13).max(120).required(),
    activityLevel: Joi.string().valid('Very Active', 'Active', 'Normal Activity', 'Low Activity').required(),
    goal: Joi.string().valid('Lose Weight', 'Maintain Weight', 'Gain Weight').required()
  }),

  // Login schema
  // login: Joi.object({
  //   idToken: Joi.string().required()
  // }),

  Login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),

  // Create meal schema
  createMeal: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    mealType: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snacks', 'pre-workout', 'post-workout').required(),
    foods: Joi.array().items(
      Joi.object({
        foodId: Joi.string().optional(),
        name: Joi.string().when('foodId', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
        quantity: Joi.number().min(0.1).required(),
        unit: Joi.string().valid('gm', 'ml', 'cup', 'piece', 'slice', 'serving', 'tbsp', 'tsp').required(),
        nutrition: Joi.object({
          calories: Joi.number().min(0),
          protein: Joi.number().min(0),
          carbs: Joi.number().min(0),
          fat: Joi.number().min(0)
        }).optional()
      })
    ).min(1).required(),
    notes: Joi.string().max(500).optional()
  }),

  // Update meal schema
  updateMeal: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    mealType: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snacks', 'pre-workout', 'post-workout').optional(),
    notes: Joi.string().max(500).optional()
  }),

  // Chat message schema
  chatMessage: Joi.object({
    question: Joi.string().min(1).max(1000).required()
  }),

  // Log weight schema
  logWeight: Joi.object({
    weight: Joi.number().min(20).max(500).required(),
    unit: Joi.string().valid('kg', 'lbs').default('kg'),
    notes: Joi.string().max(200).optional()
  }),

  // Update profile schema
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    height: Joi.number().min(50).max(300).optional(),
    weight: Joi.number().min(20).max(500).optional(),
    dailyCalorieGoal: Joi.number().min(500).max(8000).optional(),
    gender: Joi.string().valid('Male', 'Female').optional(),
    activityLevel: Joi.string().valid('Very Active', 'Active', 'Normal Activity', 'Low Activity').optional(),
    goal: Joi.string().valid('Lose Weight', 'Maintain Weight', 'Gain Weight').optional()
  })
};

// Validation middleware factory
const validate = (schemaName, property = 'body') => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }

    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just first
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request body with validated value
    req[property] = value;
    next();
  };
};

module.exports = validate;