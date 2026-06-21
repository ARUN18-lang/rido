import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Loader from '../../components/ui/Loader';
import { apiService } from '../../services/api';
import { colors, spacing, typography } from '../../theme';

export default function EmergencyContactsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    const { data } = await apiService.getEmergencyContacts();
    setContacts(data?.data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    const { data } = await apiService.addEmergencyContact({ name, phone, relationship: 'Family' });
    if (data?.data) {
      setContacts((c) => [...c, data.data]);
      setShowAdd(false);
      setName('');
      setPhone('');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete contact?', '', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await apiService.deleteEmergencyContact(id);
          setContacts((c) => c.filter((x) => x.id !== id));
        },
      },
    ]);
  };

  if (loading) return <Loader fullScreen />;

  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} />
      </Pressable>
      <Text style={styles.title}>Emergency Contacts</Text>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.contact}>
            <View>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactPhone}>{item.phone}</Text>
            </View>
            <Pressable onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No contacts added yet</Text>}
      />
      {showAdd ? (
        <View style={styles.addForm}>
          <Input label="Name" value={name} onChangeText={setName} />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
          <Button title="Save" onPress={handleAdd} fullWidth />
        </View>
      ) : (
        <Button title="Add Contact" onPress={() => setShowAdd(true)} fullWidth style={styles.addBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56, paddingHorizontal: spacing.base },
  back: { marginBottom: spacing.md },
  title: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], marginBottom: spacing.lg },
  contact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12, marginBottom: spacing.sm },
  contactName: { fontFamily: typography.fontFamily.semiBold, color: colors.textPrimary },
  contactPhone: { fontFamily: typography.fontFamily.regular, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  addForm: { marginTop: spacing.lg },
  addBtn: { marginTop: spacing.lg, marginBottom: spacing['2xl'] },
});
