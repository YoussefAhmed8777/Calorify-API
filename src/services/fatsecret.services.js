const axios = require('axios');

class FatSecretService {
  constructor() {
    this.clientId = process.env.FATSECRET_CLIENT_ID;
    this.clientSecret = process.env.FATSECRET_CLIENT_SECRET;
    this.tokenUrl = 'https://oauth.fatsecret.com/connect/token';
    this.searchUrl = 'https://platform.fatsecret.com/rest/foods/search/v1';
    this.detailUrl = 'https://platform.fatsecret.com/rest/food/v5';
    
    // Token cache
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // 1. GET OAUTH TOKEN
  async getAccessToken() {
    // Return cached token if still valid (with 5 min buffer)
    if (this.accessToken && this.tokenExpiry > Date.now() + 300000) {
      return this.accessToken;
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('scope', 'basic');

      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(this.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      console.log('FatSecret token obtained');
      return this.accessToken;

    } catch (error) {
      console.error('FatSecret auth failed:', error.response?.data || error.message);
      throw new Error('FatSecret authentication failed');
    }
  }

  // 2. MAKE SEARCH REQUEST
  async _makeSearchRequest(params) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(this.searchUrl, {
        params: {
          search_expression: params.search_expression,
          max_results: params.max_results || 10,
          format: 'json'
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;

    } catch (error) {
      if (error.response?.status === 401) {
        this.accessToken = null;
        return this._makeSearchRequest(params);
      }
      console.error('Search request failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // 3. MAKE DETAIL REQUEST
  async _makeDetailRequest(params) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(this.detailUrl, {
        params: {
          food_id: params.food_id,
          format: 'json'
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data;

    } catch (error) {
      if (error.response?.status === 401) {
        this.accessToken = null;
        return this._makeDetailRequest(params);
      }
      console.error('Detail request failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // 4. SEARCH FOODS - FIXED
  async searchFoods(query, maxResults = 10) {
    try {
      console.log(`Searching FatSecret for: "${query}"`);
      
      const data = await this._makeSearchRequest({
        search_expression: query,
        max_results: maxResults
      });

      // Debug log to see what FatSecret returns
      // console.log('FatSecret response structure:', Object.keys(data || {}));
      console.log('FatSecret response structure:', data);

      if (!data?.foods?.food) {
        console.log('No foods found in response');
        return [];
      }

      const foods = Array.isArray(data.foods.food) 
        ? data.foods.food 
        : [data.foods.food];

      return foods.map(food => ({
        id: food.food_id,
        name: food.food_name,
        brand: food.brand_name,
        type: food.food_type,
        description: food.food_description
      }));

    } catch (error) {
      console.error('Search failed:', error.message);
      return []; // Return empty array on error
    }
  }

  // 5. GET FOOD DETAILS - FIXED
  async getFoodDetails(foodId) {
    try {
      console.log(`Getting details for food ID: ${foodId}`);
      
      const data = await this._makeDetailRequest({
        food_id: foodId
      });

      if (!data?.food) {
        return null;
      }

      const food = data.food;
      
      // Parse servings
      const servings = food.servings?.serving || [];
      const servingsList = Array.isArray(servings) ? servings : [servings];

      return {
        id: food.food_id,
        name: food.food_name,
        brand: food.brand_name,
        servings: servingsList.map(s => ({
          description: s.serving_description,
          calories: parseFloat(s.calories) || 0,
          protein: parseFloat(s.protein) || 0,
          carbs: parseFloat(s.carbohydrate) || 0,
          fat: parseFloat(s.fat) || 0
        }))
      };

    } catch (error) {
      console.error('Failed to get food details:', error.message);
      return null;
    }
  }
}

module.exports = new FatSecretService();