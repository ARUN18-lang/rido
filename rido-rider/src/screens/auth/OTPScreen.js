import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme';

const OTP_LENGTH = 6;

export default function OTPScreen({ navigation }) {
  const { t } = useTranslation();
  const { sendOtp, login } = useAuth();
  const [step, setStep] = useState('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const inputs = useRef([]);
  const shakeX = useSharedValue(0);
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(20);

  const { colors, spacing, typography, radius, isDark } = useTheme();

  useEffect(() => {
    headerOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    headerTranslateY.value = withDelay(200, withSpring(0, { damping: 14 }));
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit number');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await sendOtp(phone);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setStep('OTP');
    setResendTimer(60);
  };

  const handleOtpChange = (text, index) => {
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => { if (index + i < OTP_LENGTH) newOtp[index + i] = d; });
      setOtp(newOtp);
      const next = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputs.current[next]?.focus();
      if (newOtp.every((d) => d)) verifyOtp(newOtp.join(''));
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (newOtp.every((d) => d)) verifyOtp(newOtp.join(''));
  };

  const verifyOtp = async (code) => {
    setLoading(true);
    setError('');
    const { data, error: err } = await login(phone, code);
    setLoading(false);
    if (err) {
      setError(t('auth.wrongOtp'));
      shake();
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      return;
    }
    // RootNavigator handles routing after auth state updates
  };

  if (step === 'PHONE') {
    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Accent bar */}
        <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
        
        <Animated.View style={headerStyle}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="phone-portrait-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heading, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {t('auth.enterPhone')}
          </Text>
          <Text style={[styles.subHeading, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            We'll send you a verification code
          </Text>
        </Animated.View>

        <Input
          prefix="+91"
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
          keyboardType="phone-pad"
          maxLength={10}
          error={error}
          autoFocus
        />
        <Button title={t('auth.sendOtp')} onPress={handleSendOtp} loading={loading} fullWidth />
        <Text style={[styles.terms, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>
          {t('auth.terms')}
        </Text>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />

      <Pressable style={styles.backButton} onPress={() => setStep('PHONE')}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={[styles.iconBadge, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="keypad-outline" size={28} color={colors.primary} />
      </View>
      <Text style={[styles.heading, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {t('auth.verifyPhone')}
      </Text>
      <Text style={[styles.sub, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {t('auth.otpSent', { last4: phone.slice(-4) })}
      </Text>

      <Animated.View style={[styles.otpRow, shakeStyle]}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(r) => { inputs.current[i] = r; }}
            style={[
              styles.otpBox,
              {
                borderColor: colors.border,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                fontFamily: typography.fontFamily.bold,
              },
              digit && {
                borderColor: colors.primary,
                backgroundColor: colors.primaryLight,
              }
            ]}
            value={digit}
            onChangeText={(t) => handleOtpChange(t, i)}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
          />
        ))}
      </Animated.View>

      {error ? <Text style={[styles.error, { color: colors.danger, fontFamily: typography.fontFamily.medium }]}>{error}</Text> : null}

      {/* Resend timer with visual countdown */}
      {resendTimer > 0 ? (
        <View style={styles.resendContainer}>
          <View style={[styles.timerBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.resend, { color: colors.textMuted, fontFamily: typography.fontFamily.medium }]}>
              {t('auth.resendIn', { seconds: resendTimer })}
            </Text>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => { handleSendOtp(); setResendTimer(60); }} style={styles.resendContainer}>
          <Text style={[styles.resendLink, { color: colors.primary, fontFamily: typography.fontFamily.semiBold }]}>
            {t('auth.resendOtp')}
          </Text>
        </Pressable>
      )}

      {loading && (
        <Text style={[styles.loading, { color: colors.textMuted, fontFamily: typography.fontFamily.medium }]}>
          {t('common.loading')}
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 80 },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  backButton: {
    marginBottom: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heading: { fontSize: 28, marginBottom: 8 },
  subHeading: { fontSize: 15, marginBottom: 24, lineHeight: 22 },
  sub: { fontSize: 16, marginBottom: 24 },
  terms: { fontSize: 12, textAlign: 'center', marginTop: 24 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
  },
  error: { marginBottom: 12 },
  resendContainer: { alignItems: 'center', marginTop: 4 },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  resend: { textAlign: 'center' },
  resendLink: { textAlign: 'center' },
  loading: { textAlign: 'center', marginTop: 12 },
});
