import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import { apiService } from '../../services/api';
import { useTheme, colors, spacing, typography } from '../../theme';

export default function RideHistoryScreen({ navigation }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const { colors, spacing, typography } = useTheme();
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
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Ride History</Text>
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={[styles.date, { color: colors.textMuted }]}>{formatDate(item.created_at)}</Text>
            <Text style={[styles.route, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.pickup_address} → {item.drop_address}
            </Text>
            <View style={styles.row}>
              <Badge label={item.mode} variant={item.mode === 'SHARED' ? 'primary' : 'default'} />
              {item.is_womens_ride && <Badge label="Women's" variant="pink" icon="👩" />}
              <Text style={[styles.fare, { color: colors.textPrimary }]}>
                ₹{item.fare}
                {item.saved > 0 && ` (saved ₹${item.saved})`}
              </Text>
            </View>
            <Text style={[styles.status, { color: item.status === 'COMPLETED' ? colors.success : colors.danger }]}>
              {item.status}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56 },
  back: { paddingHorizontal: spacing.base, marginBottom: spacing.md },
  title: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], paddingHorizontal: spacing.base, marginBottom: spacing.md },
  list: { padding: spacing.base },
  card: { marginBottom: spacing.md },
  date: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.textMuted },
  route: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, color: colors.textPrimary, marginVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  fare: { fontFamily: typography.fontFamily.bold, color: colors.textPrimary, marginLeft: 'auto' },
  status: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, marginTop: spacing.sm },
});
