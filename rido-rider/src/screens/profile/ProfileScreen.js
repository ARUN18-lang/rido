import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/appStore';
import i18n from '../../i18n';
import { useTheme } from '../../theme';

const MENU_ITEMS = [
  { key: 'RideHistory', icon: 'time-outline', labelKey: 'profile.rideHistory', color: '#6366F1' },
  { key: 'Wallet', icon: 'wallet-outline', labelKey: 'profile.wallet', color: '#10B981' },
  { key: 'EmergencyContacts', icon: 'shield-outline', labelKey: 'profile.emergencyContacts', color: '#F59E0B' },
  { key: 'SOS', icon: 'alert-circle-outline', labelKey: 'safety.sos', color: '#EF4444' },
  { key: 'language', icon: 'language-outline', labelKey: 'profile.language', color: '#8B5CF6' },
  { key: 'themeMode', icon: 'contrast-outline', labelKey: 'Theme Mode', color: '#0EA5E9' },
  { key: 'help', icon: 'help-circle-outline', labelKey: 'profile.help', color: '#64748B' },
];

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { language, setLanguage, themeMode, setThemeMode } = useAppStore();
  const { colors, spacing, typography, isDark } = useTheme();

  const handleMenu = (key) => {
    if (key === 'language') {
      const next = language === 'en' ? 'ta' : 'en';
      setLanguage(next);
      i18n.changeLanguage(next);
      return;
    }
    if (key === 'themeMode') {
      const next = themeMode === 'dark' ? 'light' : 'dark';
      setThemeMode(next);
      return;
    }
    if (key === 'help') return;
    navigation.navigate(key);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
    >
      {/* Profile Header Card */}
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.headerCardOverlay} />
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Avatar name={user?.name} uri={user?.profile_photo_url} size={72} />
          </View>
          <Text style={[styles.name, { fontFamily: typography.fontFamily.bold }]}>{user?.name}</Text>
          <Text style={styles.phone}>+91 {user?.phone}</Text>
          {user?.rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingStar}>⭐</Text>
              <Text style={[styles.ratingText, { fontFamily: typography.fontFamily.bold }]}>{user.rating}</Text>
              <Text style={styles.ratingLabel}>rider rating</Text>
            </View>
          )}
          <Text style={styles.memberSince}>Rido member since 2024</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item) => {
          if (item.key === 'womens' && user?.gender !== 'FEMALE') return null;
          const isTheme = item.key === 'themeMode';
          return (
            <Pressable
              key={item.key}
              style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => !isTheme && handleMenu(item.key)}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: isDark ? item.color + '20' : item.color + '12' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                {item.key === 'language'
                  ? `${t('profile.language')}: ${language === 'en' ? t('profile.english') : t('profile.tamil')}`
                  : item.key === 'themeMode'
                  ? `Dark Theme`
                  : t(item.labelKey)}
              </Text>
              {isTheme ? (
                <Switch
                  value={themeMode === 'dark'}
                  onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
                  trackColor={{ false: '#767577', true: colors.primary }}
                  thumbColor={themeMode === 'dark' ? colors.background : '#f4f3f4'}
                />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Logout */}
      <Pressable
        style={[styles.logout, { borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)' }]}
        onPress={async () => {
          useAppStore.setState({ hasSeenOnboarding: false });
          await signOut();
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={[styles.logoutText, { fontFamily: typography.fontFamily.semiBold }]}>{t('profile.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  headerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  headerCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 40,
    padding: 3,
    marginBottom: 12,
  },
  name: { fontSize: 22, color: '#FFFFFF', marginTop: 4 },
  phone: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginTop: 4 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 4,
  },
  ratingStar: { fontSize: 12 },
  ratingText: { fontSize: 14, color: '#FFFFFF' },
  ratingLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' },
  memberSince: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  menuSection: { gap: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  logoutText: { color: '#EF4444', fontSize: 15 },
});
