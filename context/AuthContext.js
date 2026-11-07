import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { supabase } from '../config/supabase';
import { isLocalImageUri, uploadImage } from '../services/imageService';
import * as Location from 'expo-location';
import { getGoogleMapsApiKey } from '../config/env';

const LOCATION_STORAGE_KEY = 'samba_user_location';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const userRef = useRef(null);
  const updateQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Restore session on launch + keep in sync with Supabase auth events
  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setIsAuthenticated(false);
          await authService.setUser(null);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const cached = await authService.getUser();
          if (cached?.id === session.user.id) {
            setUser(cached);
            setIsAuthenticated(true);
            authService.getCurrentUser().then((result) => {
              if (!result.success) return;
              const merged = {
                ...result.user,
                profilePicture: result.user.profilePicture || cached.profilePicture,
              };
              if (merged.profilePicture !== result.user.profilePicture) {
                authService.setUser(merged);
              }
              setUser(merged);
            });
            return;
          }

          const result = await authService.getCurrentUser();
          if (result.success) {
            setUser(result.user);
            setIsAuthenticated(true);
          } else {
            const fallback = authService.buildUserFromSession(session);
            await authService.setUser(fallback);
            setUser(fallback);
            setIsAuthenticated(true);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const saveLocation = async (locationData) => {
    try {
      await AsyncStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify({ ...locationData, updatedAt: new Date().toISOString() }),
      );
    } catch (error) {
      console.warn('Failed to save location:', error?.message || error);
    }
  };

  const loadSavedLocation = async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.latitude != null || parsed?.city) return parsed;
    } catch (error) {
      console.warn('Failed to load saved location:', error?.message || error);
    }
    return null;
  };

  const applyLocation = async (locationData) => {
    setUserLocation(locationData);
    await saveLocation(locationData);
    return locationData;
  };

  const updateUserLocation = async (partial) => {
    const saved = await loadSavedLocation();
    const merged = { ...(saved || {}), ...partial };
    await applyLocation(merged);
    return { success: true, location: merged };
  };

  const initializeLocation = async () => {
    try {
      const saved = await loadSavedLocation();
      if (saved) setUserLocation(saved);

      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status === 'granted') {
        await getCurrentLocation();
      }
    } catch (error) {
      console.warn('Location init error:', error?.message || error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status === 'granted') {
        const result = await getCurrentLocation();
        return { success: true, granted: true, location: result.location };
      }
      return { success: false, granted: false, message: 'Location permission denied' };
    } catch (error) {
      console.error('Location permission error:', error);
      return { success: false, granted: false, message: 'Failed to request location permission' };
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission(false);
        return { success: false, message: 'Location permission not granted' };
      }
      setLocationPermission(true);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      let city, state, country, postalCode;
      try {
        const GOOGLE_KEY = getGoogleMapsApiKey();
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&result_type=locality|administrative_area_level_2&key=${GOOGLE_KEY}`
        );
        const geoData = await geoRes.json();
        if (geoData.status === 'OK' && geoData.results?.length) {
          const components = geoData.results[0].address_components;
          const get = (type) => components.find(c => c.types.includes(type));
          city = get('locality')?.long_name || get('administrative_area_level_2')?.long_name;
          state = get('administrative_area_level_1')?.short_name;
          country = get('country')?.long_name;
          postalCode = get('postal_code')?.long_name;
        }
      } catch (_) { /* fall through to Nominatim */ }

      if (!city) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'SambaApp/1.0' } }
          );
          const nomData = await nomRes.json();
          const addr = nomData.address ?? {};
          city = addr.city || addr.town || addr.village || addr.county || addr.municipality;
          state = addr.state;
          country = addr.country;
          postalCode = addr.postcode;
        } catch (_) { /* no city available */ }
      }

      const locationData = await applyLocation({
        latitude, longitude, city, state, country, postalCode, source: 'gps',
      });
      return { success: true, location: locationData };
    } catch (error) {
      console.error('Get location error:', error);
      return { success: false, message: 'Failed to get current location' };
    }
  };

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const { restored, user: userData } = await authService.initializeAuth();

      if (restored && userData) {
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      await initializeLocation();
    } catch (error) {
      console.error('Auth initialization error:', error);
      setUser(null);
      setIsAuthenticated(false);
      await initializeLocation();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        
        await getCurrentLocation();
        return { success: true };
      }
      
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const result = await authService.register(userData);
      
      if (result.needsEmailConfirmation) {
        return {
          success: false,
          message: 'Check your email to confirm your account, then sign in.',
        };
      }

      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear user-specific data
      // Note: We'll import useEvents hook inside the logout function to avoid circular dependency
      try {
        const { useEvents } = require('./EventsContext');
        const { clearUserData } = useEvents();
        clearUserData();
      } catch (error) {
        console.log('EventsContext not available during logout, data will be cleared on next login');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  };

  const persistProfileUpdate = async (merged, userId) => {
    await authService.setUser(merged);
    userRef.current = merged;
    setUser(merged);

    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: merged.name,
          phone_number: merged.phoneNumber || merged.phone,
          address: merged.address,
          profile_picture_url: merged.profilePicture || null,
          provider_info: merged.providerInfo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Profile save error:', error);
        throw error;
      }
    }
  };

  const updateUserImpl = async (userData) => {
    try {
      const current = userRef.current;
      if (!current) return { success: false, message: 'Not signed in' };

      const optimistic = { ...current, ...userData };
      userRef.current = optimistic;
      setUser(optimistic);
      await authService.setUser(optimistic);

      const processed = { ...userData };

      if (processed.profilePicture && isLocalImageUri(processed.profilePicture)) {
        const permanent = await uploadImage(processed.profilePicture, {
          userId: current.id,
          folder: 'avatars',
          filename: `profile-${Date.now()}.jpg`,
        });
        if (permanent) processed.profilePicture = permanent;
      }

      if (processed.providerInfo?.partyLogo && isLocalImageUri(processed.providerInfo.partyLogo)) {
        const permanent = await uploadImage(processed.providerInfo.partyLogo, {
          userId: current.id,
          folder: 'logos',
          filename: `logo-${Date.now()}.jpg`,
        });
        if (permanent) {
          processed.providerInfo = { ...processed.providerInfo, partyLogo: permanent };
        }
      }

      const merged = { ...userRef.current, ...processed };
      await persistProfileUpdate(merged, current.id);
      return { success: true, user: merged };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, message: 'Failed to update user' };
    }
  };

  const updateUser = (userData) => {
    const task = updateQueueRef.current.then(() => updateUserImpl(userData));
    updateQueueRef.current = task.catch(() => {});
    return task;
  };

  const refreshUser = async () => {
    try {
      const result = await authService.getCurrentUser();
      
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      
      // If refresh fails, user might be logged out
      if (!result.success) {
        setUser(null);
        setIsAuthenticated(false);
      }
      
      return result;
    } catch (error) {
      console.error('Refresh user error:', error);
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, message: 'Session expired' };
    }
  };

  const becomeProvider = async (providerData) => {
    try {
      const result = await authService.becomeProvider(providerData);
      
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Become provider error:', error);
      return { success: false, message: 'Failed to become provider' };
    }
  };

  const becomeScanner = async (scannerData) => {
    try {
      const result = await authService.becomeScanner(scannerData);
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Become scanner error:', error);
      return { success: false, message: 'Failed to become scanner' };
    }
  };

  const switchMode = async (mode) => {
    try {
      const result = await authService.switchMode(mode);
      
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Switch mode error:', error);
      return { success: false, message: 'Failed to switch mode' };
    }
  };

  const checkEmail = async (email) => {
    try {
      const result = await authService.checkEmail(email);
      return result;
    } catch (error) {
      console.error('Check email error:', error);
      return { success: false, message: 'Failed to check email' };
    }
  };

  const value = {
    // State
    user,
    isLoading,
    isAuthenticated,
    userLocation,
    locationPermission,
    
    // Actions
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    initializeAuth,
    becomeProvider,
    becomeScanner,
    switchMode,
    checkEmail,
    requestLocationPermission,
    getCurrentLocation,
    updateUserLocation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 