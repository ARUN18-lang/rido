import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Card from './ui/Card';
import { colors, spacing, typography } from '../theme';

export default function EarningsCard({ amount, trips, breakdown }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.earned}>You earned ₹{amount}</Text>
      {breakdown && (
        <Text style={styles.breakdown}>
          Fare ₹{breakdown.fare} − Commission ₹{breakdown.commission} = ₹{amount}
        </Text>
      )}
      {breakdown?.poolBonus > 0 && (
        <Text style={styles.bonus}>+ ₹{breakdown.poolBonus} pool bonus</Text>
      )}
      <Text style={styles.today}>₹{amount} today · {trips} trips</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: spacing.xl },
  earned: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['3xl'], color: colors.success },
  breakdown: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing.sm },
  bonus: { fontFamily: typography.fontFamily.semiBold, color: colors.primary, marginTop: spacing.xs },
  today: { fontFamily: typography.fontFamily.medium, color: colors.textMuted, marginTop: spacing.md },
});
