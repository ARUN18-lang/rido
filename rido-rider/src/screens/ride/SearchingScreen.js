import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import RidoMap from '../../components/map/RidoMap';
import Card from '../../components/ui/Card';
import DriverCard from '../../components/ride/DriverCard';
import ChatModal from '../../components/ride/ChatModal';
import { useRideStore } from '../../store/rideStore';
import {
  onDriverAssigned,
  onDriverArrived,
  onPoolMatched,
  onRideStatus,
  simulateMockRideFlow,
  joinRideRoom,
} from '../../services/socket';
import { apiService } from '../../services/api';
import { RIDE_STATUS } from '../../constants/ride';
import { DEFAULT_REGION } from '../../services/location';
import { useTheme, colors, spacing, typography } from '../../theme';

export default function SearchingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const ride = route.params?.ride;
  const { setActiveRide, updateRideStatus, setPool } = useRideStore();
  const [phase, setPhase] = useState(
    ride?.status === RIDE_STATUS.POOL_MATCHING ? 2 : 1
  );
  const [driver, setDriver] = useState(ride?.driver || null);
  const [otp, setOtp] = useState(ride?.otp || null);
  const [eta, setEta] = useState(4);
  const [poolTimer, setPoolTimer] = useState(272);
  const [arrived, setArrived] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const { colors, spacing, typography, isDark } = useTheme();

  const pulse1 = useSharedValue(1);
  const pulse2 = useSharedValue(1);
  const pulse3 = useSharedValue(1);

  useEffect(() => {
    pulse1.value = withRepeat(withTiming(1.8, { duration: 2000 }), -1, false);
    pulse2.value = withDelay(600, withRepeat(withTiming(1.8, { duration: 2000 }), -1, false));
    pulse3.value = withDelay(1200, withRepeat(withTiming(1.8, { duration: 2000 }), -1, false));
  }, []);

  useEffect(() => {
    if (!ride?.id) return;
    joinRideRoom(ride.id);
    const cleanup = simulateMockRideFlow(ride);

    const unsubPool = onPoolMatched((data) => {
      setPool(data.pool);
      navigation.navigate('PoolMatch', { ride, pool: data.pool });
    });

    const unsubAssigned = onDriverAssigned((data) => {
      setPhase(3);
      setDriver(data.driver);
      setOtp(data.otp || data.otp_code || null);
      setEta(data.eta_min || data.eta_minutes || data.eta || 0);
      updateRideStatus(RIDE_STATUS.DRIVER_ASSIGNED);
      setActiveRide({ ...ride, driver: data.driver, otp: data.otp || data.otp_code || null, status: RIDE_STATUS.DRIVER_ASSIGNED });
    });

    const unsubArrived = onDriverArrived(() => setArrived(true));
    const unsubStatus = onRideStatus((data) => {
      if (data.status === RIDE_STATUS.IN_PROGRESS) {
        navigation.replace('RideActive');
      }
    });

    return () => {
      cleanup();
      unsubPool?.();
      unsubAssigned?.();
      unsubArrived?.();
      unsubStatus?.();
    };
  }, [ride?.id]);

  useEffect(() => {
    if (phase !== 2) return;
    const interval = setInterval(() => setPoolTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const pulseStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1.value }],
    opacity: 1 - (pulse1.value - 1) / 0.8,
  }));

  const pulseStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2.value }],
    opacity: 1 - (pulse2.value - 1) / 0.8,
  }));

  const pulseStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse3.value }],
    opacity: 1 - (pulse3.value - 1) / 0.8,
  }));

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleCancel = async () => {
    await apiService.cancelRide(ride.id, 'User cancelled');
    navigation.popToTop();
  };

  const handleSkipSharing = async () => {
    setPhase(1);
    updateRideStatus(RIDE_STATUS.SEARCHING);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RidoMap region={DEFAULT_REGION} style={styles.map} />
      {phase < 3 && (
        <View style={styles.radarWrap} pointerEvents="none">
          <Animated.View style={[
            styles.radar,
            {
              borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.05)'
            },
            pulseStyle1
          ]} />
          <Animated.View style={[
            styles.radar,
            {
              borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.05)'
            },
            pulseStyle2
          ]} />
          <Animated.View style={[
            styles.radar,
            {
              borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.05)'
            },
            pulseStyle3
          ]} />
          <View style={[styles.radarCore, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
            <Ionicons name="search" size={24} color="#FFF" />
          </View>
        </View>
      )}
      <View style={[
        styles.bottom,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + spacing.md
        }
      ]}>
        {arrived && (
          <View style={[styles.arrivedBanner, { backgroundColor: colors.success }]}>
            <Text style={[styles.arrivedText, { color: colors.textWhite, fontFamily: typography.fontFamily.bold, fontSize: typography.size.base }]}>Your driver has arrived!</Text>
          </View>
        )}
        {phase === 1 && (
          <>
            <Text style={[styles.heading, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl }]}>Finding your ride...</Text>
            <Text style={[styles.sub, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.size.base }]}>Connecting you with the nearest driver.</Text>
          </>
        )}
        {phase === 2 && (
          <>
            <Text style={[styles.heading, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl }]}>Matching your pool...</Text>
            <Text style={[styles.timer, { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg, marginVertical: spacing.sm }]}>Pool closes in {formatTime(poolTimer)}</Text>
            <Card style={[styles.infoCard, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
              <Text style={[styles.infoText, { color: colors.primary, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm }]}>Why share? Save money, reduce congestion, and enjoy a sustainable ride.</Text>
            </Card>
            <Pressable onPress={handleSkipSharing}>
              <Text style={[styles.link, { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.base }]}>Skip and go solo</Text>
            </Pressable>
          </>
        )}
        {phase === 3 && driver && (
          <>
            <DriverCard
              driver={driver}
              eta={eta}
              onCancel={handleCancel}
              onCall={() => Linking.openURL('tel:' + driver.phone)}
              onMessage={() => setChatVisible(true)}
            />
            <ChatModal
              visible={chatVisible}
              onClose={() => setChatVisible(false)}
              userName={driver.name}
            />
            {otp && (
              <View style={[styles.ticketCard, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
                <View style={styles.ticketHeader}>
                  <Text style={[styles.otpLabel, { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: 11 }]}>SHARE OTP WITH DRIVER</Text>
                </View>
                <View style={styles.ticketSeparator}>
                  <View style={[styles.ticketCutoutLeft, { backgroundColor: colors.surface, borderColor: colors.border }]} />
                  <View style={[styles.dashedDivider, { borderColor: colors.border }]} />
                  <View style={[styles.ticketCutoutRight, { backgroundColor: colors.surface, borderColor: colors.border }]} />
                </View>
                <View style={styles.ticketBody}>
                  <Text style={[styles.otp, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>{otp}</Text>
                </View>
              </View>
            )}
          </>
        )}
        {phase < 3 && (
          <Card style={[styles.summary, { marginTop: spacing.md, padding: spacing.md }]}>
            <View style={styles.summaryRow}>
              <Ionicons name="swap-vertical" size={16} color={colors.primary} />
              <Text style={[styles.summaryText, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold }]} numberOfLines={1}>{ride?.pickup_address} → {ride?.drop_address}</Text>
            </View>
            <Text style={[styles.fare, { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl, marginTop: spacing.sm }]}>₹{ride?.fare_estimate}</Text>
          </Card>
        )}
        {phase < 3 && (
          <Pressable onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={[styles.cancel, { color: colors.danger, fontFamily: typography.fontFamily.bold, fontSize: typography.size.base }]}>Cancel Ride</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  radarWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  radar: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5 },
  radarCore: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  bottom: {
    padding: 16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
    borderTopWidth: 1,
  },
  heading: {},
  sub: { marginBottom: 12 },
  timer: {},
  infoCard: { marginVertical: 12 },
  infoText: {},
  link: { marginBottom: 12 },
  summary: {},
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1 },
  fare: {},
  cancelBtn: { paddingVertical: 12 },
  cancel: {},
  ticketCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    paddingVertical: 12,
  },
  ticketHeader: { alignItems: 'center', paddingBottom: 4 },
  otpLabel: { letterSpacing: 1.5 },
  ticketSeparator: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  dashedDivider: {
    width: '85%',
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  ticketBody: { alignItems: 'center', paddingTop: 4 },
  otp: { fontSize: 36, letterSpacing: 8, textAlign: 'center' },
  ticketCutoutLeft: { position: 'absolute', left: -10, width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  ticketCutoutRight: { position: 'absolute', right: -10, width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  arrivedBanner: { padding: 12, borderRadius: 16, marginBottom: 12 },
  arrivedText: {},
});
