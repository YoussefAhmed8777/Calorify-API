const admin = require('firebase-admin');
const serviceAcc = require('../../calorify-firebase-service-account.json');

// This line does the actual authentication with Google's servers:
// The connection is established once and reused for all future calls
admin.initializeApp({
  credential: admin.credential.cert(serviceAcc), // It tells Firebase "Here's my proof of identity"
  
  // What happens here:
  // Firebase reads your service account file
  // It creates an encrypted connection to Google's servers
  // It gets temporary access tokens (refreshed automatically)
  // Your app can now make admin API calls
});

// This creates a helper object for all authentication operations ex: auth.createUser()
const auth = admin.auth();

// This creates a connection to Firestore for using notifications
const db = admin.firestore();

module.exports = {admin, auth, db};