import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchPlaces } from '../../services/mockData';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme';

export default function DestinationSearchScreen({ navigation, route }) {
  const addRecent = useAppStore((s) => s.addRecentDestination);
  const recentDestinations = useAppStore((s) => s.recentDestinations);
  const [pickup, setPickup] = useState(route.params?.pickup?.address || 'Current Location');
  const [drop, setDrop] = useState('');
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState('drop');
  const { colors, spacing, typography, radius, isDark } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setResults(searchPlaces(drop));
    }, 300);
    return () => clearTimeout(timer);
  }, [drop]);

  const selectPlace = (place) => {
    addRecent(place);
    navigation.navigate('RideOptions', {
      pickup: route.params?.pickup || { address: pickup, lat: 9.9252, lng: 78.1198 },
      drop: place,
      mode: route.params?.preSelectedMode,
      is_womens_ride: route.params?.preSelectedWomens,
    });
  };

  const listData = drop ? results : recentDestinations;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>Plan your ride</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : 'rgba(226, 232, 240, 0.6)', shadowColor: isDark ? '#000' : '#0F172A' }]}>
        <View style={styles.pathLineColumn}>
          <View style={[styles.dotGreen, { backgroundColor: colors.success }]} />
          <View style={[styles.lineConnector, { backgroundColor: colors.border }]} />
          <View style={[styles.dotRed, { backgroundColor: colors.danger }]} />
        </View>

        <View style={styles.inputsColumn}>
          <View style={[styles.inputField, { backgroundColor: colors.surfaceSecondary, borderColor: 'transparent' }, focused === 'pickup' && { borderColor: colors.primary, backgroundColor: colors.surface }]}>
            <TextInput
              value={pickup}
              onChangeText={setPickup}
              placeholder="Pickup Location"
              placeholderTextColor={colors.textMuted}
              onFocus={() => setFocused('pickup')}
              style={[styles.textInput, { color: colors.textPrimary, fontFamily: typography.fontFamily.medium }]}
            />
          </View>
          <View style={[styles.inputField, { backgroundColor: colors.surfaceSecondary, borderColor: 'transparent' }, focused === 'drop' && { borderColor: colors.primary, backgroundColor: colors.surface }]}>
            <TextInput
              value={drop}
              onChangeText={setDrop}
              placeholder="Where to?"
              placeholderTextColor={colors.textMuted}
              onFocus={() => setFocused('drop')}
              autoFocus
              style={[styles.textInput, { color: colors.textPrimary, fontFamily: typography.fontFamily.medium }]}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted, fontFamily: typography.fontFamily.bold }]}>{drop ? 'Search Results' : 'Recent Destinations'}</Text>
      
      {listData.length === 0 && !drop && (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: typography.fontFamily.medium }]}>No recent destinations</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>Start typing to search for a place</Text>
        </View>
      )}

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.resultItem, { borderBottomColor: isDark ? colors.border : 'rgba(226, 232, 240, 0.6)' }]}
            onPress={() => selectPlace(item)}
          >
            <View style={[styles.resultIconCircle, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name={drop ? 'location' : 'time'} size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.resultInfo}>
              <Text style={[styles.resultName, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold }]}>{item.name}</Text>
              <Text style={[styles.resultAddr, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>{item.address}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 18 },
  searchContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 20,
  },
  pathLineColumn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginRight: 12,
    width: 20,
  },
  dotGreen: { width: 8, height: 8, borderRadius: 4 },
  lineConnector: { width: 2, flex: 1, marginVertical: 4 },
  dotRed: { width: 8, height: 8, borderRadius: 2 },
  inputsColumn: { flex: 1, gap: 8 },
  inputField: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1.5,
  },
  textInput: {
    fontSize: 14,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: { fontSize: 16 },
  emptySubtext: { fontSize: 13 },
  listContent: { paddingHorizontal: 16 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  resultIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14 },
  resultAddr: { fontSize: 12 },
});
