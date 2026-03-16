const { GoogleGenAI } = require("@google/genai");

class GeminiService {
  constructor() {
    // Initialize the client with your API key
    this.ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY 
    });
    
    // Choose your model
    // - "gemini-2.0-flash": Fast, good for chat
    // - "gemini-1.5-pro": More powerful, slower
    this.model = "gemini-2.0-flash";
  }

  // SIMPLE CHAT
  async chat(message, history = []) {
    try {
      console.log(`🤖 Sending to Gemini: "${message.substring(0, 50)}..."`);

      // Build conversation with history
      const contents = [];
      
      // Add previous messages if any
      for (const msg of history) {
        contents.push({
          role: msg.role, // "user" or "model"
          parts: [{ text: msg.content }]
        });
      }
      
      // Add current message
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      // Get response from Gemini
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: contents,
      });

      return {
        success: true,
        response: response.text,
        timestamp: new Date()
      };

    } catch (error) {
      console.log('❌ Gemini API error:', error);
      console.log('❌ Gemini API error:', error.message);
      return {
        success: false,
        error: 'Failed to get AI response',
        fallback: 'Please try again later'
      };
    }
  }

  // QUICK QUESTION (NO HISTORY)
  async ask(question) {
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: question,
      });
      
      return response.text;
    } catch (error) {
      console.log('❌ Gemini ask error:', error);
      console.log('❌ Gemini ask error:', error.message);
      return 'Sorry, I could not process your request.';
    }
  }

  // NUTRITION-SPECIFIC CHAT
  async askNutrition(question, userContext = {}) {
    // Create a prompt that guides Gemini to be a nutritionist
    const systemPrompt = `You are a helpful nutrition assistant for a calorie tracking app. 
Your job is to:
1. Estimate calories in foods when asked
2. Provide nutrition advice
3. Be accurate and helpful
4. If unsure, say "I'm not sure, please consult a nutritionist"

User info: ${JSON.stringify(userContext)}

Keep responses concise and friendly.`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: question }] }
        ],
      });
      
      return response.text;
    } catch (error) {
      console.log('❌ Nutrition chat error:', error);
      console.log('❌ Nutrition chat error:', error.message);
      return 'I encountered an error. Please try again.';
    }
  }

  // EXTRACT MEAL FROM TEXT
  // This is for the "I ate pizza" feature
  async extractMealFromText(userMessage) {
    const prompt = `Extract meal information from this user message.
Return ONLY a JSON object with this structure:
{
  "foods": [
    { "name": "food name", "quantity": number, "unit": "serving/cup/piece/etc" }
  ],
  "mealType": "breakfast|lunch|dinner|snack",
  "estimatedCalories": total,
  "confidence": "high|medium|low"
}

User message: "${userMessage}"`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
      });
      
      // Try to parse the response as JSON
      try {
        const mealData = JSON.parse(response.text);
        return mealData;
      } catch (e) {
        // If not valid JSON, return raw text
        return { raw: response.text, confidence: 'low' };
      }
      
    } catch (error) {
      console.log('❌ Meal extraction error:', error);
      console.log('❌ Meal extraction error:', error.message);
      return null;
    }
  }
}

module.exports = new GeminiService();