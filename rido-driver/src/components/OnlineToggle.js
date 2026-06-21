import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function OnlineToggle({ isOnline, onToggle, size = 96 }) {
  const pulse = useSharedValue(1);
  const ripple = useSharedValue(1);
  const { colors, typography, isDark } = useTheme();

  useEffect(() => {
    if (isOnline) {
      pulse.value = withRepeat(withTiming(1.08, { duration: 1200 }), -1, true);
      ripple.value = withRepeat(withTiming(1.5, { duration: 1600 }), -1, false);
    } else {
      pulse.value = withTiming(1);
      ripple.value = withTiming(1);
    }
  }, [isOnline]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ripple.value }],
    opacity: isOnline ? 1 - (ripple.value - 1) / 0.5 : 0,
  }));

  return (
    <View style={styles.container}>
      <Pressable onPress={onToggle} style={[styles.wrap, { width: size + 40, height: size + 40 }]}>
        <Animated.View
          style={[
            styles.rippleRing,
            { width: size, height: size, borderRadius: size / 2, borderColor: colors.success },
            rippleStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.toggle,
            { width: size, height: size, borderRadius: size / 2, borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#FFF' },
            isOnline
              ? [styles.online, { backgroundColor: colors.success, shadowColor: colors.success }]
              : [styles.offline, { backgroundColor: isDark ? '#1E293B' : '#334155', shadowColor: isDark ? '#000' : '#0F172A' }],
            isOnline && pulseStyle,
          ]}
        >
          <View style={styles.innerCore}>
            <Ionicons name={isOnline ? 'power' : 'power-outline'} size={20} color="#FFF" style={{ marginBottom: 4 }} />
            <Text style={[styles.label, { fontFamily: typography.fontFamily.bold }]}>
              {isOnline ? 'ONLINE' : 'GO ONLINE'}
            </Text>
            <View style={[styles.statusIndicator, isOnline ? { backgroundColor: '#34D399' } : { backgroundColor: '#94A3B8' }]} />
          </View>
        </Animated.View>
      </Pressable>
      <Text style={[styles.hint, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>
        {isOnline ? 'Tap to go offline' : 'Tap to start accepting rides'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  rippleRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  online: { shadowOpacity: 0.4 },
  offline: {},
  innerCore: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: {
    fontSize: 11,
    color: '#FFF',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  hint: { fontSize: 11, marginTop: 12 },
});
