import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}) {
  const { colors, typography, spacing, radius, shadows } = useTheme();

  const VARIANTS = {
    primary: { bg: colors.primary, text: colors.textWhite, border: colors.primary },
    secondary: { bg: colors.secondary, text: colors.textWhite, border: colors.secondary },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', text: colors.textSecondary, border: 'transparent' },
    danger: { bg: colors.danger, text: colors.textWhite, border: colors.danger },
  };

  const SIZES = {
    sm: { height: 40, fontSize: typography.size.sm, px: spacing.base },
    md: { height: 48, fontSize: typography.size.base, px: spacing.lg },
    lg: { height: 56, fontSize: typography.size.md, px: spacing.xl },
  };

  const scale = useSharedValue(1);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.lg;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 10, stiffness: 200 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 200 }); }}
      style={[
        styles.btn,
        {
          borderRadius: radius.full,
          backgroundColor: v.bg,
          borderColor: v.border,
          height: s.height,
          paddingHorizontal: s.px,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variant === 'primary' && {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 4,
        },
        variant === 'secondary' && {
          shadowColor: colors.secondary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 4,
        },
        variant === 'outline' && styles.outline,
        animStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <View style={[styles.row, { gap: spacing.sm }]}>
          {leftIcon}
          <Text style={[styles.text, { color: v.text, fontSize: s.fontSize, fontFamily: typography.fontFamily.semiBold }]}>{title}</Text>
          {rightIcon}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outline: { borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: {},
});
