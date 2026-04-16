/**
 * FatSecret Service
 * ------------------
 * Handles communication with the FatSecret Platform API to search for foods
 * and retrieve their nutritional information.
 *
 * Authentication: OAuth 2.0 Client Credentials flow
 *   - Token is cached and auto-refreshed 5 minutes before expiry
 *
 * Caching strategy (in-memory Map):
 *   - 3 separate cache key prefixes: "search:", "detail:", "nutrition:"
 *   - TTL: 1 hour per entry
 *   - Max entries: 500 (FIFO eviction when full)
 *   - Avoids redundant API calls for repeated food lookups
 *
 * Used by:
 *   - scan.controller.js  → searchAndGetNutrition() during meal scanning
 *   - meal.controller.js  → getFoodDetails() when creating meals with FatSecret food IDs
 */
const axios = require('axios');

class FatSecretService {
  constructor() {
    this.clientId = process.env.FATSECRET_CLIENT_ID;
    this.clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    // FatSecret API endpoints
    this.tokenUrl = 'https://oauth.fatsecret.com/connect/token';
    this.searchUrl = 'https://platform.fatsecret.com/rest/foods/search/v1';
    this.detailUrl = 'https://platform.fatsecret.com/rest/food/v5';
    
    // OAuth token cache — avoids requesting a new token every API call
    this.accessToken = null;
    this.tokenExpiry = null;

    // In-memory nutrition cache (Map: key → { data, timestamp })
    // Eliminates redundant FatSecret API calls for the same food
    this._nutritionCache = new Map();
    this._CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
    this._CACHE_MAX = 500;             // Max cached entries before FIFO eviction
  }

  // =============================================
  // CACHE HELPERS (Private)
  // =============================================

  /**
   * Retrieve a cached entry if it exists and hasn't expired.
   * Returns null if the entry is missing or stale (auto-deletes stale entries).
   *
   * @param {string} key - Cache key (e.g. "nutrition:apple")
   * @returns {*|null} The cached data, or null if miss/expired
   */
  _getCached(key) {
    const entry = this._nutritionCache.get(key);
    if (!entry) return null;

    // Check if the entry has expired (older than TTL)
    if (Date.now() - entry.timestamp > this._CACHE_TTL) {
      this._nutritionCache.delete(key); // Clean up expired entry
      return null;
    }
    return entry.data;
  }

  /**
   * Store data in the cache with a timestamp.
   * If the cache is full, evicts the oldest entry (FIFO — first inserted key).
   *
   * @param {string} key  - Cache key
   * @param {*}      data - Data to cache
   */
  _setCache(key, data) {
    // Evict the oldest entry if cache has reached max capacity
    if (this._nutritionCache.size >= this._CACHE_MAX) {
      const oldestKey = this._nutritionCache.keys().next().value;
      this._nutritionCache.delete(oldestKey);
    }
    this._nutritionCache.set(key, { data, timestamp: Date.now() });
  }

  // =============================================
  // 1. OAUTH AUTHENTICATION
  // =============================================

