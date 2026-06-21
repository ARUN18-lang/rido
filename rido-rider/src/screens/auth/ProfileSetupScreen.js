import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/api';
import { GENDER } from '../../constants/ride';
import { colors, spacing, typography } from '../../theme';

export default function ProfileSetupScreen({ navigation }) {
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const [name, setName] = useState('');
  const [gender, setGender] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !gender) return;
    setLoading(true);
    const { data, error } = await apiService.updateMe({ name: name.trim(), gender });
    setLoading(false);
    if (!error && data?.data) {
      setUser(data.data);
    }
    // RootNavigator auto-navigates when user.name is set
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('auth.setupProfile')}</Text>
      <Input label={t('auth.yourName')} value={name} onChangeText={setName} autoFocus />
      <Text style={styles.label}>{t('auth.gender')}</Text>
      <View style={styles.genderRow}>
        {Object.values(GENDER).map((g) => (
          <Pressable
            key={g}
            style={[styles.genderBtn, gender === g && styles.genderSelected]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
          </Pressable>
        ))}
      </View>
      <Button title={t('auth.continue')} onPress={handleSubmit} loading={loading} fullWidth disabled={!name || !gender} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, paddingTop: 80 },
  heading: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], color: colors.textPrimary, marginBottom: spacing.xl },
  label: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  genderRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  genderBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  genderSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  genderText: { fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  genderTextSelected: { color: colors.primary },
});
