const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Daily stats
  daily: {
    calories: {
      consumed: { type: Number, default: 0 },
      goal: { type: Number, default: 2000 },
      percentage: { type: Number, default: 0 }
    },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    mealsLogged: { type: Number, default: 0 },
    completed: { type: Boolean, default: false } // Met calorie goal?
  },
  
  // Weight tracking
  weight: {
    value: Number,
    unit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
    notes: String
  },
  
  // Streak info (updated daily)
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastActive: Date
  }

}, { 
  timestamps: true 
});

// Compound index for fast queries
progressSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Progress', progressSchema);