import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../theme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  prefix,
  keyboardType = 'default',
  maxLength,
  autoFocus,
  secureTextEntry,
  style,
  inputStyle,
  onSubmitEditing,
  returnKeyType,
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View style={[{ marginBottom: spacing.base }, style]}>
      {label ? (
        <Text
          style={[
            styles.label,
            {
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.size.sm,
              color: colors.textSecondary,
              marginBottom: spacing.sm,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.base,
            minHeight: 52,
          },
          error && { borderColor: colors.danger },
        ]}
      >
        {prefix ? (
          <Text
            style={[
              styles.prefix,
              {
                fontFamily: typography.fontFamily.semiBold,
                fontSize: typography.size.lg,
                color: colors.textPrimary,
                marginRight: spacing.sm,
              },
            ]}
          >
            {prefix}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoFocus={autoFocus}
          secureTextEntry={secureTextEntry}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          style={[
            {
              flex: 1,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.size.md,
              color: colors.textPrimary,
              paddingVertical: spacing.md,
            },
            inputStyle,
          ]}
        />
      </View>
      {error ? (
        <Text
          style={[
            styles.error,
            {
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.size.sm,
              color: colors.danger,
              marginTop: spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {},
  prefix: {},
  error: {},
});
