const { admin } = require('./../config/firebase');

class NotificationService {
  // SEND TO SINGLE DEVICE 
  async sendToDevice(deviceToken, payload) {
    try {
      // admin.messaging() is already configured by your service account!
      const response = await admin.messaging().send({
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      });
      
      return { success: true, messageId: response };

    } catch (error) {
      console.log('Notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // SEND TO MULTIPLE DEVICES 
  async sendToMultipleDevices(deviceTokens, payload) {
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: deviceTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      });
      
      return { 
        success: true, 
        successCount: response.successCount 
      };

    } catch (error) {
      console.log('Multicast failed:', error);
      return { success: false, error: error.message };
    }
  }

  // SEND TO TOPIC 
  async sendToTopic(topic, payload) {
    try {
      const response = await admin.messaging().send({
        topic: topic,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      });
      
      return { success: true, messageId: response };

    } catch (error) {
      console.log(`Topic notification failed:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();