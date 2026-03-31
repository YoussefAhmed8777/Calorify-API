const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  badgeId: {
    type: String,
    required: true
  },
  
  badgeName: {
    type: String,
    required: true
  },
  
  badgeIcon: String,
  
  description: String,
  
  earnedDate: {
    type: Date,
    default: Date.now
  },
  
  progress: {
    type: Number, // 0-100 for in-progress badges
    default: 100
  },
  
  isCompleted: {
    type: Boolean,
    default: true
  },
  
  // For progress-tracking badges (e.g., "50 meals to go!")
  currentValue: Number,
  targetValue: Number

}, { 
  timestamps: true 
});

// User can only have each badge once
achievementSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);