import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme';

export default function Avatar({ name, uri, size = 48 }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
});
