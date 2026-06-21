import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import RidoMap from '../../components/map/RidoMap';
import Avatar from '../../components/ui/Avatar';
import ChatModal from '../../components/ride/ChatModal';
import { useRide } from '../../hooks/useRide';
import { useRideStore } from '../../store/rideStore';
import { onDriverLocation, onRideComplete, onRouteDeviation } from '../../services/socket';
import { useTheme, colors, spacing, typography } from '../../theme';

export default function RideActiveScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { activeRide, driverLocation } = useRide();
  const updateDriverLocation = useRideStore((s) => s.updateDriverLocation);
  const [sosActive, setSosActive] = useState(false);
  const [sosProgress, setSosProgress] = useState(0);
  const [deviation, setDeviation] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const progress = useSharedValue(0.15);

  const { colors, spacing, typography, isDark } = useTheme();

  const ride = activeRide;
  const status = ride?.status;
  const isPickedUp = ['IN_PROGRESS', 'COMPLETED'].includes(status);

  useEffect(() => {
    if (!ride?.id) {
      navigation.replace('Main');
      return;
    }
    const unsubLoc = onDriverLocation((loc) => updateDriverLocation(loc));
    const unsubComplete = onRideComplete(() => {
      navigation.replace('RideSummary', { ride });
    });
    const unsubDev = onRouteDeviation(() => setDeviation(true));
    return () => {
      unsubLoc?.();
      unsubComplete?.();
      unsubDev?.();
    };
  }, [ride?.id]);

  useEffect(() => {
    if (isPickedUp) {
      progress.value = withTiming(0.65, { duration: 1500 });
    } else {
      progress.value = withTiming(0.25, { duration: 1500 });
    }
  }, [isPickedUp]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const handleSosPressIn = () => {
    const interval = setInterval(() => {
      setSosProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setSosActive(true);
          return 100;
        }
        return p + 10;
      });
    }, 150);
    handleSosPressIn._interval = interval;
  };

  const handleSosPressOut = () => {
    clearInterval(handleSosPressIn._interval);
    setSosProgress(0);
  };

  const markers = [
    !isPickedUp && { id: 'pickup', lat: ride.pickup_lat, lng: ride.pickup_lng, title: 'Pickup', color: colors.primary },
    { id: 'drop', lat: ride.drop_lat, lng: ride.drop_lng, title: 'Drop', color: colors.danger },
  ].filter(Boolean);

  const route = [
    { lat: ride.pickup_lat, lng: ride.pickup_lng },
    { lat: ride.drop_lat, lng: ride.drop_lng },
  ];

  if (sosActive) {
    return (
      <View style={[styles.sosOverlay, { backgroundColor: colors.danger }]}>
        <View style={styles.sosAlertCircle}>
          <Ionicons name="shield-checkmark" size={64} color="#FFF" />
        </View>
        <Text style={[styles.sosTitle, { color: colors.textWhite }]}>SOS Activated</Text>
        <Text style={styles.sosSub}>Your real-time location has been sent to your emergency contact and security dispatch.</Text>
        
        <View style={styles.sosActionCard}>
          <Pressable style={styles.sosCancel} onPress={() => setSosActive(false)}>
            <Text style={[styles.sosCancelText, { color: colors.textWhite }]}>Cancel SOS Alert</Text>
          </Pressable>
          <Pressable style={styles.call112}>
            <Ionicons name="call" size={20} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.call112Text, { color: colors.danger }]}>Emergency Support</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RidoMap
        region={{
          latitude: driverLocation?.lat || ride.pickup_lat,
          longitude: driverLocation?.lng || ride.pickup_lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        markers={markers}
        route={route}
      />
      <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <Pressable style={[styles.backCircle, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={[
          styles.brandContainer,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            borderColor: colors.border
          }
        ]}>
          <Text style={[styles.brand, { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.base }]}>Trip Active</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <Pressable
        style={[styles.sosBtn, { top: insets.top + 80, backgroundColor: colors.danger }]}
        onPressIn={handleSosPressIn}
        onPressOut={handleSosPressOut}
      >
        <Ionicons name="alert-circle" size={24} color="#FFF" style={{ zIndex: 2 }} />
        <Text style={[styles.sosBtnText, { color: colors.textWhite }]}>SOS</Text>
        {sosProgress > 0 && <View style={[styles.sosFill, { height: `${sosProgress}%` }]} />}
      </Pressable>
      <Pressable
        style={[styles.shieldBtn, { top: insets.top + 148, backgroundColor: colors.success }]}
        onPress={() => navigation.navigate('EmergencyContacts')}
      >
        <Ionicons name="shield-checkmark" size={24} color="#FFF" />
        <Text style={[styles.shieldBtnText, { color: colors.textWhite }]}>SAFETY</Text>
      </Pressable>
      {deviation && (
        <View style={[styles.deviation, { top: insets.top + 80, backgroundColor: isDark ? '#78350F' : '#FEF3C7', borderColor: isDark ? '#B45309' : '#FCD34D' }]}>
          <Ionicons name="warning" size={18} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={[styles.deviationText, { color: isDark ? '#FBBF24' : '#D97706' }]}>Route deviation detected</Text>
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
        <View style={[styles.dragIndicator, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
        <Text style={[styles.status, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.md + 1 }]}>
          {isPickedUp ? 'Heading to your destination' : 'Driver on the way to pickup'}
        </Text>
        <View style={styles.routeMini}>
          <View style={styles.badgeRow}>
            <View style={[styles.timeBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="time" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.timeBadgeText, { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.xs + 1 }]}>{ride.duration_min} min</Text>
            </View>
            <Text style={[styles.routeMiniText, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm }]}>{ride.distance_km} km remaining</Text>
          </View>
        </View>
        {ride.driver && (
          <View style={[styles.driverRow, { borderTopColor: colors.border }]}>
            <Avatar name={ride.driver.name} size={48} />
            <View style={styles.driverInfoCol}>
              <Text style={[styles.driverName, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.md }]}>{ride.driver.name}</Text>
              <Text style={[styles.vehicle, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm }]}>
                {ride.driver.vehicle?.registration_number || 'TN 58 AB 1234'}
              </Text>
            </View>
            <View style={[styles.ratingBadge, { backgroundColor: isDark ? '#78350F' : '#FEF3C7', marginRight: 4 }]}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingVal}>4.8</Text>
            </View>
            <View style={styles.driverActions}>
              <Pressable
                style={[styles.driverActionCircle, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => Linking.openURL('tel:' + ride.driver.phone)}
              >
                <Ionicons name="call" size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                style={[styles.driverActionCircle, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setChatVisible(true)}
              >
                <Ionicons name="chatbubble" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        )}
        {ride.pool && !isPickedUp && (
          <View style={[styles.poolBanner, { backgroundColor: isDark ? '#78350F' : '#FEF3C7', borderColor: isDark ? '#B45309' : '#FCD34D' }]}>
            <Ionicons name="people" size={16} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={[styles.poolText, { color: isDark ? '#FBBF24' : '#D97706', fontFamily: typography.fontFamily.bold, fontSize: typography.size.xs + 1 }]}>Shared Trip · Picking up co-riders</Text>
          </View>
        )}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary }, progressStyle]} />
        </View>
      </View>
      <ChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        userName={ride.driver?.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  brandContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  brand: {},
  sosBtn: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  sosBtnText: { fontWeight: 'bold', fontSize: 10, zIndex: 2, marginTop: 1 },
  sosFill: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1 },
  deviation: {
    position: 'absolute',
    left: 16,
    right: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviationText: { fontWeight: 'bold' },
  shieldBtn: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  shieldBtnText: { fontWeight: 'bold', fontSize: 8, marginTop: 1 },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 220,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
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
  status: {},
  routeMini: { marginTop: 4, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timeBadgeText: {},
  routeMiniText: {},
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, paddingTop: 12 },
  driverInfoCol: { flex: 1 },
  driverName: {},
  vehicle: { marginTop: 2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  ratingStar: { color: '#D97706', fontSize: 12 },
  ratingVal: { fontWeight: 'bold', fontSize: 11, color: '#D97706' },
  driverActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  driverActionCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  poolBanner: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginTop: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  poolText: {},
  progressTrack: { height: 6, borderRadius: 3, marginTop: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  sosOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sosAlertCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#FFF' },
  sosTitle: { fontWeight: 'bold', fontSize: 32, textAlign: 'center' },
  sosSub: { fontWeight: 'medium', fontSize: 16, color: 'rgba(255, 255, 255, 0.85)', marginTop: 12, textAlign: 'center', lineHeight: 22 },
  sosActionCard: { width: '100%', gap: 12, marginTop: 32 },
  sosCancel: { paddingVertical: 12, borderWidth: 1.5, borderColor: '#FFF', borderRadius: 16, alignItems: 'center' },
  sosCancelText: { fontWeight: 'bold', fontSize: 16 },
  call112: { paddingVertical: 12, backgroundColor: '#FFF', borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  call112Text: { fontWeight: 'bold', fontSize: 16 },
});
