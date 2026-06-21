const prisma = require('../../utils/prisma');
const { getMessaging } = require('../../config/firebase');
const config = require('../../config');
const logger = require('../../utils/logger');
const { getTemplate } = require('./notification.templates');
const { dispatchNotification } = require('../../queues');

async function sendPush(userId, { title, body, data = {} }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.fcm_token) {
    logger.debug('No FCM token for user', { userId });
    return { sent: false, reason: 'no_token' };
  }

  const messaging = getMessaging();
  if (!messaging) {
    logger.debug('Firebase not configured, skipping push', { userId });
    return { sent: false, reason: 'firebase_not_configured' };
  }

  try {
    await messaging.send({
      token: user.fcm_token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });
    return { sent: true };
  } catch (err) {
    logger.error('FCM send failed', { userId, error: err.message });
    return { sent: false, reason: err.message };
  }
}

async function sendSMS(phone, templateKey, params = {}, language = 'ta') {
  const message = getTemplate(templateKey, language, params);
  if (!message) return { sent: false };

  if (!config.msg91.apiKey) {
    logger.info('MSG91 not configured, SMS dev mode', { phone, message });
    return { sent: true, dev: true };
  }

  try {
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        authkey: config.msg91.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: config.msg91.senderId,
        template_id: config.msg91.otpTemplateId,
        short_url: '0',
        recipients: [{ mobiles: phone.replace('+', ''), message }],
      }),
    });
    return { sent: response.ok };
  } catch (err) {
    logger.error('SMS send failed', { phone, error: err.message });
    return { sent: false };
  }
}

async function sendToEmergencyContacts(userId, templateKey, params = {}, language = 'ta') {
  const contacts = await prisma.emergencyContact.findMany({ where: { user_id: userId } });
  const message = getTemplate(templateKey, language, params);
  const results = await Promise.all(contacts.map((c) => sendSMS(c.phone, null, { message }, language)));
  return results;
}

async function notifyUser(userId, { push, sms, templateKey, params, language }) {
  return dispatchNotification({ userId, push, sms, templateKey, params, language });
}

async function processNotificationJob({ userId, push, sms, templateKey, params, language = 'ta' }) {
  const results = {};
  if (push) {
    results.push = await sendPush(userId, push);
  }
  if (sms) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      results.sms = await sendSMS(user.phone, templateKey, params, language || user.preferred_language);
    }
  }
  return results;
}

module.exports = {
  sendPush,
  sendSMS,
  sendToEmergencyContacts,
  notifyUser,
  processNotificationJob,
};