  /**
   * Get a valid OAuth access token for FatSecret API.
   * Returns cached token if still valid (with 5-minute expiry buffer).
   * Otherwise requests a new token using client credentials.
   *
   * @returns {Promise<string>} The OAuth access token
   * @throws {Error} If authentication fails
   */
  async getAccessToken() {
    // Return cached token if it won't expire within the next 5 minutes
    if (this.accessToken && this.tokenExpiry > Date.now() + 300000) {
      return this.accessToken;
    }

    try {
      // Build the token request body (OAuth 2.0 client_credentials grant)
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('scope', 'basic');

      // Encode client_id:client_secret as Base64 for Basic auth header
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(this.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`
        }
      });

      // Cache the new token and calculate its expiry time
      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      console.log('FatSecret token obtained');
      return this.accessToken;

    } catch (error) {
      console.error('FatSecret auth failed:', error.response?.data || error.message);
      throw new Error('FatSecret authentication failed');
    }
  }

  // =============================================
  // 2. LOW-LEVEL API REQUESTS (Private)
  // =============================================

  /**
   * Send a search request to the FatSecret foods search endpoint.
   * Auto-retries once if the token is expired (401 response).
   *
   * @param {Object} params - { search_expression: string, max_results?: number }
   * @returns {Promise<Object>} Raw API response data
   * @private
   */
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
      // If token expired mid-request, clear it and retry once
      if (error.response?.status === 401) {
        this.accessToken = null;
        return this._makeSearchRequest(params);
      }
      console.error('Search request failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a detail request to the FatSecret food detail endpoint.
   * Auto-retries once if the token is expired (401 response).
   *
   * @param {Object} params - { food_id: string }
   * @returns {Promise<Object>} Raw API response data
   * @private
   */
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
      // If token expired mid-request, clear it and retry once
      if (error.response?.status === 401) {
        this.accessToken = null;
        return this._makeDetailRequest(params);
      }
      console.error('Detail request failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // =============================================
  // 3. PUBLIC METHODS
  // =============================================

  /**
   * Search for foods by name/keyword.
   * Results are cached by query string (lowercased) for 1 hour.
   *
   * @param {string} query      - Food search term (e.g. "apple", "chicken breast")
   * @param {number} maxResults - Max results to return (default: 10)
   * @returns {Promise<Array<{ id, name, brand, type, description }>>}
   *          Array of matching foods, or empty array on error
   */
  async searchFoods(query, maxResults = 10) {
    try {
      const cacheKey = `search:${query.toLowerCase()}`;
      const cached = this._getCached(cacheKey);
      if (cached) {
        console.log(`FatSecret search cache hit: "${query}"`);
        return cached;
      }

      console.log(`Searching FatSecret for: "${query}"`);
      
      const data = await this._makeSearchRequest({
        search_expression: query,
        max_results: maxResults
      });

      // FatSecret returns no results as missing or empty object
      if (!data?.foods?.food) {
        console.log('No foods found in response');
        return [];
      }

      // FatSecret returns a single object instead of array when there's only 1 result
      const foods = Array.isArray(data.foods.food) 
        ? data.foods.food 
        : [data.foods.food];

      // Map FatSecret response fields to our simplified format
      const results = foods.map(food => ({
        id: food.food_id,
        name: food.food_name,
        brand: food.brand_name,
        type: food.food_type,
        description: food.food_description // Contains basic nutrition text
      }));

      this._setCache(cacheKey, results);
      return results;

    } catch (error) {
      console.error('Search failed:', error.message);
      return []; // Return empty array on error so callers don't need to handle null
    }
  }

  /**
   * Get detailed nutrition info for a specific food by its FatSecret ID.
   * Results are cached by food ID for 1 hour.
   *
   * @param {string} foodId - FatSecret food_id (e.g. "35718")
   * @returns {Promise<{ id, name, brand, servings: Array<{ description, calories, protein, carbs, fat }> }|null>}
   *          Food details with serving-specific nutrition, or null if not found
   */
  async getFoodDetails(foodId) {
    try {
      const cacheKey = `detail:${foodId}`;
      const cached = this._getCached(cacheKey);
      if (cached) {
        console.log(`FatSecret detail cache hit: ID ${foodId}`);
        return cached;
      }

      console.log(`Getting details for food ID: ${foodId}`);
      
      const data = await this._makeDetailRequest({
        food_id: foodId
      });

      if (!data?.food) {
        return null;
      }

      const food = data.food;
      
      // FatSecret returns single serving as object, multiple as array — normalize to array
      const servings = food.servings?.serving || [];
      const servingsList = Array.isArray(servings) ? servings : [servings];

      // Map FatSecret field names to our simplified format
      const result = {
        id: food.food_id,
        name: food.food_name,
        brand: food.brand_name,
        servings: servingsList.map(s => ({
          description: s.serving_description,
          calories: parseFloat(s.calories) || 0,
          protein: parseFloat(s.protein) || 0,
          carbs: parseFloat(s.carbohydrate) || 0, // FatSecret uses "carbohydrate", we use "carbs"
          fat: parseFloat(s.fat) || 0
        }))
      };

      this._setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Failed to get food details:', error.message);
      return null;
    }
  }

  /**
   * COMBINED: Search for a food by name and return its nutrition data in one call.
   * This is the primary method used by the scan controller.
   *
   * Strategy:
   *   1. Check cache for "nutrition:<foodName>" — return immediately if found
   *   2. Search FatSecret for the food name (top 3 results)
   *   3. Get full details for the top result (first match)
   *   4. Extract nutrition from the first serving size
   *   5. Cache and return the result
   *
   * @param {string} foodName - The food to look up (e.g. "pizza", "banana")
   * @returns {Promise<{ calories, protein, carbs, fat, servingSize }|null>}
   *          Nutrition data for one serving, or null if food not found
   */
  async searchAndGetNutrition(foodName) {
    const cacheKey = `nutrition:${foodName.toLowerCase()}`;
    const cached = this._getCached(cacheKey);
    if (cached) {
      console.log(`Nutrition cache hit: "${foodName}"`);
      return cached;
    }

    // Step 1: Search for the food (limit to 3 results for speed)
    const searchResults = await this.searchFoods(foodName, 3);
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    // Step 2: Get detailed nutrition for the top search result
    const foodDetails = await this.getFoodDetails(searchResults[0].id);
    if (!foodDetails?.servings?.[0]) {
      return null;
    }

    // Step 3: Extract nutrition from the first (default) serving
    const nutrition = {
      calories: foodDetails.servings[0].calories,
      protein: foodDetails.servings[0].protein,
      carbs: foodDetails.servings[0].carbs,
      fat: foodDetails.servings[0].fat,
      servingSize: foodDetails.servings[0].description || '100g'
    };

    this._setCache(cacheKey, nutrition);
    return nutrition;
  }
}

module.exports = new FatSecretService();