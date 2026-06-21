import { useAppStore } from '../store/appStore';

export const colorsLight = {
  primary: '#10B981', // Emerald Green
  primaryDark: '#059669',
  primaryLight: '#ECFDF5',
  secondary: '#0F766E', // Teal secondary
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  pink: '#EC4899',
  pinkLight: '#FDF2F8',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',
  mapOverlay: 'rgba(15, 23, 42, 0.45)',
};

export const colorsDark = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#064E3B',
  secondary: '#0F766E',
  success: '#10B981',
  warning: '#FBBF24',
  danger: '#EF4444',
  pink: '#F472B6',
  pinkLight: '#4C0519',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  border: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  textWhite: '#FFFFFF',
  mapOverlay: 'rgba(15, 23, 42, 0.65)',
};

// Default export colors for static uses (compat)
export const colors = colorsLight;

export const typography = {
  fontFamily: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  size: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// Static default shadows (compat)
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  button: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  }
};

export const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#F1F5F9' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F8FAFC' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E2E8F0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#E2E8F0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#CBD5E1' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#E0F2FE' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#0284C7' }] }
];

export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F172A' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B1329' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3B82F6' }] }
];

export function useTheme() {
  const themeMode = useAppStore((state) => state.themeMode) || 'light';
  const currentColors = themeMode === 'dark' ? colorsDark : colorsLight;
  const currentMapStyle = themeMode === 'dark' ? darkMapStyle : mapStyle;

  const currentShadows = {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: themeMode === 'dark' ? 0.2 : 0.05,
      shadowRadius: 16,
      elevation: 3,
    },
    modal: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: themeMode === 'dark' ? 0.3 : 0.1,
      shadowRadius: 24,
      elevation: 10,
    },
    button: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: themeMode === 'dark' ? 0.35 : 0.2,
      shadowRadius: 8,
      elevation: 4,
    }
  };

  return {
    colors: currentColors,
    typography,
    spacing,
    radius,
    shadows: currentShadows,
    mapStyle: currentMapStyle,
    isDark: themeMode === 'dark',
  };
}

export default { colors, typography, spacing, radius, shadows, mapStyle, darkMapStyle, useTheme };
