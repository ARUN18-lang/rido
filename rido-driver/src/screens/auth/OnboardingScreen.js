import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  { key: '1', titleKey: 'onboarding.slide1Title', descKey: 'onboarding.slide1Desc', color: '#6C63FF' },
  { key: '2', titleKey: 'onboarding.slide2Title', descKey: 'onboarding.slide2Desc', color: '#22C55E' },
  { key: '3', titleKey: 'onboarding.slide3Title', descKey: 'onboarding.slide3Desc', color: '#EC4899' },
];

export default function OnboardingScreen({ navigation }) {
  const { t } = useTranslation();
  const setOnboardingSeen = useAppStore((s) => s.setOnboardingSeen);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useTheme();

  const finish = () => {
    setOnboardingSeen();
    navigation.replace('OTP');
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.illustration, { backgroundColor: item.color + '22' }]}>
        <View style={[styles.shape1, { backgroundColor: item.color }]} />
        <View style={[styles.shape2, { backgroundColor: item.color + '88' }]} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t(item.titleKey)}</Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>{t(item.descKey)}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.xl }]}>
      {index < 2 && (
        <Pressable style={[styles.skip, { top: insets.top + 16 }]} onPress={finish}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('onboarding.skip')}</Text>
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
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && { backgroundColor: colors.primary, width: 24 }]} />
        ))}
      </View>
      {index === 2 ? (
        <Button title={t('onboarding.getStarted')} onPress={finish} fullWidth style={styles.btn} />
      ) : (
        <Button
          title="Next"
          onPress={() => listRef.current?.scrollToIndex({ index: index + 1 })}
          fullWidth
          style={styles.btn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: { position: 'absolute', right: 16, zIndex: 10 },
  skipText: { fontSize: 14, fontWeight: '500' },
  slide: { paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  illustration: { width: 240, height: 240, borderRadius: 120, marginBottom: 32, alignItems: 'center', justifyContent: 'center' },
  shape1: { width: 80, height: 80, borderRadius: 20, position: 'absolute', top: 60, left: 50 },
  shape2: { width: 60, height: 60, borderRadius: 30, position: 'absolute', bottom: 50, right: 50 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 16, fontWeight: '400', textAlign: 'center', marginTop: 12, lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0' },
  btn: { paddingHorizontal: 24 },
});
