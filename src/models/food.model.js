const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  name:{
    type: String,
    required: [true, 'Food name is required'],
    trim: true,
    unique: true,
    minlength: [3, 'Food name is too short'],
    maxlength: [50, 'Food name is too long']
  },
  nameAR:{
    type: String,
    trim: true,
  },
  category:{
    type: String,
    required: [true, 'Food category is required'],
    trim: true,
    enum: [ //only these values allowed
      'fruit', 'vegetable', 'meat', 'seafood', 'nuts',
      'dessert', 'street_food', 'bread', 'soup', 'sauce',
      'dairy', 'grains', 'mixed_dish'
    ],
    index: true //makes searching by category faster
  },

  // Nutrition facts per 100gm
  nutrition:{
    calories:{
      type: Number,
      required: [true, 'Calories are required'],
      min: [0, 'Calories can not be negative'],
      max: [900, 'Calories too high for 100gm']
    },
    protein:{
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    carbs:{
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    fat:{
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    fiber:{
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    sugar:{
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    sodium:{
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },

  // Serving information
  servingSizes:[{
    description:{
      type: String,
      required: [true, 'Serving size description is required, example: 1 medium'] //not quite right, double check
    },
    grams:{
      type: Number,
      required: [true, 'Serving size grams is required'] //how many grams this serving equals
    },
  }],
  defaultServing:{
    type: String,
    default: '100gm'
  },

  isRemoved:{
    type: Boolean
  }
},{timestamps:true});

foodSchema.virtual('nutritionPerServing').get(function() {
  // If no serving sizes defined, just return per 100g
  if (!this.servingSizes || this.servingSizes.length === 0) {
    return {
      ...this.nutrition,
      servingDescription: '100g'
    };
  }
  
  // Take the FIRST serving size as default
  const defaultServing = this.servingSizes[0];
  // Calculate multiplier: serving grams / 100
  const multiplier = defaultServing.grams / 100;
  
  // Apply multiplier to ALL nutrients
  return {
    calories: Math.round(this.nutrition.calories * multiplier),
    protein: (this.nutrition.protein * multiplier).toFixed(1),
    carbs: (this.nutrition.carbs * multiplier).toFixed(1),
    fat: (this.nutrition.fat * multiplier).toFixed(1),
    servingDescription: defaultServing.description
  };
});

// foodSchema.index({ name: 'text', nameAr: 'text' });  // Text search
// foodSchema.index({ category: 1 });       // Compound index

module.exports = mongoose.model('Food', foodSchema);