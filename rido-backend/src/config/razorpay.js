const Razorpay = require('razorpay');
const config = require('./index');

let razorpayInstance = null;

function getRazorpay() {
  if (!razorpayInstance && config.razorpay.keyId && config.razorpay.keySecret) {
    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpayInstance;
}

module.exports = { getRazorpay };
