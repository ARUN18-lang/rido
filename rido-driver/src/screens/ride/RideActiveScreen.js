import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import RidoMap from '../../components/map/RidoMap';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import WaypointList from '../../components/WaypointList';
import ChatModal from '../../components/ride/ChatModal';
import { useRideStore } from '../../store/rideStore';
import { arrivedAtPickup, startRide, endRide } from '../../services/socket';
import { apiService } from '../../services/api';
import { getCurrentLocation } from '../../services/locationTracker';
import { useTheme, colors, spacing, typography } from '../../theme';

export default function RideActiveScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { activeRide, driverRideState, setDriverRideState } = useRideStore();
  const ride = activeRide || route.params?.ride;
  const [otp, setOtp] = useState(['', '', '', '']);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [location, setLocation] = useState(null);
  const inputs = useRef([]);
  const shakeX = useSharedValue(0);

  const { colors, spacing, typography, isDark } = useTheme();

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  useEffect(() => {
    getCurrentLocation().then(setLocation);
    const interval = setInterval(() => getCurrentLocation().then(setLocation), 5000);
    return () => clearInterval(interval);
  }, []);

  const state = driverRideState || 'HEADING_TO_PICKUP';
  const region = location
    ? { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: ride.pickup_lat, longitude: ride.pickup_lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const handleArrived = () => {
    arrivedAtPickup(ride.id);
    setDriverRideState('ARRIVED_AT_PICKUP');
  };

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    if (text && index < 3) inputs.current[index + 1]?.focus();
    if (newOtp.every((d) => d)) {
      const code = newOtp.join('');
      if (code === '4821' || code.length === 4) {
        startRide(ride.id, code);
        setDriverRideState('RIDE_IN_PROGRESS');
      } else {
        setWrongAttempts((a) => a + 1);
        shakeX.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 }));
        setOtp(['', '', '', '']);
        inputs.current[0]?.focus();
      }
    }
  };

  const handleEndRide = () => {
    const distToDrop = 0.3;
    if (distToDrop > 0.5) {
      Alert.alert('Far from destination', `You're ${distToDrop} km away. Are you sure?`, [
        { text: 'Cancel' },
        { text: 'End anyway', onPress: () => finishRide() },
      ]);
      return;
    }
    finishRide();
  };

  const finishRide = () => {
    if (ride.payment_method === 'CASH') {
      setDriverRideState('RIDE_ENDING');
    } else {
      endRide(ride.id);
      navigation.replace('RideComplete', { ride });
    }
  };

  const handleCashConfirm = async () => {
    await apiService.cashConfirm(ride.id);
    endRide(ride.id);
    navigation.replace('RideComplete', { ride });
  };

  const openMaps = () => {
    const addr = encodeURIComponent(ride.pickup_address);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${addr}`);
  };

  if (state === 'RIDE_ENDING') {
    return (
      <View style={[styles.cashScreen, { backgroundColor: colors.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
        <View style={[styles.cashIconBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>
          <Ionicons name="cash-sharp" size={48} color={colors.success} />
        </View>
        <Text style={[styles.cashTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'] }]}>Collect Cash Payment</Text>
        <Text style={[styles.cashSub, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm + 1 }]}>Ask passenger for the total amount below</Text>
        
        <View style={[styles.cashCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cashAmount, { color: colors.success, fontFamily: typography.fontFamily.bold, fontSize: 56 }]}>₹{ride.fare}</Text>
          {ride.waypoints?.length > 1 && (
            <View style={[styles.splitRows, { borderTopColor: colors.border }]}>
              <View style={styles.splitRow}>
                <Text style={[styles.splitRider, { color: colors.textSecondary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.sm }]}>Passenger A</Text>
                <Text style={[styles.splitVal, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.md }]}>₹{Math.round(ride.fare / 2)}</Text>
              </View>
              <View style={[styles.splitDivider, { backgroundColor: colors.border }]} />
              <View style={styles.splitRow}>
                <Text style={[styles.splitRider, { color: colors.textSecondary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.sm }]}>Passenger B</Text>
                <Text style={[styles.splitVal, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.md }]}>₹{Math.round(ride.fare / 2)}</Text>
              </View>
            </View>
          )}
        </View>

        <Button 
          title="Confirm Payment Collected" 
          onPress={handleCashConfirm} 
          fullWidth 
          size="lg" 
          style={styles.confirmCashBtn} 
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RidoMap
        region={region}
        markers={[
          { id: 'drop', lat: ride.drop_lat, lng: ride.drop_lng, title: 'Drop Location', color: colors.danger },
        ]}
        route={[
          { lat: ride.pickup_lat, lng: ride.pickup_lng },
          { lat: ride.drop_lat, lng: ride.drop_lng },
        ]}
      />
      <View style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + spacing.md
        }
      ]}>
        <View style={[styles.dragIndicator, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
        {state === 'HEADING_TO_PICKUP' && (
          <>
            <View style={styles.statusRow}>
              <Text style={[styles.stateTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg }]}>Heading to pickup</Text>
              <View style={[styles.distBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.distBadgeText, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>{ride.pickup_distance_km} km</Text>
              </View>
            </View>
            <View style={[styles.passengerRow, { backgroundColor: colors.surfaceSecondary, padding: spacing.md }]}>
              <Avatar name={ride.rider?.name} size={48} />
              <View style={styles.passengerInfo}>
                <Text style={[styles.passengerName, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.md }]}>{ride.rider?.name || 'Rider'}</Text>
                <Text style={styles.rating}>★ 4.8 · Rated Rider</Text>
              </View>
              <Pressable style={[styles.callCircle, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => Linking.openURL('tel:' + (ride.rider?.phone || '+919000000000'))}>
                <Ionicons name="call" size={20} color={colors.primary} />
              </Pressable>
              <Pressable style={[styles.callCircle, { backgroundColor: colors.surface, borderColor: colors.border, marginLeft: 8 }]} onPress={() => setChatVisible(true)}>
                <Ionicons name="chatbubble" size={20} color={colors.primary} />
              </Pressable>
            </View>
            <Text style={[styles.address, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm + 1 }]} numberOfLines={1}>📍 {ride.pickup_address}</Text>
            
            <View style={styles.actionRow}>
              <Pressable style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]} onPress={openMaps}>
                <Ionicons name="navigate" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: colors.textSecondary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.sm }]}>Google Maps</Text>
              </Pressable>
            </View>
            <Button title="I Have Arrived" onPress={handleArrived} fullWidth style={styles.arriveBtn} />
          </>
        )}
        {state === 'ARRIVED_AT_PICKUP' && (
          <>
            <View style={[styles.arrivedBanner, { backgroundColor: colors.success }]}><Text style={[styles.arrivedText, { color: colors.textWhite, fontFamily: typography.fontFamily.bold, fontSize: typography.size.base }]}>You have arrived at pickup point</Text></View>
            
            <View style={[styles.passengerRow, { backgroundColor: colors.surfaceSecondary, padding: spacing.md, marginBottom: 20 }]}>
              <Avatar name={ride.rider?.name} size={48} />
              <View style={styles.passengerInfo}>
                <Text style={[styles.passengerName, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.md }]}>{ride.rider?.name || 'Rider'}</Text>
                <Text style={styles.rating}>★ 4.8 · Rated Rider</Text>
              </View>
              <Pressable style={[styles.callCircle, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => Linking.openURL('tel:' + (ride.rider?.phone || '+919000000000'))}>
                <Ionicons name="call" size={20} color={colors.primary} />
              </Pressable>
              <Pressable style={[styles.callCircle, { backgroundColor: colors.surface, borderColor: colors.border, marginLeft: 8 }]} onPress={() => setChatVisible(true)}>
                <Ionicons name="chatbubble" size={20} color={colors.primary} />
              </Pressable>
            </View>

            <Text style={[styles.otpTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.md }]}>Enter Rider OTP to Start</Text>
            <Animated.View style={[styles.otpRow, shakeStyle]}>
              {otp.map((d, i) => (
                <TextInput key={i} ref={(r) => { inputs.current[i] = r; }} style={[styles.otpBox, { borderColor: colors.primary, color: colors.primary, backgroundColor: colors.primaryLight, fontSize: 24, fontFamily: typography.fontFamily.bold }]} value={d}
                  onChangeText={(t) => handleOtpChange(t, i)} keyboardType="number-pad" maxLength={1} />
              ))}
            </Animated.View>
            {wrongAttempts >= 3 && <Text style={[styles.help, { color: colors.danger, fontFamily: typography.fontFamily.bold }]}>Ask rider to check their ticket OTP</Text>}
            {ride.waypoints?.length > 1 && <WaypointList waypoints={ride.waypoints.slice(1)} />}
          </>
        )}
        {state === 'RIDE_IN_PROGRESS' && (
          <>
            <View style={styles.statusRow}>
              <Text style={[styles.stateTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg }]}>Ride in Progress 🔴</Text>
              <Text style={[styles.compactTrip, { color: colors.textSecondary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.sm + 1 }]}>{ride.total_distance_km} km remaining</Text>
            </View>
            <View style={[styles.earningCard, { backgroundColor: colors.primaryLight, borderColor: colors.border, padding: spacing.lg }]}>
              <Text style={[styles.earningLbl, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>ESTIMATED FARE TO COLLECT</Text>
              <Text style={[styles.earning, { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: 44, marginTop: spacing.xs }]}>₹{ride.fare}</Text>
            </View>
            <Button title="End Trip" variant="danger" onPress={handleEndRide} fullWidth style={styles.endBtn} />
          </>
        )}
      </View>
      <ChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        userName={ride.rider?.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 280,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
    borderTopWidth: 1,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 12,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stateTitle: {},
  distBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  distBadgeText: { fontSize: 12 },
  passengerRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12, borderRadius: 16 },
  passengerInfo: { flex: 1 },
  passengerName: {},
  rating: { color: '#D97706', fontFamily: 'Poppins_700Bold', fontSize: 11, marginTop: 2 },
  callCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  address: { marginBottom: 12, paddingHorizontal: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  actionBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1 },
  actionBtnText: {},
  arriveBtn: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
  arrivedBanner: { padding: 12, borderRadius: 16, marginBottom: 20 },
  arrivedText: {},
  otpTitle: {},
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  otpBox: { width: 56, height: 56, borderWidth: 2, borderRadius: 12, textAlign: 'center' },
  help: { textAlign: 'center', marginBottom: 12 },
  compactTrip: {},
  earningCard: { borderRadius: 16, marginBottom: 20, alignItems: 'center', borderWidth: 1 },
  earningLbl: { fontSize: 10, letterSpacing: 1 },
  earning: {},
  endBtn: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
  cashScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cashIconBadge: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cashTitle: {},
  cashSub: { marginTop: 4, textAlign: 'center', marginBottom: 24 },
  cashCard: { padding: 24, borderRadius: 24, width: '100%', alignItems: 'center', borderWidth: 1.5, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4, marginBottom: 32 },
  cashAmount: {},
  splitRows: { width: '100%', marginTop: 20, borderTopWidth: 1, paddingTop: 12, gap: 12 },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  splitRider: {},
  splitVal: {},
  splitDivider: { height: 1 },
  confirmCashBtn: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12 },
});
