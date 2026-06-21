const admin = require('firebase-admin');
const config = require('./index');
const logger = require('../utils/logger');

let firebaseApp = null;

function getFirebase() {
  if (!firebaseApp && config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        logger.warn('Firebase init failed', { error: err.message });
      } else {
        firebaseApp = admin.app();
      }
    }
  }
  return firebaseApp;
}

function getMessaging() {
  const app = getFirebase();
  return app ? admin.messaging() : null;
}

module.exports = { getFirebase, getMessaging };
