import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import RidoMap from '../../components/map/RidoMap';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { useRide } from '../../hooks/useRide';
import { useAppStore } from '../../store/appStore';
import { DEFAULT_REGION } from '../../services/location';
import { useTheme } from '../../theme';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { location, permissionGranted, refresh } = useLocation();
  const { hasActiveRide } = useRide();
  const recentDestinations = useAppStore((s) => s.recentDestinations);
  const savedPlaces = useAppStore((s) => s.savedPlaces);

  const { colors, spacing, typography, isDark } = useTheme();

  useEffect(() => {
    if (hasActiveRide) {
      navigation.navigate('RideFlow', { screen: 'RideActive' });
    }
  }, [hasActiveRide]);

  const region = location
    ? { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : DEFAULT_REGION;

  const handleShortcutPress = (key) => {
    let targetPlace = null;
    if (key === 'home') targetPlace = savedPlaces.home;
    if (key === 'office') targetPlace = savedPlaces.work;

    if (!targetPlace && (key === 'home' || key === 'office' || key === 'saved' || key === 'hostel')) {
      targetPlace = { id: 'p1', name: key.toUpperCase(), address: `${key.charAt(0).toUpperCase() + key.slice(1)} Road, Madurai`, lat: 9.9195, lng: 78.1193 };
    }

    if (targetPlace) {
      navigation.navigate('RideFlow', {
        screen: 'RideOptions',
        params: {
          pickup: location ? { address: 'Current Location', lat: location.lat, lng: location.lng } : { address: 'Current Location', lat: 9.9252, lng: 78.1198 },
          drop: targetPlace,
        },
      });
    } else {
      navigation.navigate('RideFlow', { screen: 'DestinationSearch' });
    }
  };

  const shortcuts = [
    { key: 'recent', label: 'Recent', icon: 'time-outline', color: '#6366F1' },
    { key: 'home', label: 'Home', icon: 'home-outline', color: '#10B981' },
    { key: 'office', label: 'Office', icon: 'business-outline', color: '#F59E0B' },
    { key: 'saved', label: 'Saved', icon: 'heart-outline', color: '#EC4899' },
    { key: 'hostel', label: 'Hostel', icon: 'bed-outline', color: '#8B5CF6' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RidoMap region={region} showsUserLocation={permissionGranted} />

      {/* Floating Menu Button */}
      <View style={[styles.menuContainer, { top: insets.top + spacing.md }]}>
        <Pressable
          style={[
            styles.menuButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: isDark ? '#000' : '#0F172A',
            }
          ]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="menu" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Bottom Sheet */}
      <View style={[
        styles.bottomSheet,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + spacing.md
        }
      ]}>
        <View style={[styles.dragIndicator, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
        
        {!permissionGranted && (
          <Card style={styles.permissionCard}>
            <Text style={[styles.permissionText, { color: colors.textSecondary }]}>{t('home.locationDenied')}</Text>
            <Pressable onPress={refresh}>
              <Text style={[styles.permissionBtn, { color: colors.primary }]}>{t('home.enableLocation')}</Text>
            </Pressable>
          </Card>
        )}

        {/* Greeting */}
        <Text style={[styles.greeting, { color: colors.textMuted, fontFamily: typography.fontFamily.medium }]}>
          {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
        </Text>
        <Text style={[styles.heading, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>Where to?</Text>
        
        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
          onPress={() => navigation.navigate('RideFlow', { screen: 'DestinationSearch' })}
        >
          <View style={[styles.searchIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
            <Ionicons name="search" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.searchPlaceholder, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Search destination
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {/* Shortcuts Horizontal Grid */}
        <View style={styles.shortcutsRow}>
          {shortcuts.map((s) => (
            <Pressable key={s.key} style={styles.shortcutBtn} onPress={() => handleShortcutPress(s.key)}>
              <View style={[
                styles.shortcutIconContainer,
                {
                  backgroundColor: isDark ? s.color + '20' : s.color + '12',
                  borderColor: isDark ? s.color + '30' : s.color + '20',
                }
              ]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[
                styles.shortcutLabel,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: 11,
                }
              ]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Promo Card */}
        <Pressable
          style={[styles.promoCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)', borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.15)' }]}
          onPress={() => navigation.navigate('RideFlow', { screen: 'DestinationSearch', params: { preSelectedMode: 'SHARED' } })}
        >
          <View style={styles.promoLeft}>
            <Text style={[styles.promoTitle, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>
              👥 Try Shared Rides
            </Text>
            <Text style={[styles.promoDesc, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Save up to 50% on your trips
            </Text>
          </View>
          <View style={[styles.promoArrow, { backgroundColor: colors.primary }]}>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  menuContainer: { position: 'absolute', left: 16, zIndex: 10 },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 10,
    borderTopWidth: 1,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 12,
  },
  permissionCard: { marginBottom: 12, padding: 12 },
  permissionText: { fontSize: 14 },
  permissionBtn: { marginTop: 8, fontWeight: 'bold' },
  greeting: { fontSize: 13, marginBottom: 2 },
  heading: { fontSize: 22, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    gap: 10,
  },
  searchIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholder: { fontSize: 15, flex: 1 },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shortcutBtn: {
    alignItems: 'center',
    flex: 1,
  },
  shortcutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutLabel: {
    textAlign: 'center',
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  promoLeft: { flex: 1 },
  promoTitle: { fontSize: 14, marginBottom: 2 },
  promoDesc: { fontSize: 12 },
  promoArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
