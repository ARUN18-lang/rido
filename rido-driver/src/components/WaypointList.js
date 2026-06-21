import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Avatar from './ui/Avatar';
import { colors, spacing, typography } from '../theme';

export default function WaypointList({ waypoints = [], dropAddress }) {
  return (
    <View style={styles.container}>
      {waypoints.map((wp, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.order}>
            <Text style={styles.orderText}>{wp.order}</Text>
          </View>
          <Avatar name={wp.name} size={32} />
          <View style={styles.info}>
            <Text style={styles.name}>Stop {wp.order}: {wp.name?.charAt(0)} — {wp.address}</Text>
            <Text style={styles.dist}>{wp.distance_km} km</Text>
          </View>
        </View>
      ))}
      {dropAddress && (
        <View style={styles.row}>
          <Text style={styles.drop}>🔴 Drop: {dropAddress}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, marginVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  order: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  orderText: { fontFamily: typography.fontFamily.bold, fontSize: 12, color: colors.textWhite },
  info: { flex: 1 },
  name: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.base, color: colors.textPrimary },
  dist: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textMuted },
  drop: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
});
