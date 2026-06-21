import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import RidoMap from '../../components/map/RidoMap';
import Button from '../../components/ui/Button';
import PoolInfoCard from '../../components/ride/PoolInfoCard';
import { colors, spacing, typography } from '../../theme';

function Confetti() {
  const dots = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 300,
      y: new Animated.Value(-20),
      color: ['#6C63FF', '#22C55E', '#EC4899', '#F59E0B'][i % 4],
    }))
  ).current;

  useEffect(() => {
    dots.forEach((dot) => {
      Animated.timing(dot.y, { toValue: 400, duration: 1500 + Math.random() * 1000, useNativeDriver: true }).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((dot) => (
        <Animated.View
          key={dot.id}
          style={{
            position: 'absolute',
            left: dot.x,
            transform: [{ translateY: dot.y }],
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dot.color,
          }}
        />
      ))}
    </View>
  );
}

export default function PoolMatchScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { ride, pool } = route.params;

  return (
    <View style={styles.container}>
      <Confetti />
      <RidoMap
        region={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
        markers={[
          { id: '1', lat: ride.pickup_lat, lng: ride.pickup_lng, title: 'You', color: '#6C63FF' },
          { id: '2', lat: ride.pickup_lat + 0.01, lng: ride.pickup_lng + 0.01, title: 'Co-rider', color: '#F59E0B' },
        ]}
        style={styles.map}
      />
      <View style={styles.panel}>
        <Text style={styles.heading}>{t('ride.matched')}</Text>
        <PoolInfoCard pool={pool} isWomensRide={ride.is_womens_ride} />
        <Button
          title={t('ride.looksGood') || 'Looks good!'}
          onPress={() => navigation.replace('Searching', { ride: { ...ride, status: 'SEARCHING', pool } })}
          fullWidth
          style={styles.btn}
        />
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>{t('ride.cancelSolo') || 'Cancel and go solo'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { height: '45%' },
  panel: { flex: 1, padding: spacing.base },
  heading: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], color: colors.textPrimary, marginBottom: spacing.lg },
  btn: { marginTop: spacing.xl },
  link: { fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
});
