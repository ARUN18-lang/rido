import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../theme';

const RidoMap = forwardRef(function RidoMap(
  { region, markers = [], route = [], showsUserLocation = true, style, onRegionChange, surgeZone },
  ref
) {
  const mapRef = useRef(null);
  const { colors, mapStyle } = useTheme();

  useImperativeHandle(ref, () => ({
    animateToRegion: (r, duration = 500) => mapRef.current?.animateToRegion(r, duration),
    fitToCoordinates: (coords) =>
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
        animated: true,
      }),
  }));

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        initialRegion={region}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        onRegionChangeComplete={onRegionChange}
      >
        {surgeZone && (
          <Circle
            center={{ latitude: surgeZone.lat, longitude: surgeZone.lng }}
            radius={surgeZone.radius || 400}
            strokeWidth={1.5}
            strokeColor="rgba(245, 158, 11, 0.6)"
            fillColor="rgba(245, 158, 11, 0.15)"
            lineDashPattern={[5, 5]}
          />
        )}
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.title}
            pinColor={m.color || colors.primary}
          />
        ))}
        {route.length > 1 && (
          <Polyline
            coordinates={route.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
});

export default RidoMap;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
