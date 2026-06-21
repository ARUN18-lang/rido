import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    titleKey: 'onboarding.slide1Title',
    descKey: 'onboarding.slide1Desc',
    color: '#10B981',
    accent: '#059669',
    icon: 'car-sport',
    shapes: [
      { type: 'circle', size: 80, x: 60, y: 50, rotation: 0 },
      { type: 'rounded', size: 60, x: 140, y: 120, rotation: 30 },
      { type: 'circle', size: 40, x: 50, y: 150, rotation: 0 },
    ],
  },
  {
    key: '2',
    titleKey: 'onboarding.slide2Title',
    descKey: 'onboarding.slide2Desc',
    color: '#6366F1',
    accent: '#4F46E5',
    icon: 'people',
    shapes: [
      { type: 'rounded', size: 70, x: 70, y: 60, rotation: -15 },
      { type: 'circle', size: 50, x: 150, y: 40, rotation: 0 },
      { type: 'rounded', size: 45, x: 130, y: 140, rotation: 45 },
    ],
  },
  {
    key: '3',
    titleKey: 'onboarding.slide3Title',
    descKey: 'onboarding.slide3Desc',
    color: '#EC4899',
    accent: '#DB2777',
    icon: 'shield-checkmark',
    shapes: [
      { type: 'circle', size: 75, x: 55, y: 55, rotation: 0 },
      { type: 'rounded', size: 55, x: 145, y: 100, rotation: 20 },
      { type: 'circle', size: 35, x: 120, y: 160, rotation: 0 },
    ],
  },
];

function AnimatedIllustration({ slide, isActive }) {
  const iconFloat = useSharedValue(0);
  const shape1Rotate = useSharedValue(0);
  const shape2Scale = useSharedValue(0.8);
  const iconScale = useSharedValue(0.8);

  useEffect(() => {
    if (isActive) {
      iconFloat.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );
      shape1Rotate.value = withRepeat(
        withTiming(360, { duration: 12000, easing: Easing.linear }),
        -1, false
      );
      shape2Scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );
      iconScale.value = withSpring(1, { damping: 10, stiffness: 80 });
    } else {
      iconScale.value = withTiming(0.8, { duration: 300 });
    }
  }, [isActive]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconFloat.value }, { scale: iconScale.value }],
  }));

  const shape1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shape1Rotate.value}deg` }],
  }));

  const shape2Style = useAnimatedStyle(() => ({
    transform: [{ scale: shape2Scale.value }],
  }));

  return (
    <View style={[styles.illustration, { backgroundColor: slide.color + '15' }]}>
      {/* Background shapes */}
      {slide.shapes.map((shape, i) => (
        <Animated.View
          key={i}
          style={[
            shape.type === 'circle' ? styles.shapeCircle : styles.shapeRounded,
            {
              width: shape.size,
              height: shape.size,
              borderRadius: shape.type === 'circle' ? shape.size / 2 : shape.size / 5,
              backgroundColor: i === 0 ? slide.color + '30' : slide.color + '18',
              position: 'absolute',
              left: shape.x,
              top: shape.y,
            },
            i === 0 ? shape1Style : i === 1 ? shape2Style : {},
          ]}
        />
      ))}

      {/* Central icon */}
      <Animated.View style={[styles.iconContainer, { backgroundColor: slide.color, shadowColor: slide.color }, iconStyle]}>
        <Ionicons name={slide.icon} size={40} color="#FFF" />
      </Animated.View>

      {/* Decorative dots */}
      <View style={[styles.decorDot, { backgroundColor: slide.color + '40', top: 30, right: 50, width: 12, height: 12, borderRadius: 6 }]} />
      <View style={[styles.decorDot, { backgroundColor: slide.color + '30', bottom: 40, left: 40, width: 8, height: 8, borderRadius: 4 }]} />
      <View style={[styles.decorDot, { backgroundColor: slide.color + '50', top: 100, right: 30, width: 6, height: 6, borderRadius: 3 }]} />
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const { t } = useTranslation();
  const setOnboardingSeen = useAppStore((s) => s.setOnboardingSeen);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, isDark } = useTheme();

  // Animated dot widths
  const dot0Width = useSharedValue(24);
  const dot1Width = useSharedValue(8);
  const dot2Width = useSharedValue(8);

  useEffect(() => {
    const dotValues = [dot0Width, dot1Width, dot2Width];
    dotValues.forEach((dv, i) => {
      dv.value = withSpring(i === index ? 28 : 8, { damping: 15 });
    });
  }, [index]);

  const dot0Style = useAnimatedStyle(() => ({ width: dot0Width.value }));
  const dot1Style = useAnimatedStyle(() => ({ width: dot1Width.value }));
  const dot2Style = useAnimatedStyle(() => ({ width: dot2Width.value }));
  const dotStyles = [dot0Style, dot1Style, dot2Style];

  const finish = () => {
    setOnboardingSeen();
    navigation.replace('OTP');
  };

  const renderSlide = ({ item, index: slideIndex }) => (
    <View style={[styles.slide, { width }]}>
      <AnimatedIllustration slide={item} isActive={slideIndex === index} />
      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {t(item.titleKey)}
      </Text>
      <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {t(item.descKey)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.xl }]}>
      {index < 2 && (
        <Pressable style={[styles.skip, { top: insets.top + 16 }]} onPress={finish}>
          <Text style={[styles.skipText, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium }]}>
            {t('onboarding.skip')}
          </Text>
        </Pressable>
      )}
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      />
      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === index ? SLIDES[index].color : (isDark ? '#334155' : '#E2E8F0') },
              dotStyles[i],
            ]}
          />
        ))}
      </View>
      {index === 2 ? (
        <View style={styles.btnContainer}>
          <Button title={t('onboarding.getStarted')} onPress={finish} fullWidth />
        </View>
      ) : (
        <View style={styles.btnContainer}>
          <Button
            title="Next"
            onPress={() => listRef.current?.scrollToIndex({ index: index + 1 })}
            fullWidth
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: { position: 'absolute', right: 16, zIndex: 10 },
  skipText: { fontSize: 14 },
  slide: { paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  illustration: {
    width: 260,
    height: 260,
    borderRadius: 130,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  shapeCircle: {},
  shapeRounded: {},
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  decorDot: { position: 'absolute' },
  title: { fontSize: 26, textAlign: 'center', letterSpacing: 0.3 },
  desc: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 24, paddingHorizontal: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 28 },
  dot: { height: 8, borderRadius: 4 },
  btnContainer: { paddingHorizontal: 24 },
});
