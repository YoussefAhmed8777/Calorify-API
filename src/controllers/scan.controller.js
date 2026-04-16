/**
 * Scan Controller
 * ----------------
 * Handles AI-powered food scanning via image upload.
 *
 * Flow:
 *   1. User uploads a photo        → POST /calorify/scan/meal  (scanMeal)
 *   2. Clarifai identifies foods    → returns detected items + nutrition
 *   3. User confirms & saves meal   → POST /calorify/scan/save (saveScanAsMeal)
 *
 * Dependencies:
 *   - multer:           Handles multipart file upload (image stored in memory)
 *   - sharp:            Compresses the image before sending to Clarifai
 *   - clarifaiService:  Sends image bytes to Clarifai food-recognition AI model
 *   - fatsecretService: Looks up nutrition data (calories, protein, carbs, fat) for detected foods
 *   - progressService:  Updates daily calorie/macro progress after a meal is saved
 */
const multer = require('multer');
const sharp = require('sharp');
const clarifaiService = require('./../services/clarifai.services');
const Meal = require('./../models/meal.model');
const User = require('./../models/user.model');
const progressService = require('./../services/progress.services');
const fatsecretService = require('./../services/fatsecret.services');

/**
 * Multer configuration — stores uploaded images in memory (RAM buffer).
 * - Max file size: 5 MB
 * - Only allows image/* MIME types (rejects PDFs, videos, etc.)
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

/**
 * SCAN MEAL — Identify foods from a photo
 * POST /calorify/scan/meal
 *
 * Expects: multipart/form-data with an 'image' field
 *
 * Steps:
 *   1. Validate that an image file was uploaded
 *   2. Compress the image to 640×640 (saves bandwidth to Clarifai)
 *   3. Send compressed bytes to Clarifai for food recognition
 *   4. Reject if the top detection confidence is below 70%
 *   5. Look up nutrition data for the top detected food via FatSecret
 *   6. Return detected foods + nutrition (ready for saveScanAsMeal)
 *
 * Response format:
 *   {
 *     detectedFoods: [{ name, confidence }],   // Top 5 detections
 *     selectedFoodIndex: 0,                     // Default selection
 *     nutrition: { calories, protein, carbs, fat, servingSize }
 *   }
 */
exports.scanMeal = async (req, res) => {
  try {
    // Validate file upload exists and has valid buffer data
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    if (!req.file.buffer) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    console.log('Processing image:', {
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname
    });

    // Compress image to reduce Clarifai API payload size
    // 'inside' keeps the aspect ratio while fitting within 640×640
    const compressedBuffer = await sharp(req.file.buffer)
      .resize(640, 640, { fit: 'inside' })
      .toBuffer();

    // Step 1: Send compressed image to Clarifai food-recognition model
    const detectedFoods = await clarifaiService.recognizeFoodFromBytes(compressedBuffer);
    
    // Step 2: Check that the top detection has high enough confidence (≥ 70%)
    const topFood = detectedFoods[0];
    
    if (!topFood || topFood.confidence < 0.7) {
      return res.status(400).json({ 
        error: 'Could not identify food clearly. Please try another photo.',
        detected: detectedFoods.slice(0, 3) // Show top 3 for debugging
      });
    }
    
    // Step 3: Get nutrition for the top food via FatSecret (uses in-memory cache)
    const nutrition = await fatsecretService.searchAndGetNutrition(topFood.name);
    
    if (!nutrition) {
      return res.status(404).json({ 
        error: `Food "${topFood.name}" recognized but no nutrition data available`,
        suggestion: 'You can manually log this meal instead.'
      });
    }
    
    // Step 4: Build response array — top 5 detections in the same format saveScanAsMeal expects
    const allDetected = detectedFoods.slice(0, 5).map(f => ({
      name: f.name,
      confidence: f.confidence
    }));

    // Step 5: Return combined result (client can pass this directly to /scan/save)
    res.status(200).json({
      success: true,
      message: 'Image scanned successfully',
      data: {
        detectedFoods: allDetected,          // All detected foods for the user to choose from
        selectedFoodIndex: 0,                // Pre-select the top match
        nutrition                            // Nutrition for the top food (pass to /scan/save to skip re-fetch)
      }
    });
    
  } catch (error) {
    console.error('Scan error:', error);
    
    // Return a user-friendly error if Clarifai is down
    if (error.message.includes('Clarifai')) {
      return res.status(503).json({ error: 'AI service temporarily unavailable' });
    }
    
    res.status(500).json({ error: 'Failed to scan image. Please try again.' });
  }
};

