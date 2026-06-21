import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';

const STEPS = ['Personal Details', 'Aadhaar', 'License', 'Vehicle'];

export default function KYCIntroScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Let's get you set up</Text>
      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <Text style={styles.stepLabel}>{s}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.sub}>Takes about 10 minutes</Text>
      <View style={styles.checklist}>
        {['Your Aadhaar card', 'Driving license', 'Vehicle RC book', 'Vehicle insurance'].map((item) => (
          <Text key={item} style={styles.checkItem}>✓ {item}</Text>
        ))}
      </View>
      <Button title="Start KYC" onPress={() => navigation.navigate('PersonalDetails')} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, paddingTop: 60 },
  heading: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], color: colors.textPrimary, marginBottom: spacing.xl },
  steps: { gap: spacing.md, marginBottom: spacing.lg },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: colors.textWhite, fontFamily: typography.fontFamily.bold },
  stepLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.md },
  sub: { fontFamily: typography.fontFamily.regular, color: colors.textMuted, marginBottom: spacing.xl },
  checklist: { gap: spacing.sm, marginBottom: spacing['2xl'] },
  checkItem: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.md, color: colors.textPrimary },
});
