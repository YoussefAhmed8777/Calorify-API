const fatsecretService = require('./../services/fatsecret.services');
const { parseFoodDescription, formatFoodForClient } = require('./../utilities/foodhelpers');


// GET FOOD DETAILS
// GET /calorify/meals/food/:id
exports.getFoodDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Getting details for food ID: ${id}`);
    
    const food = await fatsecretService.getFoodDetails(id);
    
    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Food found successfully',
      data: formatFoodForClient(food)
    });

  } catch (error) {
    console.log('Food details error:', error);
    res.status(500).json({ 
      error: 'Failed to get food details',
      details: error.message 
    });
  }
};

// SEARCH FOODS
// GET /calorify/meals/search?q=apple
exports.searchFoods = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ 
        error: 'Search query must be at least 2 characters' 
      });
    }

    console.log(`Searching for: "${q}"`);
    
    // Call FatSecret
    const foods = await fatsecretService.searchFoods(q);
    
    // Format for client
    const formattedFoods = foods.map(food => ({
      id: food.id,
      name: food.name,
      brand: food.brand,
      description: food.description,
      // Parse nutrition from description for quick display
      nutrition: parseFoodDescription(food.description)
    }));

    res.status(200).json({
      success: true,
      message: 'Food found successfully',
      count: formattedFoods.length,
      data: formattedFoods
    });

  } catch (error) {
    console.log('Search error:', error);
    res.status(500).json({ 
      error: 'Failed to search foods',
      details: error.message 
    });
  }
};