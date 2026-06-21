import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import KYCIntroScreen from '../screens/kyc/KYCIntroScreen';
import PersonalDetailsScreen from '../screens/kyc/PersonalDetailsScreen';
import DocumentUploadScreen from '../screens/kyc/DocumentUploadScreen';
import KYCPendingScreen from '../screens/kyc/KYCPendingScreen';

const Stack = createNativeStackNavigator();

export default function KYCNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="KYCIntro" component={KYCIntroScreen} />
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
      <Stack.Screen name="KYCPending" component={KYCPendingScreen} />
    </Stack.Navigator>
  );
}
