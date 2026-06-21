import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { useTheme, colors, spacing, typography } from '../theme';

export default function RideRequestCard({ ride, countdown = 20 }) {
  const [timeLeft, setTimeLeft] = useState(countdown);
  const barWidth = useSharedValue(1);
  const { colors, spacing, typography } = useTheme();

  useEffect(() => {
    barWidth.value = withTiming(0, { duration: countdown * 1000 });
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  const isUrgent = timeLeft <= 5;

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.progressBar, { backgroundColor: colors.primary }, barStyle, isUrgent && { backgroundColor: colors.danger }]} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>New Ride Offer 🔔</Text>
        <Badge
          label={ride?.mode === 'SHARED' ? `Shared (${ride?.passenger_count || 2} Seats)` : 'Solo Ride'}
          variant={ride?.is_womens_ride ? 'pink' : 'primary'}
        />
      </View>

      <Text style={[styles.fare, { color: colors.textPrimary }]}>₹{ride?.fare}</Text>
      {ride?.mode === 'SHARED' && (
        <Text style={[styles.fareSub, { color: colors.success }]}>Co-riding · Up to {ride?.passenger_count} passengers</Text>
      )}

      <View style={[styles.routeContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <View style={styles.pathGraphic}>
          <View style={[styles.dotGreen, { backgroundColor: colors.success }]} />
          <View style={styles.dashLine} />
          <View style={[styles.dotRed, { backgroundColor: colors.danger }]} />
        </View>
        <View style={styles.routeTextCol}>
          <View style={styles.routeItem}>
            <Text style={[styles.routeLbl, { color: colors.textMuted }]}>PICKUP · {ride?.pickup_distance_km} km away</Text>
            <Text style={[styles.routeVal, { color: colors.textPrimary }]} numberOfLines={1}>{ride?.pickup_address}</Text>
          </View>
          <View style={styles.routeItem}>
            <Text style={[styles.routeLbl, { color: colors.textMuted }]}>DROP · {ride?.total_distance_km} km ride</Text>
            <Text style={[styles.routeVal, { color: colors.textPrimary }]} numberOfLines={1}>{ride?.drop_address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.duration, { color: colors.textSecondary }]}>Estimated trip duration: ~{ride?.duration_min} min</Text>
        <View style={[styles.timerCircle, { borderColor: colors.primary }, isUrgent && styles.timerUrgent]}>
          <Text style={[styles.timerText, { color: colors.primary }, isUrgent && styles.timerTextUrgent]}>{timeLeft}s</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderColor: 'rgba(226, 232, 240, 0.8)',
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  progressBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 6,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md + 1,
    color: colors.textPrimary,
  },
  fare: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 52,
    color: colors.textPrimary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  fareSub: {
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
    color: colors.success,
    fontSize: typography.size.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  routeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  pathGraphic: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginRight: spacing.md,
  },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  dashLine: { width: 1.5, flex: 1, backgroundColor: '#CBD5E1', marginVertical: 4 },
  dotRed: { width: 8, height: 8, backgroundColor: colors.danger, borderRadius: 2 },
  routeTextCol: { flex: 1, gap: spacing.md },
  routeItem: { gap: 2 },
  routeLbl: { fontFamily: typography.fontFamily.bold, fontSize: 9, color: colors.textMuted, letterSpacing: 0.8 },
  routeVal: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm + 1, color: colors.textPrimary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: {
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  timerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerUrgent: {
    borderColor: colors.danger,
  },
  timerText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    color: colors.primary,
  },
  timerTextUrgent: {
    color: colors.danger,
  },
});
