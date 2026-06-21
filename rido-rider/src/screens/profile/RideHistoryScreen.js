import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import { apiService } from '../../services/api';
import { useTheme } from '../../theme';

export default function RideHistoryScreen({ navigation }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const { colors, spacing, typography, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadRides();
  }, []);

  const loadRides = async () => {
    const { data } = await apiService.getMyRides();
    setRides(data?.data || []);
    setLoading(false);
  };

  const formatDate = (date) => {
    const d = dayjs(date);
    if (d.isSame(dayjs(), 'day')) return `Today, ${d.format('h:mm A')}`;
    return d.format('MMM D, h:mm A');
  };

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>Ride History</Text>
      </View>

      {rides.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="car-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: typography.fontFamily.bold }]}>No rides yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Your ride history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.date, { color: colors.textMuted, fontFamily: typography.fontFamily.medium }]}>
                  {formatDate(item.created_at)}
                </Text>
                <Text style={[
                  styles.status,
                  {
                    color: item.status === 'COMPLETED' ? colors.success : colors.danger,
                    fontFamily: typography.fontFamily.bold,
                    backgroundColor: item.status === 'COMPLETED'
                      ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                      : (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'),
                  }
                ]}>
                  {item.status}
                </Text>
              </View>

              {/* Route visualization */}
              <View style={styles.routeContainer}>
                <View style={styles.routeDots}>
                  <View style={[styles.dotGreen, { backgroundColor: colors.success }]} />
                  <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
                  <View style={[styles.dotRed, { backgroundColor: colors.danger }]} />
                </View>
                <View style={styles.routeTexts}>
                  <Text style={[styles.routeAddress, { color: colors.textPrimary, fontFamily: typography.fontFamily.medium }]} numberOfLines={1}>
                    {item.pickup_address}
                  </Text>
                  <Text style={[styles.routeAddress, { color: colors.textPrimary, fontFamily: typography.fontFamily.medium }]} numberOfLines={1}>
                    {item.drop_address}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.badgeRow}>
                  <Badge label={item.mode} variant={item.mode === 'SHARED' ? 'primary' : 'default'} />
                  {item.is_womens_ride && <Badge label="Women's" variant="pink" icon="👩" />}
                </View>
                <View style={styles.fareColumn}>
                  <Text style={[styles.fare, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
                    ₹{item.fare}
                  </Text>
                  {item.saved > 0 && (
                    <Text style={[styles.saved, { color: colors.success, fontFamily: typography.fontFamily.bold }]}>
                      saved ₹{item.saved}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  back: {},
  title: { fontSize: 24 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 100 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { fontSize: 18 },
  emptySubtext: { fontSize: 14, textAlign: 'center' },
  list: { paddingHorizontal: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: { fontSize: 12 },
  status: {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  routeDots: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    width: 12,
  },
  dotGreen: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, flex: 1, marginVertical: 4 },
  dotRed: { width: 8, height: 8, borderRadius: 2 },
  routeTexts: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  routeAddress: { fontSize: 13 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  fareColumn: { alignItems: 'flex-end' },
  fare: { fontSize: 16 },
  saved: { fontSize: 11, marginTop: 2 },
});
