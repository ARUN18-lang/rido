import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import EarningsCard from '../../components/EarningsCard';
import Button from '../../components/ui/Button';
import { useRideStore } from '../../store/rideStore';
import { useEarningsStore } from '../../store/earningsStore';
import { colors, spacing, typography } from '../../theme';

export default function RideCompleteScreen({ navigation, route }) {
  const ride = route.params?.ride;
  const clearRide = useRideStore((s) => s.clearRide);
  const addTrip = useEarningsStore((s) => s.addTrip);
  const { todayEarnings, todayTrips } = useEarningsStore();
  const scale = useSharedValue(0);

  const commission = Math.round(ride.fare * 0.1);
  const earned = ride.fare - commission;
  const poolBonus = ride.mode === 'SHARED' ? 12 : 0;
  const total = earned + poolBonus;

  useEffect(() => {
    scale.value = withSpring(1);
    addTrip({ earnings: total, mode: ride.mode });
    const timer = setTimeout(() => navigation.replace('Home'), 8000);
    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const goHome = () => {
    clearRide();
    navigation.replace('Home');
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.emoji, animStyle]}>🎉</Animated.Text>
      <Text style={styles.heading}>Trip Complete!</Text>
      <EarningsCard
        amount={total}
        trips={todayTrips}
        breakdown={{ fare: ride.fare, commission, poolBonus }}
      />
      <View style={styles.stats}>
        <Text style={styles.stat}>{ride.total_distance_km} km · {ride.duration_min} min</Text>
        {ride.passenger_count > 1 && <Text style={styles.stat}>{ride.passenger_count} passengers</Text>}
      </View>
      <Text style={styles.today}>₹{todayEarnings + total} today · {todayTrips} trips</Text>
      <Button title="Back to Home" onPress={goHome} fullWidth style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, paddingTop: 80, alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: spacing.lg },
  heading: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], color: colors.textPrimary, marginBottom: spacing.xl },
  stats: { marginTop: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  stat: { fontFamily: typography.fontFamily.regular, color: colors.textSecondary },
  today: { fontFamily: typography.fontFamily.semiBold, color: colors.primary, marginTop: spacing.lg, fontSize: typography.size.lg },
  btn: { marginTop: spacing['2xl'], alignSelf: 'stretch' },
});