/**
 * SAVE SCAN AS MEAL — Persist a scanned food detection as a logged meal
 * POST /calorify/scan/save
 *
 * Body:
 *   {
 *     detectedFoods:      [{ name, confidence }],  // From scanMeal response
 *     selectedFoodIndex:  0,                        // Which food the user picked (default: 0)
 *     mealType:           'lunch',                  // Optional — defaults to 'snacks'
 *     mealName:           'My lunch',               // Optional — defaults to "Scanned: <food>"
 *     nutrition:          { calories, protein, carbs, fat }  // Optional — from scanMeal response
 *   }
 *
 * Nutrition lookup strategy:
 *   1. If nutrition was provided in the body (from the scan response), use it directly (no API call)
 *   2. Otherwise, fall back to FatSecret lookup (which also checks the in-memory cache)
 *
 * After saving:
 *   - Updates daily progress (calories consumed, streak)
 *   - Increments the user's lifetime meal count
 */
exports.saveScanAsMeal = async (req, res) => {
  try {
    const userID = req.user.uid; // Comes from auth middleware (Firebase UID)
    const { detectedFoods, mealType, mealName, selectedFoodIndex = 0, nutrition: providedNutrition } = req.body;

    // Validate that detected foods array is present
    if (!detectedFoods || detectedFoods.length === 0) {
      return res.status(400).json({ error: 'No foods detected to save' });
    }

    // Validate selected food index is within range
    const selectedFood = detectedFoods[selectedFoodIndex];
    if (!selectedFood) {
      return res.status(400).json({ error: 'Selected food not found' });
    }

    // Use provided nutrition from scan response if available (skips re-fetching)
    // Otherwise fall back to FatSecret lookup
    let nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    if (providedNutrition && providedNutrition.calories > 0) {
      // Use nutrition from the scan response (avoids redundant FatSecret API call)
      nutrition = {
        calories: providedNutrition.calories,
        protein: providedNutrition.protein || 0,
        carbs: providedNutrition.carbs || 0,
        fat: providedNutrition.fat || 0
      };
      console.log('Using nutrition from scan response (no re-fetch needed)');
    } else {
      // Fallback: look up nutrition via FatSecret (uses cache if available)
      const lookedUp = await fatsecretService.searchAndGetNutrition(selectedFood.name);
      if (lookedUp) {
        nutrition = {
          calories: lookedUp.calories,
          protein: lookedUp.protein,
          carbs: lookedUp.carbs,
          fat: lookedUp.fat
        };
      }
    }

    // Create meal from detected foods
    const foods = [{
      customName: selectedFood.name,
      quantity: { value: 1, unit: 'serving' },
      nutrition
    }];

    // Create the meal document in the database
    // Note: meal.middleware.js pre-validate hook auto-calculates `total` from foods[].nutrition
    const meal = await Meal.create({
      userID,
      name: mealName || `Scanned: ${selectedFood.name}`,
      mealType: mealType || 'snacks',
      foods,
      source: 'ai_scan',
      scanData: {
        originalDetection: detectedFoods.map(food => food.name), // Store as string array
        selectedFood: selectedFood.name,
        aiConfidence: selectedFood.confidence,
        userCorrected: false
      }
    });

    // Update daily progress (recalculates day's total calories, macros, and streak)
    const progress = await progressService.updateDailyProgress(userID, new Date());
    
    // Increment user's lifetime meal count
    await User.findByIdAndUpdate(userID, {
      $inc: { 'stats.mealsLogged': 1 }
    });

    res.status(200).json({
      success: true,
      message: 'Scanned meal saved successfully',
      data: meal,
      dailyProgress: {
        caloriesConsumed: progress.daily.calories.consumed,
        caloriesGoal: progress.daily.calories.goal,
        caloriesRemaining: Math.max(0, progress.daily.calories.goal - progress.daily.calories.consumed),
        percentage: progress.daily.calories.percentage,
        protein: progress.daily.protein,
        carbs: progress.daily.carbs,
        fat: progress.daily.fat,
        mealsLogged: progress.daily.mealsLogged
      }
    });

  } catch (error) {
    console.error('Save scan error:', error);
    res.status(500).json({ error: 'Failed to save scanned meal' });
  }
};

// Export multer middleware for use in route definitions
// Usage in routes: router.post('/meal', scanController.uploadSingle, scanController.scanMeal)
exports.upload = upload;
exports.uploadSingle = upload.single('image'); // Expects form field named 'image'