import React, { useEffect } from 'react';
import { Dimensions, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const { height: SCREEN_H } = Dimensions.get('window');

export default function BottomSheet({
  visible,
  onClose,
  children,
  snapPoint = 280,
  showBackdrop = true,
}) {
  const { colors, radius, spacing, shadows } = useTheme();
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(SCREEN_H - snapPoint, { damping: 20 });
      backdropOpacity.value = withTiming(0.4, { duration: 200 });
    } else {
      translateY.value = withTiming(SCREEN_H, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, snapPoint]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const next = SCREEN_H - snapPoint + e.translationY;
      if (next >= SCREEN_H - snapPoint) translateY.value = next;
    })
    .onEnd((e) => {
      if (e.translationY > 80) {
        translateY.value = withTiming(SCREEN_H, { duration: 250 });
        backdropOpacity.value = withTiming(0, { duration: 200 });
        if (onClose) runOnJS(onClose)();
      } else {
        translateY.value = withSpring(SCREEN_H - snapPoint);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {showBackdrop && (
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: spacing.base,
              paddingBottom: spacing['2xl'],
              ...shadows.modal,
            },
            sheetStyle,
          ]}
        >
          <View
            style={[
              styles.handle,
              {
                backgroundColor: colors.border,
                marginVertical: spacing.md,
              },
            ]}
          />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SCREEN_H,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
});
