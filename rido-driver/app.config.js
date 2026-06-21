export default {
  expo: {
    name: 'Rido Driver',
    slug: 'rido-driver',
    scheme: 'rido-driver',
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
      bundleIdentifier: 'com.rido.driver',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'Rido needs your location to receive ride requests.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'Rido tracks your location while online to match you with riders.',
        UIBackgroundModes: ['location'],
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#6C63FF',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
      },
      package: 'com.rido.driver',
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'VIBRATE',
      ],
      config: {
        googleMaps: {
          apiKey: 'AIzaSyCHeOKheKlqTa1_uFl5ZMbLaL0f3u5S9io',
        },
      },
    },
    plugins: [
      'expo-font',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow Rido to track your location while online.',
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
      'expo-notifications',
      'expo-image-picker',
    ],
    extra: {
      USE_MOCK_API: false,
      API_BASE_URL: 'http://localhost:3000/api/v1',
      SOCKET_URL: 'http://localhost:3000',
    },
  },
};
