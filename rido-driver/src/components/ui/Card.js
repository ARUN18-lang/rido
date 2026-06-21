import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';

export default function Card({ children, style, padding }) {
  const { colors, radius, shadows, spacing } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padding !== undefined ? padding : spacing.base,
          ...shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
