const express = require('express');
const router = express.Router();
const notificationController = require('./../controllers/notification.controller');
const { authMiddleware } = require('./../middlewares/auth.middleware');

router.post('/register', authMiddleware, notificationController.registerToken);
router.post('/unregister', authMiddleware, notificationController.unregisterToken);
router.post('/test', authMiddleware, notificationController.sendTestNotification);

module.exports = router;