import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import { colors, spacing, typography } from '../../theme';

export default function FareBreakdown({ items, total, collapsed: initialCollapsed = true }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  return (
    <Card>
      <Pressable onPress={() => setCollapsed(!collapsed)} style={styles.header}>
        <Text style={styles.total}>₹{total}</Text>
        <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={20} color={colors.textMuted} />
      </Pressable>
      {!collapsed &&
        items.map((item, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  label: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
  value: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.textPrimary },
});
