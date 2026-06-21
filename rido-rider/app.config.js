export default {
  expo: {
    name: 'Rido',
    slug: 'rido-rider',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#6C63FF',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.rido.rider',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Rido needs your location to find nearby drivers and show your ride on the map.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#6C63FF',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
      },
      package: 'com.rido.rider',
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    },
    plugins: [
      'expo-font',
      'expo-secure-store',
      'expo-location',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#6C63FF',
        },
      ],
    ],
    extra: {
      USE_MOCK_API: false,
      API_BASE_URL: 'http://192.168.1.16:3000/api/v1',
      SOCKET_URL: 'http://192.168.1.16:3000',
      GOOGLE_MAPS_API_KEY: 'AIzaSyCHeOKheKlqTa1_uFl5ZMbLaL0f3u5S9io',
    },
  },
};
