const express = require('express');
const router = express.Router();
const authController = require('./../controllers/auth.controller');
const { authMiddleware } = require('./../middlewares/auth.middleware');
const validate = require('./../middlewares/validate.middleware');

// Public routes (no auth needed)
router.post('/register', validate('register'), authController.register);
// router.post('/loginIDToken', authController.login);
router.post('/login', validate('Login'), authController.loginWithEmail);
router.post('/refresh', authController.refreshToken);

// Protected routes (need valid token)
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, validate('updateProfile'), authController.updateProfile);

module.exports = router;