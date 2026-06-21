import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function VehicleCard({ vehicle, fare, sharedFare, eta, selected, onPress }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.04 : 1, { damping: 15, stiffness: 150 });
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fareValue = typeof fare === 'object' && fare !== null ? fare.total ?? fare : fare;
  const calculatedFare = selected ? (sharedFare ? `${sharedFare.min}–${sharedFare.max}` : fareValue) : fareValue;

  return (
    <AnimatedPressable
      style={[styles.card, selected && styles.selected, animatedStyle]}
      onPress={onPress}
    >
      <View style={[styles.etaBadge, selected && styles.etaSelected]}>
        <Text style={[styles.etaBadgeText, selected && styles.etaSelectedText]}>{eta}m</Text>
      </View>
      <Text style={styles.icon}>{vehicle.icon}</Text>
      <View style={styles.content}>
        <Text style={styles.name}>{vehicle.name}</Text>
        <Text style={styles.capacity}>Up to {vehicle.capacity}</Text>
      </View>
      <View style={styles.fareRow}>
        <Text style={[styles.fare, selected && styles.fareActive]}>₹{calculatedFare}</Text>
        {sharedFare && (
          <Text style={styles.shared}>Shared</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 136,
    height: 148,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    padding: spacing.md,
    marginRight: spacing.md,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  etaBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  etaSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  etaBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  etaSelectedText: {
    color: colors.primary,
  },
  icon: { fontSize: 32, marginTop: spacing.sm },
  content: { gap: 2 },
  name: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.sm + 1, color: colors.textPrimary },
  capacity: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.xs, color: colors.textMuted },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  fare: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.md, color: colors.textPrimary },
  fareActive: { color: colors.primary },
  shared: { fontFamily: typography.fontFamily.bold, fontSize: 9, color: colors.success, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
});
