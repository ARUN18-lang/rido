import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { setNavigationRef } from '../services/api';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import RideNavigator from './RideNavigator';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import RideHistoryScreen from '../screens/profile/RideHistoryScreen';
import WalletScreen from '../screens/profile/WalletScreen';
import EmergencyContactsScreen from '../screens/profile/EmergencyContactsScreen';
import SOSScreen from '../screens/safety/SOSScreen';
import { useSocket } from '../hooks/useSocket';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { colorsLight, colorsDark } from '../theme';
import '../i18n';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const needsProfile = isLoggedIn && user && !user.name;
  const themeMode = useAppStore((s) => s.themeMode) || 'light';
  useSocket();

  const navigationTheme = {
    ...(themeMode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(themeMode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: themeMode === 'dark' ? colorsDark.background : colorsLight.background,
      card: themeMode === 'dark' ? colorsDark.surface : colorsLight.surface,
      text: themeMode === 'dark' ? colorsDark.textPrimary : colorsLight.textPrimary,
      border: themeMode === 'dark' ? colorsDark.border : colorsLight.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme} ref={(ref) => setNavigationRef(ref)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : needsProfile ? (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen name="RideFlow" component={RideNavigator} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
            <Stack.Screen name="SOS" component={SOSScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
