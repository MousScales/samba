import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Animated, Dimensions, Platform, Alert, Switch, Linking } from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';


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
  const { t } = useLanguage();

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  if (!user) return null;

  const isProvider = user.role === 'provider';
  const currentMode = user.currentMode || 'attendee';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {!isProvider ? (
        <TouchableOpacity
          style={[styles.settingItem, styles.settingCard]}
          onPress={onBecomeProvider}
          activeOpacity={0.7}
        >
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(64, 64, 64, 0.3)' }]}>
            <Icon name="briefcase" type="feather" size={22} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{t('settings.provider.become')}</Text>
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>{t('settings.provider.becomeSubtitle')}</Text>
          </View>
          <Icon name="chevron-right" type="feather" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.settingItem, styles.settingCard]}>
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
              {currentMode === 'provider' ? t('settings.provider.modeProvider') : t('settings.provider.modeAttendee')}
            </Text>
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              {currentMode === 'provider' ? t('settings.provider.switchToAttendee') : t('settings.provider.switchToProvider')}
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

const ScannerToggleItem = ({ user, onBecomeScanner, onSwitchMode, animatedValue }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  if (!user) return null;

  const isScanner = user.scannerInfo?.status === 'active';
  const currentMode = user.currentMode || 'attendee';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {!isScanner ? (
        <TouchableOpacity
          style={[styles.settingItem, styles.settingCard]}
          onPress={onBecomeScanner}
          activeOpacity={0.7}
        >
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(64, 64, 64, 0.3)' }]}>
            <Icon name="maximize" type="feather" size={22} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{t('settings.scanner.become')}</Text>
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>{t('settings.scanner.becomeSubtitle')}</Text>
          </View>
          <Icon name="chevron-right" type="feather" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.settingItem, styles.settingCard]}>
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(64, 64, 64, 0.3)' }]}>
            <Icon
              name={currentMode === 'scanner' ? 'maximize' : 'user'}
              type="feather"
              size={22}
              color={theme.colors.textSecondary}
            />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              {currentMode === 'scanner' ? t('settings.scanner.modeScanner') : t('settings.scanner.modeAttendee')}
            </Text>
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              {currentMode === 'scanner' ? t('settings.scanner.switchToAttendee') : t('settings.scanner.switchToScanner')}
            </Text>
          </View>
          <Switch
            value={currentMode === 'scanner'}
            onValueChange={(value) => onSwitchMode(value ? 'scanner' : 'attendee')}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,255,255,0.4)' }}
            thumbColor={currentMode === 'scanner' ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
      )}
    </Animated.View>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
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

  const handleBecomeScanner = () => {
    navigation.navigate('BecomeScanner');
  };

  const handleSwitchMode = async (mode) => {
    try {
      const result = await switchMode(mode);
      if (result.success) {
        Alert.alert(t('settings.alert.modeChanged.title'), t('settings.alert.modeChanged.message', { mode }));
        if (mode === 'scanner') {
          navigation.navigate('ScannerEvents');
        }
      } else {
        Alert.alert(t('common.error'), result.message);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.error.switchMode'));
    }
  };

  const handleSendFeedback = async () => {
    try {
      const url = 'https://forms.gle/A4ovpXJyd32V1riu7';
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('settings.error.feedbackOpen'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.error.feedbackFailed'));
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('settings.alert.logout.title'),
      t('settings.alert.logout.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout.title'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.error.logoutFailed'));
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
          <SectionTitle title={t('settings.section.account')} animatedValue={accountAnimation} />
          
          <ProviderToggleItem
            user={user}
            onBecomeProvider={handleBecomeProvider}
            onSwitchMode={handleSwitchMode}
            animatedValue={accountAnimation}
          />

          <ScannerToggleItem
            user={user}
            onBecomeScanner={handleBecomeScanner}
            onSwitchMode={handleSwitchMode}
            animatedValue={accountAnimation}
          />
          
          {/* Show Provider Dashboard link if user is a provider */}
          {user?.role === 'provider' && (
            <SettingItem
              icon="dollar-sign"
              title={t('settings.provider.dashboard')}
              subtitle={t('settings.provider.dashboardSubtitle')}
              onPress={() => navigation.navigate('ProviderDashboard')}
              index={1}
              animatedValue={accountAnimation}
            />
          )}

        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <SectionTitle title={t('settings.section.support')} animatedValue={supportAnimation} />
          
          <SettingItem
            icon="message-circle"
            title={t('settings.support.feedback')}
            subtitle={t('settings.support.feedbackSubtitle')}
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
                  {t('settings.version.label')}
                </Text>
                <Text style={[styles.versionNumber, { color: theme.colors.textSecondary }]}>
                  {t('settings.version.number')}
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
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{t('settings.logout.title')}</Text>
              <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>{t('settings.logout.subtitle')}</Text>
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
  settingCard: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 16,
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