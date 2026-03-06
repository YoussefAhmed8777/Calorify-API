const Meal = require('./../models/meal.model');

exports.getAllMeals = async(req,res)=>{
  try {
    const getMeals = await Meal.find();
    if (getMeals.length > 0) {
      res.status(200).json({
        success: true,
        message: 'Here are all meals',
        data: getMeals
      });
    }else{
      res.status(404).json({
        success: false,
        message: 'No Meals Found'
      });
    }
  } catch (error) {
    console.log('Error Happened', error);
    res.status(500).json({
      success: false,
      message: 'Something Went Wrong'
    });
  }
};

exports.getMealById = async(req,res)=>{
  try {
    const mealID = await req.params.id;
    const mealDetailsByID = await Meal.findById(mealID);
    if (!mealDetailsByID) {
      return res.status(404).json({
        success: false,
        message: 'Meal of current id is not found'
      });
    }else{
      res.status(200).json({
        success: true,
        message: 'Meal Found',
        data: mealDetailsByID
      });
    }
  } catch (error) {
    console.log('Error Happened', error);
    res.status(500).json({
      success: false,
      message: 'Something Went Wrong'
    });
  }
};

exports.addMeal = async(req,res)=>{
  try {
    const mealData = req.body;
    const createdMeal = await Meal.create(mealData);
    console.log(createdMeal);
    if (createdMeal) {
      res.status(201).json({
        success: true,
        message: 'Meal Added Successfully',
        data: createdMeal
      });
    }
  } catch (error) {
    console.log('Error Happened', error);
    res.status(500).json({
      message:'Something Went Wrong'
    });
  }
};

exports.updateMeal = async(req,res)=>{
  try {
    const currentMealID = await req.params.id;
    const updateMealData = await Meal.findByIdAndUpdate(currentMealID, req.body, {returnDocument:'after'});
    if (!updateMealData) {
      res.status(400).json({
        success: true,
        message: 'Meal data is not updated'
      });
    }else{
      res.status(200).json({
        success: true,
        message: 'Meal Data Updated Successfully',
        data: updateMealData
      });
    }
  } catch (error) {
    console.log('Error Happened', error);
    res.status(500).json({
      message:'Something Went Wrong'
    });
  }
};

exports.removeMeal = async(req,res)=>{
  try {
    const currentMealID = await req.params.id;
    const removedMeal = await Meal.findByIdAndUpdate(currentMealID, {isRemoved:true});
    if(!removedMeal){
      res.status(400).json({
        success: false,
        message: 'Meal is not removed'
      });
    }else{
      res.status(200).json({
        success: true,
        message: 'Meal is removed successfully',
        data: removedMeal
      });
    }
  } catch (error) {
    console.log('Error Happened', error);
    res.status(500).json({
      message:'Something Went Wrong'
    });
  }
};