// JWT Tokens
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('./../models/user.model');

class TokenService {
  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessExpiry = '15m';      // Short-lived
    this.refreshExpiry = '7d';      // Long-lived
  }

  // GENERATE TOKENS
  generateTokens(user) {
    const payload = {
      uid: user._id, // who is this?
      email: user.email, // their email
      role: 'user' // what can they do
    };

    // Access token (short-lived)
    const accessToken = jwt.sign(
      payload, // Data to encode
      this.accessSecret, 
      { expiresIn: this.accessExpiry }
    );

    // Refresh token (long-lived)
    const refreshToken = jwt.sign(
      { uid: user._id },  // Minimal payload
      this.refreshSecret,
      { expiresIn: this.refreshExpiry }
    );

    return { accessToken, refreshToken };
  }

  // VERIFY ACCESS TOKEN
  verifyAccessToken(token) {
    try {
      // This checks:
      // 1. Was it signed in?
      // 2. Has it expired?
      // 3. Is the format valid?
      const decoded = jwt.verify(token, this.accessSecret);
      return decoded;

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
    }
  };

  // VERIFY REFRESH TOKEN
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret);
      return decoded;

    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  };

  // REFRESH ACCESS TOKEN
  async refreshAccessToken(refreshToken) {
    // 1. Verify refresh token is valid
    const payload = this.verifyRefreshToken(refreshToken);
    
    // 2. Find user
    const user = await User.findById(payload.uid);
    if (!user){
      throw new Error('User not found');
    }
    
    // 3. Generate new tokens
    return this.generateTokens(user);
  };

  // HASH REFRESH TOKEN FOR STORAGE
  hashToken(token) { // one way ecnryption
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  };

  // STORE REFRESH TOKEN
  async storeRefreshToken(userID, token) {
    const hashedToken = this.hashToken(token);
    await User.findByIdAndUpdate(userID, {
      refreshToken: hashedToken
    });
  };

  // VALIDATE REFRESH TOKEN
  async validateRefreshToken(userID, token) {
    const user = await User.findById(userID).select('+refreshToken');
    
    if (!user || !user.refreshToken) {
      return false;
    }

    // Hash the incoming token and compare
    const hashedToken = this.hashToken(token);
    return hashedToken === user.refreshToken;
  };

  // REMOVE REFRESH TOKEN (LOGOUT)
  async removeRefreshToken(userID) {
    await User.findByIdAndUpdate(userID, {
      $unset: { refreshToken: 1 } // removes the field
    });
  };
};

module.exports = new TokenService();