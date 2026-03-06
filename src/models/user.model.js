const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:{
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  email:{
    type: String,
    required: [true, 'User email is required'],
    trim: true,
    lowercase: true
  },
  height:{
    type: Number,
    required: [true, 'User height is required'],
    trim: true
  },
  weight:{
    type: Number,
    required: [true, 'User weight is required'],
    trim: true
  },
  dailyCaloriesGoal:{
    type: Number,
    required: [true, 'User calories is required'],
    trim: true,
    default: 2000,
    min: 500,
    max: 8000
  },
  gender:{
    type: String,
    required: [true, 'User gender is required'],
    trim: true,
    enum: ['Male', 'Female']
  },
  age:{
    type: Number,
    required: [true, 'User age is required'],
    trim: true
  },
  activityLevel:{
    type: String,
    required: [true, 'User activity level is required'],
    trim: true,
    enum: ['Very Active', 'Active', 'Normal Activity', 'Low Activity']
  },
  goal:{
    type: String,
    required: [true, 'User goal is required'],
    trim: true,
    enum: ['Lose Weight', 'Maintain Weight', 'Gain Weight']
  },
  stats: {
    mealsLogged: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    joinDate: { type: Date, default: Date.now }
  },
  // Refresh token (encrypted)
  refreshToken: {
    type: String,
    select: false  // Won't show in normal queries
  },
},{timestamps:true});

userSchema.index({ email: 1 });
userSchema.index({ 'stats.currentStreak': -1 });

module.exports = mongoose.model('User', userSchema);