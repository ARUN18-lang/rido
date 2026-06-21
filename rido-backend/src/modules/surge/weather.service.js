const { getRedis } = require('../../config/redis');
const logger = require('../../utils/logger');

async function fetchWeatherSeverity(lat, lng) {
  const redis = getRedis();
  // Round coordinates to 4 decimal places (~11m precision) to optimize cache hit rate
  const latKey = Number(lat).toFixed(4);
  const lngKey = Number(lng).toFixed(4);
  const cacheKey = `weather:${latKey}:${lngKey}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return parseFloat(cached);
    }
  } catch (err) {
    logger.warn('Failed to read weather cache', { error: err.message });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    logger.warn('OPENWEATHER_API_KEY not configured, using default weather severity 0.0');
    return 0.0;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeather API returned status ${response.status}`);
    }
    const data = await response.json();

    let severity = 0.0;
    const weatherId = data.weather?.[0]?.id;
    const weatherMain = data.weather?.[0]?.main;

    if (weatherId) {
      // 2xx: Thunderstorm
      if (weatherId >= 200 && weatherId < 300) {
        severity = 1.0;
      } 
      // 502, 503, 504: Heavy/Very Heavy/Extreme rain
      else if (weatherId === 502 || weatherId === 503 || weatherId === 504 || weatherId === 522) {
        severity = 0.7;
      } 
      // 3xx: Drizzle, 5xx: Rain
      else if ((weatherId >= 300 && weatherId < 400) || (weatherId >= 500 && weatherId < 600)) {
        severity = 0.3;
      }
    } else if (weatherMain) {
      const mainLower = weatherMain.toLowerCase();
      if (mainLower.includes('storm') || mainLower.includes('thunder') || mainLower.includes('cyclone') || mainLower.includes('tornado')) {
        severity = 1.0;
      } else if (mainLower.includes('heavy') && mainLower.includes('rain')) {
        severity = 0.7;
      } else if (mainLower.includes('rain') || mainLower.includes('drizzle') || mainLower.includes('shower')) {
        severity = 0.3;
      }
    }

    const temp = data.main?.temp;
    if (temp && temp > 40) {
      severity += 0.3;
    }

    // Clamp to 0.0 - 1.0
    severity = Math.max(0, Math.min(1.0, severity));

    try {
      await redis.set(cacheKey, severity.toString(), 'EX', 900); // 15 mins TTL
    } catch (cacheErr) {
      logger.warn('Failed to cache weather severity', { error: cacheErr.message });
    }

    return severity;
  } catch (err) {
    logger.warn('Weather API lookup failed, returning default severity 0.0', { error: err.message });
    return 0.0;
  }
}

module.exports = {
  fetchWeatherSeverity,
};
