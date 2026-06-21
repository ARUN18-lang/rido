import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

export default function SplashScreen({ navigation }) {
  const { colors, typography, isDark } = useTheme();

  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);
  const tagTranslateY = useSharedValue(20);
  const glowScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);
  const ring1Scale = useSharedValue(0.5);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.5);
  const ring2Opacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    glowOpacity.value = withDelay(300, withTiming(0.6, { duration: 500 }));
    glowScale.value = withDelay(300, withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    ));

    ring1Opacity.value = withDelay(600, withRepeat(
      withSequence(withTiming(0.3, { duration: 200 }), withTiming(0, { duration: 1800 })), -1, false
    ));
    ring1Scale.value = withDelay(600, withRepeat(
      withSequence(withTiming(0.5, { duration: 0 }), withTiming(2.5, { duration: 2000, easing: Easing.out(Easing.ease) })), -1, false
    ));
    ring2Opacity.value = withDelay(1200, withRepeat(
      withSequence(withTiming(0.3, { duration: 200 }), withTiming(0, { duration: 1800 })), -1, false
    ));
    ring2Scale.value = withDelay(1200, withRepeat(
      withSequence(withTiming(0.5, { duration: 0 }), withTiming(2.5, { duration: 2000, easing: Easing.out(Easing.ease) })), -1, false
    ));

    tagOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    tagTranslateY.value = withDelay(700, withSpring(0, { damping: 14 }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('OTP');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigation]);

  const logoStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value, transform: [{ translateY: tagTranslateY.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value, transform: [{ scale: glowScale.value }] }));
  const ring1Style = useAnimatedStyle(() => ({ opacity: ring1Opacity.value, transform: [{ scale: ring1Scale.value }] }));
  const ring2Style = useAnimatedStyle(() => ({ opacity: ring2Opacity.value, transform: [{ scale: ring2Scale.value }] }));

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#064E3B' : '#059669' }]}>
      <View style={[styles.gradientOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)' }]} />
      <Animated.View style={[styles.ring, ring1Style]} />
      <Animated.View style={[styles.ring, ring2Style]} />
      <Animated.View style={[styles.glow, glowStyle]} />

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Text style={[styles.logo, { fontFamily: typography.fontFamily.bold }]}>Rido</Text>
        <View style={styles.driverBadge}>
          <Text style={[styles.driverBadgeText, { fontFamily: typography.fontFamily.bold }]}>DRIVER</Text>
        </View>
      </Animated.View>

      <Animated.View style={tagStyle}>
        <Text style={[styles.tagline, { fontFamily: typography.fontFamily.medium }]}>Drive. Earn. Grow.</Text>
        <View style={styles.divider} />
        <Text style={[styles.subtitle, { fontFamily: typography.fontFamily.regular }]}>Partner app for captains</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.4)' },
  glow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  logoContainer: { alignItems: 'center' },
  logo: { fontSize: 56, color: '#FFFFFF', letterSpacing: 3 },
  driverBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  driverBadgeText: { fontSize: 12, color: '#FFFFFF', letterSpacing: 3 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 24, textAlign: 'center' },
  divider: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginVertical: 12, borderRadius: 1 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
});
