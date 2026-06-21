import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DestinationSearchScreen from '../screens/ride/DestinationSearchScreen';
import RideOptionsScreen from '../screens/ride/RideOptionsScreen';
import BookingConfirmScreen from '../screens/ride/BookingConfirmScreen';
import SearchingScreen from '../screens/ride/SearchingScreen';
import PoolMatchScreen from '../screens/ride/PoolMatchScreen';
import RideActiveScreen from '../screens/ride/RideActiveScreen';
import RideSummaryScreen from '../screens/ride/RideSummaryScreen';

const Stack = createNativeStackNavigator();

export default function RideNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DestinationSearch" component={DestinationSearchScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="RideOptions" component={RideOptionsScreen} />
      <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
      <Stack.Screen name="Searching" component={SearchingScreen} />
      <Stack.Screen name="PoolMatch" component={PoolMatchScreen} />
      <Stack.Screen name="RideActive" component={RideActiveScreen} />
      <Stack.Screen name="RideSummary" component={RideSummaryScreen} />
    </Stack.Navigator>
  );
}
