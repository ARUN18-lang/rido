import React, { useState } from 'react';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import Button from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';

export default function KYCPendingScreen() {
  const [notify, setNotify] = useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.clock}>
        <View style={styles.clockFace} />
        <View style={styles.clockHand} />
      </View>
      <Text style={styles.heading}>Documents under review</Text>
      <Text style={styles.sub}>Usually approved within 24 hours</Text>
      <View style={styles.chip}><Text style={styles.chipText}>Submitted 2 hours ago</Text></View>
      <View style={styles.bullets}>
        <Text style={styles.bullet}>• Our team is verifying your documents</Text>
        <Text style={styles.bullet}>• You'll get a notification once approved</Text>
        <Text style={styles.bullet}>• Start earning as soon as you're verified</Text>
      </View>
      <View style={styles.notifyRow}>
        <Text style={styles.notifyText}>Notify me when approved</Text>
        <Switch value={notify} onValueChange={setNotify} trackColor={{ true: colors.primary }} />
      </View>
      <Button title="Contact Support on WhatsApp" variant="outline" fullWidth onPress={() => Linking.openURL('https://wa.me/919876543210')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, paddingTop: 80, alignItems: 'center' },
  clock: { width: 100, height: 100, marginBottom: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  clockFace: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: colors.primary },
  clockHand: { position: 'absolute', width: 3, height: 30, backgroundColor: colors.primary, top: 25 },
  heading: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], textAlign: 'center' },
  sub: { fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  chip: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, marginTop: spacing.lg },
  chipText: { fontFamily: typography.fontFamily.medium, color: colors.primary },
  bullets: { alignSelf: 'stretch', marginTop: spacing.xl, gap: spacing.sm },
  bullet: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.md, color: colors.textSecondary, lineHeight: 24 },
  notifyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginVertical: spacing.xl, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 12 },
  notifyText: { fontFamily: typography.fontFamily.medium },
});
