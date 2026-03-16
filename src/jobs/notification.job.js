// Scheduled notification tasks

const cron = require('node-cron');
const notificationController = require('./../controllers/notification.controller');

// Send meal reminders every day at 12 PM and 6 PM
cron.schedule('0 12,18 * * *', async () => {
  console.log('⏰ Running meal reminder job...');
  await notificationController.sendMealReminders();
});

// Send weekly summary every Monday at 9 AM
cron.schedule('0 9 * * 1', async () => {
  console.log('📊 Running weekly summary job...');
  // Implement weekly summary notifications
});

console.log('✅ Notification jobs scheduled');