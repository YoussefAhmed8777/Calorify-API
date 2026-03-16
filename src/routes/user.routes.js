const router = require('express').Router();
const authController = require('./../controllers/auth.controller');
const { authMiddleware } = require('./../middlewares/auth.middleware');

// Public routes (no auth needed)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes (need valid token)
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;