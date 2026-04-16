const mongoose = require('mongoose');
const mealMiddleware = require('./../middlewares/meal.middleware');

const mealSchema = new mongoose.Schema({
  userID:{
    type: String,
    ref: 'User',
    required: [true, 'User Id is required'], //Error Msg if missing
    index: true
  },
  date:{
    type: Date,
    required: [true, 'Date is required'], //Error Msg if missing
    default: Date.now,
    index: true
  },
  name:{
    type: String, //Data Type
    required: [true, 'Meal name is required'], //Error Msg if missing
    trim: true //Removes spaces, ex: ' John ' => 'John'
  },
  mealType:{
    type: String,
    required: [true, 'Meal type is required'],
    trim: true,
    enum:['breakfast', 'lunch', 'dinner', 'snacks', 'pre-workout', 'post-workout']
  },
  foods:[{
    foodID:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food'
    },
    customName: {
      type: String
    },
    quantity:{
      value: {
        type: Number,
        required: true,
        min: [0.1, 'Quantity is too small']
      },
      unit: {
        type: String,
        required: true,
        enum: ['gm', 'ml', 'cup', 'piece', 'slice', 'serving', 'tbsp', 'tsp']
      },
    },
    nutrition:{
      calories: {
        type: Number
      },
      protein: {
        type: Number
      },
      carbs: {
        type: Number
      },
      fat: {
        type: Number
      },
      fiber: {
        type: Number
      }
    },
    userNotes:{
      type: String,
      maxlength: 50,
      optional: true
    }
  }],
  source:{
    type: String,
    enum: ['manual', 'ai_scan', 'chat'],
    required: true,
    default: 'manual'
  },
  // For AI-Scanned Meals
  scanData:{
    imgURL:{
      type: String
    },
    aiConfidence:{
      type: Number
    },
    originalDetection:{ //what Ai thought it saw
      type: [String]
    },
    userCorrected:{ //did the user fix any mistakes?
      type: Boolean
    }
  },

  // For AI-chat created Meals
  chatData:{
    conversationID:{
      type: String
    },
    userMessage:{
      type: String
    },
    aiResponse:{ 
      type: String
    }
  },

  // Calculated Totals
  total:{
    calories:{
      type: Number,
      required: true,
      min: 0
    },
    protein:{type: Number, default:0},
    carbs:{type: Number, default:0},
    fat:{type: Number, default:0},
    fiber:{type: Number, default:0}
  },

  // user rating
  userRating:{
    type: Number,
    min: 1,
    max: 5
  },

  notes:{
    type: String,
    maxlength: 200
  },

  isRemoved:{
    type: Boolean
  }
},
{
  timestamps:true,
  toJSON:{virtuals:true},
  toObject:{virtuals:true}
});

// VIRTUAL 1: Time ago (e.g., "2 hours ago")
mealSchema.virtual('timeAgo').get(function() {
  // 'this' refers to the current meal document
  const now = new Date();
  const mealTime = this.date;
  const diffMs = now - mealTime;  // Difference in milliseconds
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
});

// VIRTUAL 2: Day of week
mealSchema.virtual('dayOfWeek').get(function() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 
                'Thursday', 'Friday', 'Saturday'];
  return days[this.date.getDay()];
});

// VIRTUAL 3: Meal summary (for display)
mealSchema.virtual('summary').get(function() {
  const foodCount = this.foods ? this.foods.length : 0;
  const mainFood = (this.foods && this.foods[0]) ? this.foods[0].customName : 'meal';
  
  if (foodCount === 1) return `${mainFood} (${this.total.calories} cal)`;
  return `${foodCount} items, ${this.total.calories} calories total`;
});

// VIRTUAL 4: Is this today's meal?
mealSchema.virtual('isToday').get(function() {
  const today = new Date();
  const mealDate = this.date;
  
  return mealDate.toDateString() === today.toDateString();
});

// MIDDLEWARE
// Pre-validate middleware (runs in order before validation)
mealSchema.pre('validate', mealMiddleware.ensureName);        // 1. Ensure name exists
mealSchema.pre('validate', mealMiddleware.calculateTotals);   // 2. Calculate totals

// Post-save middleware
mealSchema.post('save', mealMiddleware.afterSave);        // After saving

// Query middleware
mealSchema.pre('find', mealMiddleware.filterRemoved);     // Before any find

module.exports = mongoose.model('Meal', mealSchema);