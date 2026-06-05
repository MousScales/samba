import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl
} from 'react-native';
import { Text, useTheme, Icon, Button, Card } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { stripeService } from '../services/stripeService';
import { authService } from '../services/authService';

const ProviderDashboardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectStatus, setConnectStatus] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Get auth token
      const token = await authService.getToken();
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      // Load Connect status, dashboard data, and verification status
      const [statusResult, dashboardResult, verificationResult] = await Promise.all([
        stripeService.getConnectStatus(token),
        stripeService.getProviderDashboard(token).catch(() => null), // Dashboard might fail if account not ready
        authService.getIdentityVerificationStatus(token).catch(() => null) // Verification status
      ]);

      setConnectStatus(statusResult);
      setDashboardData(dashboardResult);
      setVerificationStatus(verificationResult);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const handleSetupAccount = async () => {
    try {
      const token = await authService.getToken();
      const result = await stripeService.createOnboardingLink(token);
      
      if (result.success && result.onboardingUrl) {
        Linking.openURL(result.onboardingUrl);
      } else if (result.message) {
        Alert.alert('Demo Mode', result.message);
      } else {
        Alert.alert('Demo Mode', 'Payment setup is simulated in this build.');
      }
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      Alert.alert('Error', 'Failed to setup account');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'enabled': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'restricted': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'enabled': return 'Active';
      case 'pending': return 'Pending Verification';
      case 'restricted': return 'Restricted';
      default: return 'Not Set Up';
    }
  };

  const formatCurrency = (amount, currency = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#4CAF50';
      case 'submitted': return '#FF9800';
      case 'rejected': return '#F44336';
      case 'pending': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getVerificationStatusText = (status) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'submitted': return 'Under Review';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending Submission';
      default: return 'Not Started';
    }
  };

  const renderIdentityVerification = () => (
    <Card containerStyle={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Icon name="shield" type="feather" size={24} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Identity Verification</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getVerificationStatusColor(verificationStatus?.verificationStatus?.status) }]}>
          <Text style={styles.statusText}>{getVerificationStatusText(verificationStatus?.verificationStatus?.status)}</Text>
        </View>
      </View>

      <View style={styles.statusDetails}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>ID Type:</Text>
          <Text style={[styles.statusValue, { color: theme.colors.text }]}>
            {verificationStatus?.verificationStatus?.idType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>Documents Uploaded:</Text>
          <Icon
            name={verificationStatus?.verificationStatus?.hasDocuments ? "check-circle" : "x-circle"}
            type="feather"
            size={20}
            color={verificationStatus?.verificationStatus?.hasDocuments ? '#4CAF50' : '#F44336'}
          />
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>Duplicate Check:</Text>
          <Icon
            name={verificationStatus?.verificationStatus?.duplicateCheckStatus === 'unique' ? "check-circle" : 
                 verificationStatus?.verificationStatus?.duplicateCheckStatus === 'duplicate' ? "x-circle" : "clock"}
            type="feather"
            size={20}
            color={verificationStatus?.verificationStatus?.duplicateCheckStatus === 'unique' ? '#4CAF50' : 
                  verificationStatus?.verificationStatus?.duplicateCheckStatus === 'duplicate' ? '#F44336' : '#FF9800'}
          />
        </View>
        
        {verificationStatus?.verificationStatus?.submittedAt && (
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: theme.colors.text }]}>Submitted:</Text>
            <Text style={[styles.statusValue, { color: theme.colors.text }]}>
              {new Date(verificationStatus.verificationStatus.submittedAt).toLocaleDateString()}
            </Text>
          </View>
        )}

        {verificationStatus?.verificationStatus?.rejectionReason && (
          <View style={styles.rejectionSection}>
            <Text style={[styles.rejectionTitle, { color: '#F44336' }]}>Rejection Reason:</Text>
            <Text style={[styles.rejectionText, { color: theme.colors.text }]}>
              {verificationStatus.verificationStatus.rejectionReason}
            </Text>
          </View>
        )}
      </View>

      {verificationStatus?.verificationStatus?.status === 'pending' && (
        <View style={styles.infoSection}>
          <Icon name="info" type="feather" size={16} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            Complete your provider application to submit identity verification.
          </Text>
        </View>
      )}
    </Card>
  );

  const renderAccountStatus = () => (
    <Card containerStyle={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Icon name="credit-card" type="feather" size={24} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Payment Account</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(connectStatus?.account?.status) }]}>
          <Text style={styles.statusText}>{getStatusText(connectStatus?.account?.status)}</Text>
        </View>
      </View>

      <View style={styles.statusDetails}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>Account ID:</Text>
          <Text style={[styles.statusValue, { color: theme.colors.text }]}>
            {connectStatus?.account?.id?.slice(-8) || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>Details Submitted:</Text>
          <Icon
            name={connectStatus?.account?.detailsSubmitted ? "check-circle" : "x-circle"}
            type="feather"
            size={20}
            color={connectStatus?.account?.detailsSubmitted ? '#4CAF50' : '#F44336'}
          />
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>Charges Enabled:</Text>
          <Icon
            name={connectStatus?.account?.chargesEnabled ? "check-circle" : "x-circle"}
            type="feather"
            size={20}
            color={connectStatus?.account?.chargesEnabled ? '#4CAF50' : '#F44336'}
          />
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text }]}>Payouts Enabled:</Text>
          <Icon
            name={connectStatus?.account?.payoutsEnabled ? "check-circle" : "x-circle"}
            type="feather"
            size={20}
            color={connectStatus?.account?.payoutsEnabled ? '#4CAF50' : '#F44336'}
          />
        </View>
      </View>

      {!connectStatus?.account?.chargesEnabled && (
        <Button
          title="Complete Account Setup"
          onPress={handleSetupAccount}
          buttonStyle={styles.setupButton}
          titleStyle={styles.setupButtonText}
        />
      )}
    </Card>
  );

  const renderEarnings = () => (
    <Card containerStyle={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Icon name="dollar-sign" type="feather" size={24} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Earnings</Text>
        </View>
      </View>

      <View style={styles.earningsGrid}>
        <View style={styles.earningsItem}>
          <Text style={[styles.earningsAmount, { color: theme.colors.primary }]}>
            ${dashboardData?.totalEarnings?.toFixed(2) || '0.00'}
          </Text>
          <Text style={[styles.earningsLabel, { color: theme.colors.text }]}>Total Earnings</Text>
        </View>
        
        <View style={styles.earningsItem}>
          <Text style={[styles.earningsAmount, { color: theme.colors.primary }]}>
            ${dashboardData?.totalPayouts?.toFixed(2) || '0.00'}
          </Text>
          <Text style={[styles.earningsLabel, { color: theme.colors.text }]}>Total Payouts</Text>
        </View>
      </View>

      {dashboardData?.balance && (
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceTitle, { color: theme.colors.text }]}>Account Balance</Text>
          {dashboardData.balance.available?.map((balance, index) => (
            <View key={index} style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: theme.colors.text }]}>
                Available ({balance.currency.toUpperCase()}):
              </Text>
              <Text style={[styles.balanceAmount, { color: theme.colors.primary }]}>
                {formatCurrency(balance.amount, balance.currency)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );

  const renderRecentTransactions = () => (
    <Card containerStyle={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Icon name="list" type="feather" size={24} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Recent Transactions</Text>
        </View>
      </View>

      {dashboardData?.transactions && dashboardData.transactions.length > 0 ? (
        <View style={styles.transactionsList}>
          {dashboardData.transactions.slice(0, 5).map((transaction, index) => (
            <View key={index} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionType, { color: theme.colors.text }]}>
                  {transaction.description || transaction.type}
                </Text>
                <Text style={[styles.transactionDate, { color: theme.colors.text }]}>
                  {new Date(transaction.created * 1000).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: transaction.amount > 0 ? '#4CAF50' : '#F44336' }
              ]}>
                {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount, transaction.currency)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.noTransactions, { color: theme.colors.text }]}>
          No transactions yet
        </Text>
      )}
    </Card>
  );

  const renderPlatformFeeInfo = () => (
    <Card containerStyle={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Icon name="info" type="feather" size={24} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Platform Fee Structure</Text>
        </View>
      </View>

      <View style={styles.feeInfo}>
        <Text style={[styles.feeText, { color: theme.colors.text }]}>
          • You keep <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>90%</Text> of all ticket sales
        </Text>
        <Text style={[styles.feeText, { color: theme.colors.text }]}>
          • Platform takes <Text style={{ fontWeight: 'bold' }}>10%</Text> service fee
        </Text>
        <Text style={[styles.feeText, { color: theme.colors.text }]}>
          • Payments are automatically split on purchase
        </Text>
        <Text style={[styles.feeText, { color: theme.colors.text }]}>
          • Payouts are processed by Stripe according to your settings
        </Text>
      </View>
    </Card>
  );

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['rgba(50, 50, 50, 0.4)', 'rgba(0, 0, 0, 0)']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" type="feather" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Dashboard</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Icon name="refresh-cw" type="feather" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {verificationStatus && renderIdentityVerification()}
        {connectStatus && renderAccountStatus()}
        {renderEarnings()}
        {dashboardData && renderRecentTransactions()}
        {renderPlatformFeeInfo()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusDetails: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  setupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  earningsItem: {
    alignItems: 'center',
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  balanceSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionsList: {
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  noTransactions: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  feeInfo: {
    marginTop: 8,
  },
  feeText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  rejectionSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default ProviderDashboardScreen; 
 
 