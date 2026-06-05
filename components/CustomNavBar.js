import React, { useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, Animated, Alert } from 'react-native';
import { Icon, Text, Avatar, useTheme } from '@rneui/themed';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const TAB_SCREENS = ['Home', 'Explore', 'Profile', 'ManageEvents', 'Create', 'Dashboard'];

const CHAR_DELAY = 45; // ms per character

// Single animated tab — icon when inactive, typed text when active
const NavTab = ({ icon, iconType = 'feather', label, isActive, onPress, isAvatar, avatarSource, avatarTitle }) => {
  const [visibleChars, setVisibleChars] = useState(isActive ? label.length : 0);
  const iconAnim = useRef(new Animated.Value(isActive ? 0 : 1)).current;
  const typingTimer = useRef(null);

  useEffect(() => {
    if (typingTimer.current) clearInterval(typingTimer.current);

    if (isActive) {
      // Fade icon out first, then type text in
      Animated.timing(iconAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      setVisibleChars(0);
      let i = 0;
      typingTimer.current = setInterval(() => {
        i += 1;
        setVisibleChars(i);
        if (i >= label.length) clearInterval(typingTimer.current);
      }, CHAR_DELAY);
    } else {
      // Instantly clear text, fade icon back in
      setVisibleChars(0);
      Animated.timing(iconAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }

    return () => clearInterval(typingTimer.current);
  }, [isActive]);

  const displayedText = label.slice(0, visibleChars);

  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      {/* Icon */}
      <Animated.View style={[styles.tabIconWrap, { opacity: iconAnim }]}>
        {isAvatar ? (
          <Avatar
            size={26}
            rounded
            source={avatarSource}
            title={avatarTitle}
            titleStyle={{ fontSize: 12, fontWeight: 'bold' }}
          />
        ) : (
          <Icon name={icon} type={iconType} size={22} color="#9E9E9E" />
        )}
      </Animated.View>

      {/* Typed text */}
      {isActive && (
        <View style={styles.tabTextWrap}>
          <Text style={styles.tabActiveLabel}>{displayedText}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const DOUBLE_TAP_MS = 300;

const CustomNavBar = ({ activeScreen }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user, switchMode } = useAuth();
  const { t } = useLanguage();
  const currentMode = user?.currentMode || 'attendee';
  const isProvider = user?.role === 'provider';
  const profileTapRef = useRef(null);
  const switchingRef = useRef(false);

  const navigateTo = (screenName) => {
    if (activeScreen === screenName) return;
    const state = navigation.getState();
    const atTabRoot = state.routes.length === 1 && TAB_SCREENS.includes(state.routes[0].name);
    if (atTabRoot) {
      navigation.replace(screenName);
    } else {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: screenName }] }));
    }
  };

  const avatarSource = user?.profilePicture ? { uri: user.profilePicture } : undefined;
  const avatarTitle = !user?.profilePicture
    ? (user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U')
    : undefined;

  const orgAvatar = user?.providerInfo?.partyLogo;
  const orgName = user?.providerInfo?.organizationName || user?.name;
  const orgAvatarSource = orgAvatar ? { uri: orgAvatar } : undefined;
  const orgAvatarTitle = !orgAvatar
    ? (orgName ? orgName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'EH')
    : undefined;

  const toggleRoleMode = async () => {
    if (switchingRef.current) return;

    if (!isProvider) {
      Alert.alert(
        t('profile.alert.notProvider.title'),
        t('profile.alert.notProvider.message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.alert.notProvider.goToSettings'), onPress: () => navigation.navigate('Settings') },
        ],
      );
      return;
    }

    switchingRef.current = true;
    try {
      const newMode = currentMode === 'attendee' ? 'provider' : 'attendee';
      const result = await switchMode(newMode);
      if (result.success) {
        navigateTo(newMode === 'provider' ? 'ManageEvents' : 'Home');
      } else {
        Alert.alert(t('common.error'), result.message || t('settings.error.switchMode'));
      }
    } catch {
      Alert.alert(t('common.error'), t('settings.error.switchMode'));
    } finally {
      switchingRef.current = false;
    }
  };

  const handleProfilePress = () => {
    const now = Date.now();

    if (profileTapRef.current && now - profileTapRef.current < DOUBLE_TAP_MS) {
      profileTapRef.current = null;
      toggleRoleMode();
      return;
    }

    profileTapRef.current = now;
    setTimeout(() => {
      if (profileTapRef.current === now) {
        profileTapRef.current = null;
        navigateTo('Profile');
      }
    }, DOUBLE_TAP_MS);
  };

  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBarContainer}>
        {currentMode === 'provider' ? (
          <>
            <NavTab
              icon="list"
              label={t('nav.events')}
              isActive={activeScreen === 'ManageEvents'}
              onPress={() => navigateTo('ManageEvents')}
            />
            <NavTab
              icon="bar-chart-2"
              label={t('nav.dashboard')}
              isActive={activeScreen === 'Dashboard'}
              onPress={() => navigateTo('Dashboard')}
            />
            <NavTab
              label={t('nav.profile')}
              isActive={activeScreen === 'Profile'}
              onPress={handleProfilePress}
              isAvatar
              avatarSource={orgAvatarSource}
              avatarTitle={orgAvatarTitle}
            />
          </>
        ) : (
          <>
            <NavTab
              icon="compact-disc"
              iconType="font-awesome-5"
              label={t('nav.events')}
              isActive={activeScreen === 'Home'}
              onPress={() => navigateTo('Home')}
            />
            <NavTab
              icon="zap"
              label={t('nav.explore')}
              isActive={activeScreen === 'Explore'}
              onPress={() => navigateTo('Explore')}
            />
            <NavTab
              label={t('nav.profile')}
              isActive={activeScreen === 'Profile'}
              onPress={handleProfilePress}
              isAvatar
              avatarSource={avatarSource}
              avatarTitle={avatarTitle}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 62,
    borderRadius: 31,
    backgroundColor: '#1e1e1e',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTextWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActiveLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  createBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF4B8C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#FF4B8C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});

export default CustomNavBar;
