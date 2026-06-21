import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import { colors, spacing, typography } from '../../theme';

export default function DriverCard({ driver, eta, onCall, onMessage, onCancel }) {
  const vehicle = driver?.vehicle;
  const vehicleStr = vehicle
    ? `${vehicle.color} ${vehicle.make} ${vehicle.model} · ${vehicle.registration_number}`
    : '';

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar name={driver?.name} uri={driver?.profile_photo_url} size={56} />
        <View style={styles.info}>
          <Text style={styles.name}>{driver?.name}</Text>
          <Text style={styles.rating}>⭐ {driver?.rating} · {driver?.total_trips} trips</Text>
          <Text style={styles.vehicle}>{vehicleStr}</Text>
        </View>
      </View>
      {eta != null && (
        <Text style={styles.eta}>Arriving in {eta} min</Text>
      )}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={onCall}>
          <Text>📞 Call</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onMessage}>
          <Text>💬 Message</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={onCancel}>
          <Text style={styles.cancelText}>✕ Cancel</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.base },
  row: { flexDirection: 'row', gap: spacing.md },
  info: { flex: 1 },
  name: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg, color: colors.textPrimary },
  rating: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
  vehicle: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textMuted, marginTop: 2 },
  eta: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.md, color: colors.primary, marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
  },
  cancelBtn: { backgroundColor: '#FEE2E2' },
  cancelText: { color: colors.danger },
});
