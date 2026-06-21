import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import { apiService } from '../../services/api';
import { useTheme, colors, spacing, typography } from '../../theme';

const TOP_UP_AMOUNTS = [100, 200, 500, 1000];

export default function WalletScreen({ navigation }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    const { data } = await apiService.getWallet();
    setWallet(data?.data);
    setLoading(false);
  };

  const handleAddMoney = async (amount) => {
    await apiService.initiatePayment({ amount, type: 'WALLET_TOPUP' });
    setWallet((w) => ({ ...w, balance: (w?.balance || 0) + amount }));
  };

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.balanceLabel}>Rido Wallet</Text>
        <Text style={styles.balance}>₹{(wallet?.balance || 0).toFixed(2)}</Text>
      </View>
      <Text style={[styles.section, { color: colors.textPrimary }]}>Add Money</Text>
      <View style={styles.amounts}>
        {TOP_UP_AMOUNTS.map((a) => (
          <Pressable key={a} style={[styles.amountBtn, { backgroundColor: colors.primaryLight }]} onPress={() => handleAddMoney(a)}>
            <Text style={[styles.amountText, { color: colors.primary }]}>₹{a}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.section, { color: colors.textPrimary }]}>Transactions</Text>
      <FlatList
        data={wallet?.transactions || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        renderItem={({ item }) => (
          <View style={[styles.txn, { borderBottomColor: colors.border }]}>
            <Text style={[styles.txnDesc, { color: colors.textPrimary }]}>{item.description}</Text>
            <View>
              <Text style={[styles.txnAmount, { color: item.amount > 0 ? colors.success : colors.danger }]}>
                {item.amount > 0 ? '+' : ''}₹{Math.abs(item.amount)}
              </Text>
              <Text style={[styles.txnDate, { color: colors.textMuted }]}>{dayjs(item.created_at).format('MMM D, h:mm A')}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56, paddingHorizontal: spacing.base },
  back: { marginBottom: spacing.md },
  balanceCard: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.xl, marginBottom: spacing.xl },
  balanceLabel: { fontFamily: typography.fontFamily.medium, color: 'rgba(255,255,255,0.8)' },
  balance: { fontFamily: typography.fontFamily.bold, fontSize: 36, color: colors.textWhite, marginTop: spacing.sm },
  section: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.md, color: colors.textPrimary, marginBottom: spacing.md },
  amounts: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  amountBtn: { flex: 1, backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: 12, alignItems: 'center' },
  amountText: { fontFamily: typography.fontFamily.semiBold, color: colors.primary },
  txn: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  txnDesc: { fontFamily: typography.fontFamily.medium, color: colors.textPrimary },
  txnAmount: { fontFamily: typography.fontFamily.bold, textAlign: 'right' },
  txnDate: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted, textAlign: 'right' },
});
