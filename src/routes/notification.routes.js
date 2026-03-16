const router = require('express').Router();
const notificationController = require('./../controllers/notification.controller');
const { authMiddleware } = require('./../middlewares/auth.middleware');

// All notification routes require authentication
// router.use(authMiddleware);

router.post('/register', notificationController.registerToken);
router.post('/unregister', notificationController.unregisterToken);
router.post('/test', notificationController.sendTestNotification);

module.exports = router;