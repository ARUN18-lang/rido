import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RidoMap from '../../components/map/RidoMap';
import OnlineToggle from '../../components/OnlineToggle';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { useRideStore } from '../../store/rideStore';
import { useEarningsStore } from '../../store/earningsStore';
import { apiService } from '../../services/api';
import { startLocationTracking, stopLocationTracking, getCurrentLocation, DEFAULT_REGION } from '../../services/locationTracker';
import { simulateIncomingRide } from '../../services/socket';
import { useTheme, colors, spacing, typography } from '../../theme';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isOnline, setOnline, setIncomingRide, setZone, zone } = useRideStore();
  const { todayEarnings, todayTrips, setToday } = useEarningsStore();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const { colors, spacing, typography, isDark } = useTheme();

  useEffect(() => {
    getCurrentLocation().then(setLocation);
    apiService.getEarnings().then(({ data }) => {
      if (data?.data?.today) setToday(data.data.today.earnings, data.data.today.trips);
    });
    setZone({ name: 'Madurai Central', surge: 1.2 });
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    const cleanup = simulateIncomingRide((ride) => {
      setIncomingRide(ride);
      navigation.navigate('IncomingRide', { ride });
    });
    return cleanup;
  }, [isOnline]);

  const toggleOnline = async () => {
    setLoading(true);
    const loc = location || (await getCurrentLocation());
    const newStatus = !isOnline;
    await apiService.updateStatus(newStatus ? 'ONLINE' : 'OFFLINE', loc?.lat, loc?.lng);
    setOnline(newStatus);
    if (newStatus) await startLocationTracking();
    else await stopLocationTracking();
    setLoading(false);
  };

  const region = location
    ? { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : DEFAULT_REGION;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RidoMap
        region={region}
        showsUserLocation
        style={styles.map}
        surgeZone={isOnline && location ? { lat: location.lat, lng: location.lng, radius: 450 } : null}
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
        <OnlineToggle isOnline={isOnline} onToggle={toggleOnline} />
        <Text style={[styles.statusHeading, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], marginTop: spacing.md }]}>{isOnline ? 'You are Online' : 'You are Offline'}</Text>
        <Text style={[styles.statusSub, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium }]}>
          {isOnline ? 'Looking for passengers in your zone...' : 'Go online to start receiving ride requests'}
        </Text>
        
        <Card style={[styles.earningsCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={styles.earningsCol}>
            <Text style={[styles.earningsVal, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl }]}>₹{todayEarnings}</Text>
            <Text style={[styles.earningsLbl, { color: colors.textMuted }]}>TODAY'S EARNINGS</Text>
          </View>
          <View style={[styles.dividerEarnings, { backgroundColor: colors.border }]} />
          <View style={styles.earningsCol}>
            <Text style={[styles.earningsVal, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl }]}>{todayTrips}</Text>
            <Text style={[styles.earningsLbl, { color: colors.textMuted }]}>TODAY'S TRIPS</Text>
          </View>
        </Card>

        {isOnline && zone && (
          <View style={styles.zoneRow}>
            <Text style={[styles.zone, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm }]}>Active Zone: <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>{zone.name}</Text></Text>
            {zone.surge > 1 && <Badge label={`${zone.surge}x Surge 🔥`} variant="warning" />}
          </View>
        )}
        
        {!isOnline ? (
          <Button title="Go Online" onPress={toggleOnline} loading={loading} fullWidth style={styles.btn} />
        ) : (
          <Pressable onPress={toggleOnline} style={styles.offlineLink}>
            <Text style={[styles.offlineText, { color: colors.danger, fontFamily: typography.fontFamily.bold }]}>Go Offline</Text>
          </Pressable>
        )}
        <Pressable onPress={() => navigation.navigate('Earnings')} style={styles.earningsLink}>
          <Text style={[styles.earningsLinkText, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>View Earnings Dashboard →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 0.50 },
  panel: {
    flex: 0.50,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 10,
    borderTopWidth: 1,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    marginBottom: 12,
  },
  statusHeading: {},
  statusSub: { marginTop: 4, textAlign: 'center', fontSize: 15, paddingHorizontal: 8 },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginTop: 16,
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
  },
  earningsCol: { flex: 1, alignItems: 'center' },
  earningsVal: {},
  earningsLbl: { fontFamily: 'Poppins_700Bold', fontSize: 9, marginTop: 2, letterSpacing: 0.8 },
  dividerEarnings: { width: 1.5, height: 36 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  zone: {},
  btn: { marginTop: 16 },
  offlineLink: { marginTop: 16, alignSelf: 'center', paddingVertical: 8 },
  offlineText: { fontSize: 16 },
  earningsLink: { marginTop: 12, paddingVertical: 8 },
  earningsLinkText: { fontSize: 15 },
});
