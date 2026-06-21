import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import FareBreakdown from '../../components/ride/FareBreakdown';
import { useRideStore } from '../../store/rideStore';
import { useTheme } from '../../theme';

export default function RideSummaryScreen({ navigation, route }) {
  const { t } = useTranslation();
  const ride = route.params?.ride;
  const clearRide = useRideStore((s) => s.clearRide);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const checkScale = useSharedValue(0);

  const { colors, spacing, typography, isDark } = useTheme();

  React.useEffect(() => {
    checkScale.value = withSpring(1, { damping: 10, stiffness: 80 });
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleSubmitRating = () => {
    setSubmitted(true);
  };

  const handleBookAnother = () => {
    clearRide();
    navigation.popToTop();
    navigation.getParent()?.navigate('Main');
  };

  const isShared = ride?.mode === 'SHARED';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.checkCircle, { backgroundColor: colors.success, shadowColor: colors.success }, checkStyle]}>
        <Ionicons name="checkmark-sharp" size={40} color={colors.textWhite} />
      </Animated.View>
      <Text style={[styles.heading, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>Ride Completed!</Text>

      <Card style={[styles.fareCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.fareHeader, { borderBottomColor: isDark ? colors.border : 'rgba(226, 232, 240, 0.6)' }]}>
          <Text style={[styles.fareLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold }]}>Total Fare</Text>
          {isShared ? (
            <View>
              <Text style={[styles.fareAmount, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>₹{ride?.fare_estimate || 72}</Text>
              <Text style={[styles.saved, { color: colors.success, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>Saved ₹{ride?.pool?.savings || 76} with Shared</Text>
            </View>
          ) : (
            <Text style={[styles.fareAmount, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>₹{ride?.fare_estimate || 148}</Text>
          )}
        </View>
        <FareBreakdown
          total={ride?.fare_estimate || 148}
          items={[
            { label: 'Distance Traveled', value: `${ride?.distance_km || 8.2} km` },
            { label: 'Trip Duration', value: `${ride?.duration_min || 24} min` },
          ]}
        />
      </Card>

      <View style={styles.paymentMethod}>
        <Ionicons 
          name={ride?.payment_method === 'CASH' ? 'cash-outline' : 'phone-portrait-outline'} 
          size={18} 
          color={colors.textSecondary} 
        />
        <Text style={[styles.paymentText, { color: colors.textSecondary, fontFamily: typography.fontFamily.bold }]}>
          {ride?.payment_method === 'CASH' ? 'Paid with Cash' : 'Paid via digital UPI'}
        </Text>
      </View>

      {!submitted ? (
        <View style={[styles.ratingSection, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : 'rgba(226, 232, 240, 0.6)' }]}>
          <Text style={[styles.ratingTitle, { color: colors.textMuted, fontFamily: typography.fontFamily.bold }]}>Rate your experience</Text>
          <View style={styles.driverRow}>
            <Avatar name={ride?.driver?.name} size={48} />
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>{ride?.driver?.name || 'Driver'}</Text>
              <Text style={[styles.driverSub, { color: colors.textSecondary, fontFamily: typography.fontFamily.medium }]}>Rate your trip with this captain</Text>
            </View>
          </View>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => setRating(s)} style={styles.starPressable}>
                <Ionicons 
                  name={s <= rating ? 'star' : 'star-outline'} 
                  size={36} 
                  color={s <= rating ? '#F59E0B' : colors.border} 
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.comment, { borderColor: isDark ? colors.border : 'rgba(226, 232, 240, 0.8)', color: colors.textPrimary, backgroundColor: colors.surfaceSecondary }]}
            placeholder="Add a feedback note (optional)..."
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />
          <Button title="Submit Review" onPress={handleSubmitRating} fullWidth disabled={!rating} />
        </View>
      ) : (
        <View style={styles.thanksContainer}>
          <Ionicons name="heart-circle" size={48} color={colors.success} />
          <Text style={[styles.thanks, { color: colors.success, fontFamily: typography.fontFamily.bold }]}>Thanks for your feedback!</Text>
        </View>
      )}

      <Button title="Book Another Ride" onPress={handleBookAnother} variant="outline" fullWidth style={styles.bookAnother} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 24, paddingTop: 64, paddingBottom: 40 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  heading: { fontSize: 26, textAlign: 'center', marginBottom: 24 },
  fareCard: { marginBottom: 12, padding: 20, borderRadius: 20, borderWidth: 1 },
  fareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingBottom: 12, marginBottom: 12 },
  fareLabel: { fontSize: 14 },
  fareAmount: { fontSize: 26 },
  saved: { fontWeight: 'bold', fontSize: 11, marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  paymentText: { fontSize: 13 },
  ratingSection: { marginBottom: 24, padding: 16, borderRadius: 20, borderWidth: 1 },
  ratingTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16 },
  driverSub: { fontSize: 11, marginTop: 2 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  starPressable: { padding: 4 },
  comment: { borderWidth: 1.5, borderRadius: 16, padding: 12, marginBottom: 20, minHeight: 80, textAlignVertical: 'top' },
  thanksContainer: { alignItems: 'center', gap: 8, marginVertical: 24 },
  thanks: { fontSize: 16, textAlign: 'center' },
  bookAnother: { marginTop: 12 },
});
