import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';
import * as Location from 'expo-location';

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

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Request location permissions and get user location
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        await getCurrentLocation();
        return { success: true, granted: true };
      } else {
        return { success: false, granted: false, message: 'Location permission denied' };
      }
    } catch (error) {
      console.error('Location permission error:', error);
      return { success: false, granted: false, message: 'Failed to request location permission' };
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (locationPermission === false) {
        return { success: false, message: 'Location permission not granted' };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Get address details from coordinates
      const addressDetails = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = addressDetails[0];
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city: address?.city,
        state: address?.region,
        country: address?.country,
        postalCode: address?.postalCode,
      };

      setUserLocation(locationData);
      return { success: true, location: locationData };
    } catch (error) {
      console.error('Get location error:', error);
      return { success: false, message: 'Failed to get current location' };
    }
  };

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const isAuth = await authService.initializeAuth();
      
      if (isAuth) {
        const userData = await authService.getUser();
        setUser(userData);
        setIsAuthenticated(true);
        
        // Request location permission after successful auth
        await requestLocationPermission();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
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
        
        // Request location permission after successful login
        await requestLocationPermission();
        
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

  const updateUser = async (userData) => {
    try {
      // Update user in storage
      await authService.setUser({ ...user, ...userData });
      setUser(prev => ({ ...prev, ...userData }));
      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, message: 'Failed to update user' };
    }
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
    switchMode,
    checkEmail,
    requestLocationPermission,
    getCurrentLocation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 