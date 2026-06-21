import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import RidoMap from '../../components/map/RidoMap';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import BottomSheet from '../../components/ui/BottomSheet';
import { useRideStore } from '../../store/rideStore';
import { apiService } from '../../services/api';
import { PAYMENT_METHODS, VEHICLE_TYPES } from '../../constants/ride';
import { useTheme, colors, spacing, typography } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BookingConfirmScreen({ navigation, route }) {
  const { t } = useTranslation();
  const draft = route.params?.draft;
  const setActiveRide = useRideStore((s) => s.setActiveRide);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareTrip, setShareTrip] = useState(true);
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const vehicle = VEHICLE_TYPES.find((v) => v.id === draft?.vehicle_type);

  const handleConfirm = async () => {
    setLoading(true);
    const { data, error } = await apiService.createRide({
      pickup_address: draft.pickup.address,
      pickup_lat: draft.pickup.lat,
      pickup_lng: draft.pickup.lng,
      drop_address: draft.drop.address || draft.drop.name,
      drop_lat: draft.drop.lat,
      drop_lng: draft.drop.lng,
      mode: draft.mode,
      is_womens_ride: draft.is_womens_ride,
      vehicle_type: draft.vehicle_type,
      payment_method: paymentMethod,
    });
    setLoading(false);
    if (error) return;
    setActiveRide(data.data);
    navigation.replace('Searching', { ride: data.data });
  };

  const routeCoords = [
    { lat: draft.pickup.lat, lng: draft.pickup.lng },
    { lat: draft.drop.lat, lng: draft.drop.lng },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RidoMap
        region={{ latitude: draft.pickup.lat, longitude: draft.pickup.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        route={routeCoords}
        style={styles.map}
      />
      <View style={[styles.panel, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.addressRow}>
          <View style={[styles.dotViolet, { backgroundColor: colors.primary }]} />
          <Text style={[styles.address, { color: colors.textPrimary }]}>{draft.pickup.address}</Text>
        </View>
        <View style={styles.addressRow}>
          <View style={[styles.dotRed, { backgroundColor: colors.danger }]} />
          <Text style={[styles.address, { color: colors.textPrimary }]}>{draft.drop.name || draft.drop.address}</Text>
        </View>
        <Card style={styles.vehicleRow}>
          <Text style={{ color: colors.textPrimary, fontFamily: typography.fontFamily.medium }}>{vehicle?.icon} {vehicle?.name} · Up to {vehicle?.capacity}</Text>
        </Card>
        <Card style={styles.fareCard}>
          <Text style={[styles.fareLabel, { color: colors.textPrimary }]}>
            {draft.mode === 'SHARED'
              ? `You'll pay ₹${draft.fare?.shared_fare_min}–${draft.fare?.shared_fare_max}`
              : `₹${draft.fare?.solo_fare}`}
          </Text>
          {draft.mode === 'SHARED' && (
            <Text style={[styles.fareNote, { color: colors.textMuted }]}>Final fare depends on passengers matched</Text>
          )}
        </Card>
        <Pressable style={[styles.paymentRow, { borderBottomColor: colors.border }]} onPress={() => setShowPayment(true)}>
          <Text style={{ color: colors.textPrimary }}>💳 Payment: {paymentMethod}</Text>
          <Text style={[styles.change, { color: colors.primary }]}>Change</Text>
        </Pressable>
        <Pressable style={styles.shareRow} onPress={() => setShareTrip(!shareTrip)}>
          <Text style={{ color: colors.textPrimary }}>🛡️ Trip shared with emergency contact</Text>
          <Text style={{ color: colors.textPrimary }}>{shareTrip ? '✓' : ''}</Text>
        </Pressable>
        <Button title={t('ride.confirmBooking')} onPress={handleConfirm} loading={loading} fullWidth />
        <Text style={[styles.terms, { color: colors.textMuted }]}>{t('ride.cancelFree')}</Text>
      </View>
      <BottomSheet visible={showPayment} onClose={() => setShowPayment(false)} snapPoint={320}>
        {PAYMENT_METHODS.map((m) => (
          <Pressable
            key={m.id}
            style={[styles.paymentOption, { borderBottomColor: colors.border }]}
            onPress={() => { setPaymentMethod(m.id); setShowPayment(false); }}
          >
            <Text style={{ color: colors.textPrimary, fontFamily: typography.fontFamily.medium }}>{m.icon} {m.label}</Text>
            <Text style={[styles.paymentDesc, { color: colors.textMuted }]}>{m.description}</Text>
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { height: '35%' },
  panel: { flex: 1, padding: spacing.base, backgroundColor: colors.surface },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  dotViolet: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  address: { fontFamily: typography.fontFamily.medium, flex: 1, color: colors.textPrimary },
  vehicleRow: { marginBottom: spacing.md },
  fareCard: { marginBottom: spacing.md },
  fareLabel: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  fareNote: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textMuted, marginTop: 4 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  change: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
  shareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, marginBottom: spacing.md },
  terms: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
  paymentOption: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  paymentDesc: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textMuted },
});
