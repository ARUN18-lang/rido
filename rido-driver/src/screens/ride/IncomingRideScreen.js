import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RideRequestCard from '../../components/RideRequestCard';
import WaypointList from '../../components/WaypointList';
import Button from '../../components/ui/Button';
import { useRideStore } from '../../store/rideStore';
import { acceptRide, declineRide } from '../../services/socket';
import { useTheme, colors, spacing, typography } from '../../theme';

export default function IncomingRideScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useTheme();
  const ride = route.params?.ride;
  const { setActiveRide, clearIncomingRide } = useRideStore();
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => {
    Vibration.vibrate([0, 500, 200, 500]);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      declineRide(ride?.id);
      clearIncomingRide();
      navigation.goBack();
      return;
    }
    const t = setTimeout(() => {
      setTimeLeft((s) => s - 1);
      if (timeLeft <= 5) Vibration.vibrate(200);
    }, 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const handleAccept = () => {
    acceptRide(ride.id);
    setActiveRide(ride);
    clearIncomingRide();
    navigation.replace('RideActive', { ride });
  };

  const handleDecline = () => {
    declineRide(ride.id);
    clearIncomingRide();
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.contentWrap}>
        <RideRequestCard ride={ride} countdown={timeLeft} />
        {ride?.waypoints && <WaypointList waypoints={ride.waypoints} dropAddress={ride.drop_address} />}
      </View>
      <View style={styles.actions}>
        <Button 
          title="Decline Offer" 
          variant="outline" 
          onPress={handleDecline} 
          style={styles.declineBtn} 
        />
        <Button 
          title="Accept Ride" 
          onPress={handleAccept} 
          style={styles.acceptBtn} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.base },
  contentWrap: { flex: 1, gap: spacing.md, justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  declineBtn: { flex: 1, minHeight: 56, borderColor: colors.danger, borderWidth: 1.5 },
  acceptBtn: { flex: 1.2, minHeight: 56, backgroundColor: colors.success, borderColor: colors.success },
});
