import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Animated, Dimensions, Platform, Alert, Switch, Linking } from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';


const { width } = Dimensions.get('window');

const SettingItem = ({ icon, title, subtitle, onPress, index, animatedValue }) => {
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  const { theme } = useTheme();
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity 
        style={[
          styles.settingItem, 
          { 
            backgroundColor: 'rgba(42, 42, 42, 0.8)',
            borderRadius: 16,
            marginBottom: 12,
            marginHorizontal: 16,
          }
        ]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.settingIcon, { backgroundColor: 'rgba(64, 64, 64, 0.3)' }]}>
          <Icon name={icon} type="feather" size={22} color={theme.colors.textSecondary} />
    </View>
    <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
    </View>
        <Icon name="chevron-right" type="feather" size={20} color={theme.colors.textSecondary} />
  </TouchableOpacity>
    </Animated.View>
  );
};

const SectionTitle = ({ title, animatedValue }) => {
  const { theme } = useTheme();
  
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateX }],
      }}
    >
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
    </Animated.View>
);
};

const ProviderToggleItem = ({ user, onBecomeProvider, onSwitchMode, animatedValue }) => {
  const { theme } = useTheme();
  
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  // Don't render anything if user data is not loaded yet
  if (!user) {
    return null;
  }

  const isProvider = user.role === 'provider';
  const currentMode = user.currentMode || 'attendee';
  
  console.log('ProviderToggleItem - User role:', user.role, 'isProvider:', isProvider);
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      {!isProvider ? (
        // Show "Become a Provider" button if not a provider
        <TouchableOpacity 
          style={[
            styles.settingItem, 
            { 
              backgroundColor: 'rgba(42, 42, 42, 0.8)',
              borderRadius: 16,
              marginBottom: 12,
              marginHorizontal: 16,
            }
          ]} 
          onPress={onBecomeProvider}
          activeOpacity={0.7}
        >
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(64, 64, 64, 0.3)' }]}>
            <Icon name="briefcase" type="feather" size={22} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Become Event Provider</Text>
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>Start organizing and selling events</Text>
          </View>
          <Icon name="chevron-right" type="feather" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        // Show mode toggle if user is a provider
        <View style={[
          styles.settingItem, 
          { 
            backgroundColor: 'rgba(42, 42, 42, 0.8)',
            borderRadius: 16,
            marginBottom: 12,
            marginHorizontal: 16,
          }
        ]}>
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(64, 64, 64, 0.3)' }]}>
            <Icon 
              name={currentMode === 'provider' ? 'briefcase' : 'user'} 
              type="feather" 
              size={22} 
              color={theme.colors.textSecondary} 
            />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              {currentMode === 'provider' ? 'Provider Mode' : 'Attendee Mode'}
            </Text>
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              {currentMode === 'provider' ? 'Switch to attendee view' : 'Switch to provider view'}
            </Text>
          </View>
          <Switch
            value={currentMode === 'provider'}
            onValueChange={(value) => onSwitchMode(value ? 'provider' : 'attendee')}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,255,255,0.4)' }}
            thumbColor={currentMode === 'provider' ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
      )}
    </Animated.View>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, becomeProvider, switchMode, logout } = useAuth();
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const accountAnimation = useRef(new Animated.Value(0)).current;
  const supportAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(accountAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(supportAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBecomeProvider = () => {
    navigation.navigate('BecomeProvider');
  };

  const handleSwitchMode = async (mode) => {
    try {
      const result = await switchMode(mode);
      if (result.success) {
        Alert.alert('Mode Changed', `Successfully switched to ${mode} mode`);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to switch mode. Please try again.');
    }
  };

  const handleSendFeedback = async () => {
    try {
      const url = 'https://forms.gle/A4ovpXJyd32V1riu7';
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open feedback form. Please try again later.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open feedback form. Please try again later.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <LinearGradient
        colors={['rgba(50, 50, 50, 0.4)', 'transparent']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, { paddingTop: 24 }]}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <SectionTitle title="Account" animatedValue={accountAnimation} />
          
          <ProviderToggleItem
            user={user}
            onBecomeProvider={handleBecomeProvider}
            onSwitchMode={handleSwitchMode}
            animatedValue={accountAnimation}
          />
          
          {/* Show Provider Dashboard link if user is a provider */}
          {user?.role === 'provider' && (
            <SettingItem
              icon="dollar-sign"
              title="Provider Dashboard"
              subtitle="View earnings and payment status"
              onPress={() => navigation.navigate('ProviderDashboard')}
              index={1}
              animatedValue={accountAnimation}
            />
          )}

        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <SectionTitle title="Support" animatedValue={supportAnimation} />
          
          <SettingItem
            icon="message-circle"
            title="Send Feedback"
            subtitle="Help us improve Samba"
            onPress={handleSendFeedback}
            index={0}
            animatedValue={supportAnimation}
          />
          
          {/* Version info - not a button anymore */}
          <Animated.View
            style={{
              opacity: supportAnimation,
              transform: [{ translateY: supportAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }) }],
              marginHorizontal: 16,
              marginTop: 8,
              marginBottom: 16
            }}
          >
            <View style={[styles.versionContainer, { backgroundColor: 'rgba(30, 30, 30, 0.5)' }]}>
              <View style={[styles.versionIconContainer, { backgroundColor: 'rgba(64, 64, 64, 0.2)' }]}>
                <Icon name="info" type="feather" size={20} color={theme.colors.textSecondary} />
              </View>
              <View>
                <Text style={[styles.versionLabel, { color: theme.colors.textSecondary }]}>
                  Version
                </Text>
                <Text style={[styles.versionNumber, { color: theme.colors.textSecondary }]}>
                  Samba 1.0.0
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Logout Button */}
        <Animated.View
          style={{
            opacity: supportAnimation,
            transform: [{ translateY: supportAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }) }],
            marginHorizontal: 16,
            marginTop: 24,
            marginBottom: 32
          }}
        >
          <TouchableOpacity 
            style={[
              styles.settingItem, 
              { 
                backgroundColor: 'rgba(42, 42, 42, 0.8)',
                borderRadius: 16,
              }
            ]} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(64, 64, 64, 0.3)' }]}>
              <Icon name="log-out" type="feather" size={22} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Logout</Text>
              <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>Sign out of your account</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 24,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  versionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  versionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  versionNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default SettingsScreen; 