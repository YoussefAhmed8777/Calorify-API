const { auth } = require('./../config/firebase');
const User = require('./../models/user.model');
const tokenService = require('./../services/token.services');

// REGISTER
// POST /calorify/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, name,
            weight, height, dailyCalorieGoal, 
            gender, age, activityLevel, goal, 
          } = req.body;

    // Validate password exists!
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }      

    // 1. Create user in Firebase
    const firebaseUser = await auth.createUser({
      email,
      password,
      displayName:name,
      emailVerified: false
    });

    // 2. Create user in MongoDB (same UID)
    const mongoUser = await User.create({
      _id: firebaseUser.uid,
      name,
      email,
      weight,
      height,
      dailyCalorieGoal,
      gender,
      age,
      activityLevel,
      goal,
      stats: { joinDate: new Date() }
    });

    // 3. Generate JWT tokens
    const { accessToken, refreshToken } = tokenService.generateTokens(mongoUser);

    // 4. Store refresh token (hashed)
    await tokenService.storeRefreshToken(mongoUser._id, refreshToken);

    // 5. Send response (never send refresh token to client!)
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        userName: mongoUser.name,
        userEmail: mongoUser.email,
      },
      accessToken,
      expiresIn: 900  // 15 minutes in seconds
    });

  } catch (error) {
    console.log('Registration error:', error);
    
    // Handle Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email already in use' });
    }else{
      res.status(500).json({ error: 'Registration failed' });
    }
  };
};

// LOGIN
// POST /calorify/auth/login
exports.login = async (req, res) => {
  try {
    const { idToken } = req.body;  // From Firebase client SDK

    console.log("Token received from frontend/postman:", idToken);
    // 1. Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    // 2. Find or create user in MongoDB
    let user = await User.findById(uid);
    
    if (!user) {
      // First time login - create profile
      user = await User.create({
        _id: uid,
        email,
        displayName: name || email.split('@')[0],
        stats: { joinDate: new Date() }
      });
    }

    // 3. Generate JWT tokens
    const { accessToken, refreshToken } = tokenService.generateTokens(user);

    // 4. Store refresh token
    await tokenService.storeRefreshToken(uid, refreshToken);

    // 5. Update last login
    await User.findByIdAndUpdate(uid, {
      'stats.lastLogin': new Date()
    });

    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      user: {
        uid: user._id,
        email: user.email,
        name: user.name,
        dailyCalorieGoal: user.dailyCalorieGoal
      },
      accessToken,
      expiresIn: 900
    });

  } catch (error) {
    console.log('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

// REFRESH TOKEN 
// POST /calorify/auth/refresh
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Get new tokens
    const tokens = await tokenService.refreshAccessToken(refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Refresh token generated successfully',
      accessToken: tokens.accessToken,
      expiresIn: 900
    });

  } catch (error) {
    console.log('Refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// LOGOUT
// POST /calorify/auth/logout
exports.logout = async (req, res) => {
  try {
    const userId = req.user.uid;  // From auth middleware
    
    // Remove refresh token from database
    await tokenService.removeRefreshToken(userId);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.log('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// GET PROFILE
// GET /calorify/users/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.uid)
      .select('-refreshToken');  // Exclude refresh token
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User data found',
      userData: user
    });

  } catch (error) {
    console.log('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// UPDATE PROFILE
// PUT /calorify/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = {
      displayName: req.body.displayName,
      dailyCalorieGoal: req.body.dailyCalorieGoal,
      email:req.body.email,
      weight:req.body.weight,
      height:req.body.height,
      age:req.body.age,
      goal:req.body.goal,
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    const user = await User.findByIdAndUpdate(
      req.user.uid,
      updates,
      { returnDocument:'after', runValidators: true }
    ).select('-refreshToken');

    res.status(200).json({
      success: true,
      message: 'User data updated successfully',
      user
    });

  } catch (error) {
    console.log('Update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};