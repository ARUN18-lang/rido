import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import Badge from '../../components/ui/Badge';
import Loader from '../../components/ui/Loader';
import { apiService } from '../../services/api';
import { useEarningsStore } from '../../store/earningsStore';
import { useTheme, colors, spacing, typography } from '../../theme';

const { width } = Dimensions.get('window');

export default function EarningsScreen({ navigation }) {
  const { colors, spacing, typography } = useTheme();
  const [tab, setTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const { todayEarnings, todayTrips, weekData, trips, setToday, setWeekData, setTrips } = useEarningsStore();

  useEffect(() => {
    apiService.getEarnings().then(({ data }) => {
      if (data?.data) {
        const res = data.data;
        if (res.total_earnings !== undefined) {
          // Real backend format: total_earnings, trip_count, breakdown
          setToday(res.total_earnings, res.trip_count || 0);

          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const mappedWeek = [
            { day: 'Mon', earnings: 0 },
            { day: 'Tue', earnings: 0 },
            { day: 'Wed', earnings: 0 },
            { day: 'Thu', earnings: 0 },
            { day: 'Fri', earnings: 0 },
            { day: 'Sat', earnings: 0 },
            { day: 'Sun', earnings: 0 },
          ];

          const tripsList = (res.breakdown || []).map((t, idx) => {
            const timeVal = t.created_at
              ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '12:00 PM';
            const routeStr = t.ride?.pickup_address
              ? `${t.ride.pickup_address} → ${t.ride.drop_address}`
              : 'Trip Completed';
            return {
              id: t.id || String(idx),
              time: timeVal,
              route: routeStr,
              earnings: Number(t.net_amount) || 0,
              mode: t.ride?.mode || 'SOLO',
            };
          });

          (res.breakdown || []).forEach((item) => {
            const date = item.created_at ? new Date(item.created_at) : new Date();
            const dayName = daysOfWeek[date.getDay()];
            const match = mappedWeek.find((w) => w.day === dayName);
            if (match) {
              match.earnings += Number(item.net_amount) || 0;
            }
          });

          setWeekData(mappedWeek);
          setTrips(tripsList);
        } else if (res.today) {
          // Mock format
          setToday(res.today.earnings, res.today.trips);
          setWeekData(res.week || []);
          setTrips(res.trips || []);
        }
      }
      setLoading(false);
    });
  }, []);

  const maxEarning = Math.max(...(weekData.map((d) => d.earnings) || [1]), 1);

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <View style={[styles.tabs, { backgroundColor: colors.surfaceSecondary }]}>
        {['today', 'week', 'month'].map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && [styles.tabActive, { backgroundColor: colors.surface }]]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, { color: colors.textMuted }, tab === t && [styles.tabTextActive, { color: colors.primary }]]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.bigNumber, { color: colors.textPrimary }]}>₹{todayEarnings}</Text>
      <Svg width={width - 48} height={120} style={styles.chart}>
        {weekData.map((d, i) => (
          <Rect
            key={d.day}
            x={i * ((width - 48) / 7) + 8}
            y={120 - (d.earnings / maxEarning) * 100}
            width={((width - 48) / 7) - 16}
            height={(d.earnings / maxEarning) * 100}
            fill={colors.primary}
            rx={4}
          />
        ))}
      </Svg>
      <View style={styles.statsRow}>
        <Text style={[styles.stat, { color: colors.textSecondary }]}>Trips: {todayTrips}</Text>
        <Text style={[styles.stat, { color: colors.textSecondary }]}>Avg: ₹{todayTrips ? Math.round(todayEarnings / todayTrips) : 0}</Text>
        <Text style={[styles.stat, { color: colors.textSecondary }]}>⭐ 4.8</Text>
      </View>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.trip, { backgroundColor: colors.surface }]}>
            <View>
              <Text style={[styles.tripTime, { color: colors.textMuted }]}>{item.time}</Text>
              <Text style={[styles.tripRoute, { color: colors.textPrimary }]}>{item.route}</Text>
            </View>
            <View style={styles.tripRight}>
              <Badge label={item.mode} variant={item.mode === 'SHARED' ? 'primary' : 'default'} />
              <Text style={[styles.tripEarnings, { color: colors.success }]}>₹{item.earnings}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56, paddingHorizontal: spacing.base },
  back: { marginBottom: spacing.md },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontFamily: typography.fontFamily.medium, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
  bigNumber: { fontFamily: typography.fontFamily.bold, fontSize: 48, color: colors.textPrimary, textAlign: 'center' },
  chart: { marginVertical: spacing.lg },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.lg },
  stat: { fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  trip: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, padding: spacing.base, borderRadius: 12, marginBottom: spacing.sm },
  tripTime: { fontFamily: typography.fontFamily.medium, color: colors.textMuted, fontSize: typography.size.sm },
  tripRoute: { fontFamily: typography.fontFamily.semiBold, marginTop: 4 },
  tripRight: { alignItems: 'flex-end', gap: 4 },
  tripEarnings: { fontFamily: typography.fontFamily.bold, color: colors.success },
});
