const admin = require('firebase-admin');
const serviceAcc = require('../../calorify-firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAcc),
});

const auth = admin.auth();
const db = admin.firestore();

module.exports = {admin, auth, db};