import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';

export default function SOSScreen({ navigation }) {
  const testSos = () => {
    Alert.alert(
      'Test SOS?',
      'This will send a test alert to your emergency contacts.',
      [
        { text: 'Cancel' },
        { text: 'Send Test', onPress: () => Alert.alert('Test SOS sent', 'Your contacts would be notified.') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} />
      </Pressable>
      <Text style={styles.title}>SOS Safety</Text>
      <View style={styles.info}>
        <Text style={styles.infoTitle}>What happens when SOS triggers?</Text>
        <Text style={styles.bullet}>• Your live location is shared with emergency contacts</Text>
        <Text style={styles.bullet}>• An SMS alert is sent immediately</Text>
        <Text style={styles.bullet}>• You can call 112 directly from the SOS screen</Text>
        <Text style={styles.bullet}>• Long-press the red SOS button during a ride (2 seconds)</Text>
      </View>
      <Button title="Test SOS" variant="danger" onPress={testSos} fullWidth />
      <Pressable style={styles.link} onPress={() => navigation.navigate('EmergencyContacts')}>
        <Text style={styles.linkText}>Manage Emergency Contacts →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56, paddingHorizontal: spacing.base },
  back: { marginBottom: spacing.md },
  title: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], marginBottom: spacing.xl },
  info: { backgroundColor: colors.surface, padding: spacing.base, borderRadius: 16, marginBottom: spacing.xl },
  infoTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.md, marginBottom: spacing.md },
  bullet: { fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 22 },
  link: { marginTop: spacing.xl, alignItems: 'center' },
  linkText: { fontFamily: typography.fontFamily.semiBold, color: colors.primary },
});
