import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import RidoMap from '../../components/map/RidoMap';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import FareBreakdown from '../../components/ride/FareBreakdown';
import VehicleCard from '../../components/ride/VehicleCard';
import { useAuth } from '../../hooks/useAuth';
import { useRideStore } from '../../store/rideStore';
import { apiService } from '../../services/api';
import { RIDE_MODE, VEHICLE_TYPES } from '../../constants/ride';
import { useTheme, colors, spacing, typography } from '../../theme';

export default function RideOptionsScreen({ navigation, route }) {
  const { pickup, drop, mode: initialMode, is_womens_ride: initialWomens } = route.params;
  const { t } = useTranslation();
  const { user } = useAuth();
  const setBookingDraft = useRideStore((s) => s.setBookingDraft);
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState(initialMode || RIDE_MODE.SOLO);
  const [womensRide, setWomensRide] = useState(initialWomens || false);
  const [vehicleType, setVehicleType] = useState('MINI_CAR');
  const [fare, setFare] = useState(null);
  const [showSurge, setShowSurge] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);

  const { colors, spacing, typography, isDark } = useTheme();

  const activeIndex = useSharedValue(0);

  useEffect(() => {
    activeIndex.value = withSpring(mode === RIDE_MODE.SOLO ? 0 : 1, { damping: 15, stiffness: 120 });
  }, [mode]);

  useEffect(() => {
    loadFare();
  }, [vehicleType, mode]);

  const loadFare = async () => {
    const { data } = await apiService.estimateFare({
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      drop_lat: drop.lat,
      drop_lng: drop.lng,
      vehicle_type: vehicleType,
      mode,
    });
    if (data?.data) setFare(data.data);
  };

  const selectedVehicle = VEHICLE_TYPES.find((v) => v.id === vehicleType);

  const handleBook = () => {
    const draft = {
      pickup,
      drop,
      mode,
      is_womens_ride: womensRide,
      vehicle_type: vehicleType,
      fare,
    };
    setBookingDraft(draft);
    navigation.navigate('BookingConfirm', { draft });
  };

  const routeCoords = [
    { lat: pickup.lat, lng: pickup.lng },
    { lat: drop.lat, lng: drop.lng },
  ];

  const slideStyle = useAnimatedStyle(() => {
    const tabWidth = (containerWidth - 8) / 2; // account for padding
    return {
      transform: [{ translateX: activeIndex.value * tabWidth }],
      width: tabWidth,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RidoMap
        region={{ latitude: pickup.lat, longitude: pickup.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        route={routeCoords}
        markers={[
          { id: 'p', lat: pickup.lat, lng: pickup.lng, title: 'Pickup', color: colors.primary },
          { id: 'd', lat: drop.lat, lng: drop.lng, title: 'Drop', color: colors.danger },
        ]}
        style={styles.map}
      />
      <View style={[
        styles.sheetContainer,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        }
      ]}>
        <View style={styles.sheetHeader}>
          <View style={[styles.dragIndicator, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
        </View>
        <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
          <View
            style={[styles.modeToggle, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            {containerWidth > 0 && (
              <Animated.View style={[styles.slidingPill, { backgroundColor: colors.surface, shadowColor: colors.primary }, slideStyle]} />
            )}
            {[RIDE_MODE.SOLO, RIDE_MODE.SHARED].map((m, idx) => (
              <Pressable
                key={m}
                style={styles.modeBtn}
                onPress={() => setMode(m)}
              >
                <Text style={[
                  styles.modeText,
                  { color: mode === m ? colors.primary : colors.textSecondary },
                  mode === m && { fontFamily: typography.fontFamily.bold }
                ]}>
                  {m === RIDE_MODE.SOLO ? `🚗 ${t('ride.solo')}` : `👥 ${t('ride.shared')}`}
                </Text>
              </Pressable>
            ))}
          </View>
          {mode === RIDE_MODE.SHARED && (
            <View style={styles.promoBadgeContainer}>
              <Badge label={t('ride.saveUpTo') || 'Save up to 50% on rides'} variant="success" />
            </View>
          )}

          {user?.gender === 'FEMALE' && (
            <View style={[
              styles.womensRow,
              { backgroundColor: colors.surfaceSecondary },
              womensRide && { backgroundColor: colors.pinkLight, borderColor: 'rgba(236, 72, 153, 0.15)' }
            ]}>
              <View style={styles.womensTextCol}>
                <Text style={[styles.womensTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>👩 {t('ride.womensRide')}</Text>
                <Text style={[styles.womensDesc, { color: colors.textSecondary }]}>{t('ride.womensRideDesc')}</Text>
              </View>
              <Switch
                value={womensRide}
                onValueChange={setWomensRide}
                trackColor={{ true: colors.pink }}
                thumbColor={womensRide ? colors.pink : '#FFF'}
              />
            </View>
          )}

          {fare?.surge_multiplier > 1 && showSurge && (
            <Pressable
              style={[
                styles.surge,
                {
                  backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                  borderColor: isDark ? '#B45309' : '#FCD34D'
                }
              ]}
              onPress={() => setShowSurge(false)}
            >
              <Text style={[styles.surgeText, { color: isDark ? '#FBBF24' : colors.warning, fontFamily: typography.fontFamily.bold }]}>
                ⚡ {t('ride.surge', { multiplier: fare.surge_multiplier })}
              </Text>
            </Pressable>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicles} contentContainerStyle={styles.vehiclesContent}>
            {VEHICLE_TYPES.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                fare={mode === RIDE_MODE.SOLO ? fare?.solo_fare : fare?.shared_fare_max}
                sharedFare={mode === RIDE_MODE.SHARED ? { min: fare?.shared_fare_min, max: fare?.shared_fare_max } : null}
                eta={fare?.eta_min || 3}
                selected={vehicleType === v.id}
                onPress={() => setVehicleType(v.id)}
              />
            ))}
          </ScrollView>

          {fare && (
            <FareBreakdown
              total={mode === RIDE_MODE.SOLO ? fare.solo_fare : `${fare.shared_fare_min}–${fare.shared_fare_max}`}
              items={[
                { label: 'Base fare', value: `₹${selectedVehicle?.baseFare}` },
                { label: 'Distance', value: `${fare.distance_km} km` },
                { label: 'Surge', value: `${fare.surge_multiplier}x` },
              ]}
            />
          )}

          <Button
            title={
              mode === RIDE_MODE.SOLO
                ? `Book Solo · ₹${fare?.solo_fare || '—'}`
                : `Book Shared · ₹${fare?.shared_fare_min || '—'}–${fare?.shared_fare_max || '—'}`
            }
            onPress={handleBook}
            fullWidth
            style={styles.bookBtn}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { height: '40%' },
  sheetContainer: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
    borderTopWidth: 1,
  },
  sheetHeader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  sheet: { flex: 1 },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 40 },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    position: 'relative',
    height: 52,
    alignItems: 'center',
    borderWidth: 1,
  },
  slidingPill: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modeBtn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  modeText: { fontSize: 16 },
  promoBadgeContainer: { marginBottom: 16, alignItems: 'flex-start' },
  womensRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  womensTextCol: { flex: 1, marginRight: 12 },
  womensTitle: { fontSize: 16 },
  womensDesc: { fontSize: 12, marginTop: 2 },
  surge: { padding: 12, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  surgeText: { fontSize: 14 },
  vehicles: { marginVertical: 16, height: 160 },
  vehiclesContent: { paddingVertical: 4 },
  bookBtn: { marginTop: 20 },
});
