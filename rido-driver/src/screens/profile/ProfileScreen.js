import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/appStore';
import i18n from '../../i18n';
import { useTheme, colors, spacing, typography } from '../../theme';

const MENU_ITEMS = [
  { key: 'RideHistory', icon: 'time-outline', labelKey: 'profile.rideHistory' },
  { key: 'Wallet', icon: 'wallet-outline', labelKey: 'profile.wallet' },
  { key: 'EmergencyContacts', icon: 'shield-outline', labelKey: 'profile.emergencyContacts' },
  { key: 'SOS', icon: 'alert-circle-outline', labelKey: 'safety.sos' },
  { key: 'language', icon: 'language-outline', labelKey: 'profile.language' },
  { key: 'themeMode', icon: 'contrast-outline', labelKey: 'Theme Mode' },
  { key: 'help', icon: 'help-circle-outline', labelKey: 'profile.help' },
];

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { language, setLanguage, themeMode, setThemeMode } = useAppStore();
  const { colors, spacing, typography } = useTheme();

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
    <ScrollView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.header}>
        <Avatar name={user?.name} uri={user?.profile_photo_url} size={72} />
        <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name}</Text>
        <Text style={[styles.phone, { color: colors.textSecondary }]}>+91 {user?.phone}</Text>
        {user?.rating && <Text style={styles.rating}>⭐ {user.rating} driver rating</Text>}
      </View>
      {MENU_ITEMS.map((item) => {
        if (item.key === 'womens' && user?.gender !== 'FEMALE') return null;
        const isTheme = item.key === 'themeMode';
        return (
          <Pressable
            key={item.key}
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => !isTheme && handleMenu(item.key)}
          >
            <Ionicons name={item.icon} size={22} color={colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
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
      <Pressable
        style={styles.logout}
        onPress={async () => {
          useAppStore.setState({ hasSeenOnboarding: false });
          await signOut();
        }}
      >
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.base },
  header: { alignItems: 'center', marginBottom: spacing['2xl'] },
  name: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl, marginTop: spacing.md },
  phone: { fontFamily: typography.fontFamily.regular, marginTop: 4 },
  rating: { fontFamily: typography.fontFamily.medium, color: colors.warning, marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderRadius: 12, marginBottom: spacing.sm, gap: spacing.md, borderWidth: 1 },
  menuLabel: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: typography.size.base },
  logout: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: 40 },
  logoutText: { fontFamily: typography.fontFamily.semiBold, color: colors.danger, fontSize: typography.size.md },
});
