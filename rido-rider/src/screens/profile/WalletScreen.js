import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import { apiService } from '../../services/api';
import { useTheme } from '../../theme';

const TOP_UP_AMOUNTS = [100, 200, 500, 1000];

export default function WalletScreen({ navigation }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const { colors, spacing, typography, isDark } = useTheme();
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

  const transactions = wallet?.transactions || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>

      {/* Gradient Wallet Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceCardOverlay} />
        <View style={styles.balanceCardContent}>
          <View style={styles.balanceHeader}>
            <View style={styles.walletIconBadge}>
              <Ionicons name="wallet" size={20} color="#FFF" />
            </View>
            <Text style={[styles.balanceLabel, { fontFamily: typography.fontFamily.medium }]}>Rido Wallet</Text>
          </View>
          <Text style={[styles.balance, { fontFamily: typography.fontFamily.bold }]}>
            ₹{(wallet?.balance || 0).toFixed(2)}
          </Text>
          <Text style={styles.balanceSub}>Available balance</Text>
        </View>
      </View>

      <Text style={[styles.section, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>Quick Top Up</Text>
      <View style={styles.amounts}>
        {TOP_UP_AMOUNTS.map((a) => (
          <Pressable
            key={a}
            style={[styles.amountBtn, { backgroundColor: colors.primaryLight, borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'transparent', borderWidth: 1 }]}
            onPress={() => handleAddMoney(a)}
          >
            <Text style={[styles.amountText, { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>₹{a}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>Transactions</Text>
      
      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: typography.fontFamily.medium }]}>No transactions yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>Add money to get started</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          renderItem={({ item }) => (
            <View style={[styles.txn, { borderBottomColor: colors.border }]}>
              <View style={[styles.txnIcon, { backgroundColor: item.amount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons 
                  name={item.amount > 0 ? 'arrow-down' : 'arrow-up'} 
                  size={16} 
                  color={item.amount > 0 ? colors.success : colors.danger} 
                />
              </View>
              <View style={styles.txnInfo}>
                <Text style={[styles.txnDesc, { color: colors.textPrimary, fontFamily: typography.fontFamily.medium }]}>{item.description}</Text>
                <Text style={[styles.txnDate, { color: colors.textMuted, fontFamily: typography.fontFamily.regular }]}>{dayjs(item.created_at).format('MMM D, h:mm A')}</Text>
              </View>
              <Text style={[styles.txnAmount, { color: item.amount > 0 ? colors.success : colors.danger, fontFamily: typography.fontFamily.bold }]}>
                {item.amount > 0 ? '+' : ''}₹{Math.abs(item.amount)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  back: { marginBottom: 12 },
  balanceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#10B981',
    position: 'relative',
  },
  balanceCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  balanceCardContent: {
    padding: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  walletIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  balance: { fontSize: 40, color: '#FFFFFF', marginBottom: 4 },
  balanceSub: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 },
  section: { fontSize: 16, marginBottom: 12 },
  amounts: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  amountBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  amountText: { fontSize: 15 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { fontSize: 16 },
  emptySubtext: { fontSize: 13 },
  txn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  txnIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14 },
  txnDate: { fontSize: 11, marginTop: 2 },
  txnAmount: { fontSize: 15 },
});
