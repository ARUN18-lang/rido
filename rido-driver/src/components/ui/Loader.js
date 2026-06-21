import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

export default function Loader({ size = 'large', color = colors.primary, fullScreen = false }) {
  const content = <ActivityIndicator size={size} color={color} />;
  if (fullScreen) {
    return <View style={styles.full}>{content}</View>;
  }
  return content;
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
