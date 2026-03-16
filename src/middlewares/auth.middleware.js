const tokenService = require('./../services/token.services');
const User = require('./../models/user.model');

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token
    const decoded = tokenService.verifyAccessToken(token);

    // 3. Check if user still exists
    const user = await User.findById(decoded.uid);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // 4. Check if user is active
    // if (!user.isActive) {
    //   return res.status(403).json({ error: 'Account deactivated' });
    // }

    // 5. Attach user to request
    req.user = {
      uid: user._id,
      email: user.email,
      role: decoded.role
    };

    next();

  } catch (error) {
    if (error.message === 'Access token expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        errorMessage: error,
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Optional: Role-based middleware
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authMiddleware, requireRole };