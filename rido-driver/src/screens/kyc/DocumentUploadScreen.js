import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { DOCUMENT_TYPES, VEHICLE_TYPES } from '../../constants/ride';
import { apiService } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, typography } from '../../theme';

export default function DocumentUploadScreen({ navigation, route }) {
  const setDriver = useAuthStore((s) => s.setDriver);
  const driver = useAuthStore((s) => s.driver);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [uploads, setUploads] = useState({});
  const [step, setStep] = useState(0);
  const [vehicle, setVehicle] = useState({ make: '', model: '', year: '', color: '', registration_number: '', type: 'MINI_CAR' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [driverChecked, setDriverChecked] = useState(false);
  const docs = DOCUMENT_TYPES;
  const allUploaded = docs.every((d) => uploads[d.id]);

  const pickImage = async (docId) => {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      setUploads((u) => ({ ...u, [docId]: { local: asset.uri, uploaded: false } }));
      const { data, error: uploadError } = await apiService.uploadDocument(docId, asset);
      if (uploadError) {
        setError(uploadError);
      } else if (data) {
        setError('');
        setUploads((u) => ({ ...u, [docId]: { ...u[docId], uploaded: true } }));
      }
    }
  };

  useEffect(() => {
    const registerAndRefresh = async () => {
      if (!route.params?.personal || driverChecked) return;
      if (driver?.id) {
        setDriverChecked(true);
        return;
      }

      setLoading(true);
      setError('');

      const { data, error: registerError } = await apiService.registerDriver(route.params.personal);
      if (registerError) {
        if (!registerError.toString().includes('DRIVER_EXISTS')) {
          setError(registerError);
          setLoading(false);
          return;
        }

        const { data: driverData, error: driverError } = await apiService.getDriverMe();
        if (driverError) {
          setError(driverError);
          setLoading(false);
          return;
        }

        const driverPayload = driverData?.data || driverData;
        setDriver(driverPayload);
      } else {
        const payload = data?.data || data;
        setDriver(payload);
      }

      if (refreshToken) {
        const { data: refreshData, error: refreshError } = await apiService.refreshToken(refreshToken);
        if (refreshError) {
          setError(refreshError);
        } else {
          const payload = refreshData?.data || refreshData;
          if (payload?.access_token) {
            useAuthStore.getState().setTokens(payload.access_token, refreshToken);
          }
        }
      }

      setDriverChecked(true);
      setLoading(false);
    };

    registerAndRefresh();
  }, [route.params?.personal, refreshToken, driver?.id, driverChecked, setDriver]);

  const handleSubmit = async () => {
    setLoading(true);
    await apiService.createVehicle(vehicle);
    setDriver({ kyc_status: 'PENDING' });
    setLoading(false);
    navigation.navigate('KYCPending');
  };

  if (step >= docs.length) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <Text style={styles.heading}>Vehicle Details</Text>
        <Input label="Make" value={vehicle.make} onChangeText={(v) => setVehicle({ ...vehicle, make: v })} />
        <Input label="Model" value={vehicle.model} onChangeText={(v) => setVehicle({ ...vehicle, model: v })} />
        <Input label="Year" value={vehicle.year} onChangeText={(v) => setVehicle({ ...vehicle, year: v })} keyboardType="number-pad" />
        <Input label="Color" value={vehicle.color} onChangeText={(v) => setVehicle({ ...vehicle, color: v })} />
        <Input label="Registration Number" value={vehicle.registration_number} onChangeText={(v) => setVehicle({ ...vehicle, registration_number: v })} />
        <Text style={styles.label}>Vehicle Type</Text>
        <View style={styles.typeRow}>
          {VEHICLE_TYPES.map((vt) => (
            <Pressable key={vt.id} style={[styles.typeBtn, vehicle.type === vt.id && styles.typeActive]} onPress={() => setVehicle({ ...vehicle, type: vt.id })}>
              <Text style={vehicle.type === vt.id ? styles.typeTextActive : styles.typeText}>{vt.name}</Text>
              <Text style={styles.capacity}>Cap: {vt.capacity}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="Submit for Review" onPress={handleSubmit} loading={loading} fullWidth />
      </ScrollView>
    );
  }

  const doc = docs[step];
  const upload = uploads[doc.id];

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>Step {step + 1} of {docs.length}</Text>
      <Text style={styles.heading}>{doc.label}</Text>
      <Text style={styles.desc}>{doc.description}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.uploadCard} onPress={() => pickImage(doc.id)}>
        {upload?.local ? (
          <View style={styles.thumbWrap}>
            <Image source={{ uri: upload.local }} style={styles.thumb} />
            {upload.uploaded && <Text style={styles.check}>✓ Uploaded</Text>}
          </View>
        ) : (
          <Text style={styles.uploadBtn}>📷 Upload {doc.label}</Text>
        )}
      </Pressable>
      <Button
        title={step < docs.length - 1 ? 'Next Document' : 'Add Vehicle Details'}
        onPress={() => setStep((s) => s + 1)}
        fullWidth
        disabled={!upload?.uploaded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, paddingTop: 60 },
  pad: { padding: spacing.xl, paddingTop: 60 },
  progress: { fontFamily: typography.fontFamily.medium, color: colors.primary, marginBottom: spacing.sm },
  heading: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], marginBottom: spacing.sm },
  desc: { fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginBottom: spacing.xl },
  error: { fontFamily: typography.fontFamily.medium, color: colors.danger, marginBottom: spacing.sm },
  uploadCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', minHeight: 200, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  uploadBtn: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.lg, color: colors.primary },
  thumbWrap: { alignItems: 'center' },
  thumb: { width: 200, height: 140, borderRadius: 12 },
  check: { fontFamily: typography.fontFamily.semiBold, color: colors.success, marginTop: spacing.sm, fontSize: typography.size.lg },
  label: { fontFamily: typography.fontFamily.medium, marginBottom: spacing.sm },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  typeBtn: { padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, minWidth: '45%' },
  typeActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeText: { fontFamily: typography.fontFamily.medium },
  typeTextActive: { fontFamily: typography.fontFamily.semiBold, color: colors.primary },
  capacity: { fontSize: typography.size.xs, color: colors.textMuted },
});
