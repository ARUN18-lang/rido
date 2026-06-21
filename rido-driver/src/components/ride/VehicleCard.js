import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export default function VehicleCard({ vehicle, fare, sharedFare, eta, selected, onPress }) {
  return (
    <View
      style={[styles.card, selected && styles.selected]}
      onTouchEnd={onPress}
    >
      <Text style={styles.icon}>{vehicle.icon}</Text>
      <Text style={styles.name}>{vehicle.name}</Text>
      <Text style={styles.capacity}>Up to {vehicle.capacity}</Text>
      <Text style={styles.fare}>₹{fare}</Text>
      {sharedFare && (
        <Text style={styles.shared}>₹{sharedFare.min}–{sharedFare.max}/person</Text>
      )}
      <Text style={styles.eta}>{eta} min</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 130,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginRight: spacing.md,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  icon: { fontSize: 28, marginBottom: 4 },
  name: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  capacity: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
  fare: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg, color: colors.textPrimary, marginTop: 4 },
  shared: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.xs, color: colors.success },
  eta: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
});
