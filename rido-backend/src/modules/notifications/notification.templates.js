const TEMPLATES = {
  OTP: {
    en: (p) => `Your Rido OTP is ${p.otp}. Valid for 10 minutes. Do not share.`,
    ta: (p) => `உங்கள் Rido OTP: ${p.otp}. 10 நிமிடங்கள் செல்லுபடியாகும். பகிர வேண்டாம்.`,
  },
  RIDE_CONFIRMED: {
    en: (p) => `Rido ride confirmed! Your pickup OTP is ${p.otp}. Share with driver at pickup.`,
    ta: (p) => `Rido பயணம் உறுதி! பிக்அப் OTP: ${p.otp}. ஓட்டுநரிடம் காட்டுங்கள்.`,
  },
  DRIVER_ASSIGNED: {
    en: (p) => `${p.driverName} is coming in ${p.vehicleNumber} (${p.vehicleColor}). OTP: ${p.otp}`,
    ta: (p) => `${p.driverName} வருகிறார். வாகனம்: ${p.vehicleNumber}. OTP: ${p.otp}`,
  },
  DRIVER_ARRIVING: {
    en: (p) => `Your Rido driver ${p.driverName} is arriving now.`,
    ta: (p) => `உங்கள் Rido ஓட்டுநர் ${p.driverName} வந்து கொண்டிருக்கிறார்.`,
  },
  RIDE_STARTED: {
    en: () => 'Your Rido ride has started. Have a safe journey!',
    ta: () => 'உங்கள் Rido பயணம் தொடங்கியது. பாதுகாப்பாக பயணியுங்கள்!',
  },
  RIDE_COMPLETED: {
    en: (p) => `Ride completed. Fare: ₹${p.fare}. Distance: ${p.distanceKm} km. Thank you for riding with Rido!`,
    ta: (p) => `பயணம் முடிந்தது. கட்டணம்: ₹${p.fare}. தூரம்: ${p.distanceKm} கி.மீ. Rido-வை தேர்வு செய்ததற்கு நன்றி!`,
  },
  POOL_MATCHED: {
    en: (p) => `Pool matched! You saved ₹${p.savings} on your Rido ride.`,
    ta: (p) => `பூல் பொருத்தம்! உங்கள் Rido பயணத்தில் ₹${p.savings} சேமிப்பு.`,
  },
  RIDE_CONVERTED_SOLO: {
    en: () => 'No pool match found. Your Rido ride is now solo. Finding a driver...',
    ta: () => 'பூல் பொருத்தம் இல்லை. உங்கள் Rido பயணம் தனி பயணமாக மாற்றப்பட்டது.',
  },
  SOS_ALERT: {
    en: (p) => `SOS ALERT: ${p.riderName} needs help at https://maps.google.com/?q=${p.lat},${p.lng} during Rido ride.`,
    ta: (p) => `அவசர எச்சரிக்கை: ${p.riderName} Rido பயணத்தில் உதவி தேவை. இடம்: ${p.lat},${p.lng}`,
  },
  ROUTE_DEVIATION: {
    en: () => 'Your Rido ride has deviated from the planned route. Are you safe? Tap SOS if you need help.',
    ta: () => 'உங்கள் Rido பயணம் திட்டமிட்ட பாதையிலிருந்து விலகியுள்ளது. நீங்கள் பாதுகாப்பாக இருக்கிறீர்களா?',
  },
  PAYMENT_FAILED: {
    en: (p) => `Payment of ₹${p.amount} failed for your Rido ride. We will retry automatically.`,
    ta: (p) => `₹${p.amount} கட்டணம் தோல்வி. மீண்டும் முயற்சிக்கப்படும்.`,
  },
};

function getTemplate(key, language = 'ta', params = {}) {
  const template = TEMPLATES[key];
  if (!template) return '';
  const fn = template[language] || template.en;
  return fn(params);
}

module.exports = { TEMPLATES, getTemplate };
