import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

export default function Badge({ label, variant = 'default', icon }) {
  const { colors, radius, spacing, typography, isDark } = useTheme();

  const VARIANTS = {
    default: { bg: colors.surfaceSecondary, text: colors.textSecondary },
    primary: { bg: colors.primaryLight, text: colors.primary },
    success: { bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7', text: colors.success },
    warning: { bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7', text: colors.warning },
    danger: { bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2', text: colors.danger },
    pink: { bg: colors.pinkLight, text: colors.pink },
  };

  const v = VARIANTS[variant] || VARIANTS.default;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.full,
          alignSelf: 'flex-start',
          gap: 4,
          backgroundColor: v.bg,
        },
      ]}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.text, { color: v.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 12 },
  text: {},
});
