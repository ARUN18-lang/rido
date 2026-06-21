import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '../../theme';

export default function DriverMarker({ coordinate, heading = 0 }) {
  const rotation = useRef(new Animated.Value(heading)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: heading,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [heading]);

  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <Animated.View style={[styles.marker, { transform: [{ rotate }] }]}>
        <Text style={styles.car}>🚗</Text>
      </Animated.View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  car: { fontSize: 24 },
});
