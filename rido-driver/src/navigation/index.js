import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Loader from '../components/ui/Loader';
import { useAuthStore } from '../store/authStore';
import { useRideStore } from '../store/rideStore';
import { KYC_STATUS } from '../constants/ride';
import AuthNavigator from './AuthNavigator';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { colorsLight, colorsDark } from '../theme';
import RideHistoryScreen from '../screens/profile/RideHistoryScreen';
import WalletScreen from '../screens/profile/WalletScreen';
import EmergencyContactsScreen from '../screens/profile/EmergencyContactsScreen';
import SOSScreen from '../screens/safety/SOSScreen';
import '../i18n';

const Stack = createNativeStackNavigator();

function loadKYCNavigator() {
  return require('./KYCNavigator').default;
}

function loadMainNavigator() {
  return require('./MainNavigator').default;
}

export default function RootNavigator() {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const driver = useAuthStore((s) => s.driver);
  const activeRide = useRideStore((s) => s.activeRide);
  const themeMode = useAppStore((s) => s.themeMode) || 'light';

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  if (!hydrated) {
    return <Loader fullScreen />;
  }

  const kycApproved = driver?.kyc_status === KYC_STATUS.APPROVED;

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
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !kycApproved ? (
          <Stack.Screen name="KYC" component={loadKYCNavigator()} />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={loadMainNavigator()}
              initialRouteName={activeRide ? 'RideActive' : 'Home'}
            />
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
