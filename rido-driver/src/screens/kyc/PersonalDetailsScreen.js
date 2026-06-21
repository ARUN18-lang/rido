import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { colors, spacing, typography } from '../../theme';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  date_of_birth: z.string().min(1, 'DOB required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
});

export default function PersonalDetailsScreen({ navigation }) {
  const [womensRide, setWomensRide] = useState(false);
  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', date_of_birth: '', gender: 'MALE' },
  });
  const gender = watch('gender');

  const onSubmit = (data) => {
    navigation.navigate('DocumentUpload', { personal: { ...data, womens_ride_available: gender === 'FEMALE' && womensRide } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Personal Details</Text>
      <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
        <Input label="Full Name" value={value} onChangeText={onChange} error={errors.name?.message} />
      )} />
      <Controller control={control} name="date_of_birth" render={({ field: { onChange, value } }) => (
        <Input label="Date of Birth (YYYY-MM-DD)" value={value} onChangeText={onChange} error={errors.date_of_birth?.message} />
      )} />
      <Text style={styles.label}>Gender</Text>
      <Controller control={control} name="gender" render={({ field: { onChange, value } }) => (
        <View style={styles.genderRow}>
          {['MALE', 'FEMALE', 'OTHER'].map((g) => (
            <Pressable key={g} style={[styles.genderBtn, value === g && styles.genderActive]} onPress={() => onChange(g)}>
              <Text style={value === g ? styles.genderTextActive : styles.genderText}>{g}</Text>
            </Pressable>
          ))}
        </View>
      )} />
      {gender === 'FEMALE' && (
        <View style={styles.womensRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.womensTitle}>Women's Ride available?</Text>
            <Text style={styles.womensDesc}>Upload female verification document. Admin verifies within 24 hours.</Text>
          </View>
          <Switch value={womensRide} onValueChange={setWomensRide} trackColor={{ true: colors.pink }} />
        </View>
      )}
      <Button title="Continue" onPress={handleSubmit(onSubmit)} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, paddingTop: 60 },
  heading: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], marginBottom: spacing.xl },
  label: { fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginBottom: spacing.sm },
  genderRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  genderBtn: { flex: 1, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  genderActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  genderText: { fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  genderTextActive: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
  womensRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.pinkLight, padding: spacing.md, borderRadius: 12, marginBottom: spacing.xl, gap: spacing.md },
  womensTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.md },
  womensDesc: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 4 },
});
