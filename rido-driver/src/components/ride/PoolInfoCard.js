import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { colors, spacing, typography } from '../../theme';

export default function PoolInfoCard({ pool, isWomensRide }) {
  if (!pool) return null;
  return (
    <Card style={styles.card}>
      <View style={styles.savings}>
        <Text style={styles.savingsLabel}>You save</Text>
        <Text style={styles.savingsAmount}>₹{pool.savings}</Text>
      </View>
      <Text style={styles.comparison}>
        Solo would've been ₹{pool.solo_fare} → You pay ₹{pool.shared_fare}
      </Text>
      {pool.co_riders?.length > 0 && (
        <Text style={styles.coRider}>
          {pool.co_riders.length} co-rider · {pool.co_riders[0].first_name}
        </Text>
      )}
      {isWomensRide && <Badge label="Women-verified ride" variant="pink" icon="👩" />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#DCFCE7', borderColor: colors.success },
  savings: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  savingsLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.md, color: colors.success },
  savingsAmount: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['3xl'], color: colors.success },
  comparison: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing.sm },
  coRider: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.base, color: colors.textPrimary, marginTop: spacing.sm },
});
