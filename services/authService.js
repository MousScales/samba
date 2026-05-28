import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure base URL for your backend
const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export const authService = {
  // Set auth token for requests
  setAuthToken: async (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  },

  // Get stored token
  getToken: async () => {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  // Get stored user data
  getUser: async () => {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  // Store user data
  setUser: async (user) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Register new user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        await authService.setAuthToken(token);
        await authService.setUser(user);
        return { success: true, user, token };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user } = response.data;
        await authService.setAuthToken(token);
        await authService.setUser(user);
        return { success: true, user, token };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  },

  // Logout user
  logout: async () => {
    try {
      await authService.setAuthToken(null);
      await AsyncStorage.removeItem(USER_KEY);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  },

  // Get current user profile
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      
      if (response.data.success) {
        await authService.setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Get current user error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to get user' 
      };
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await authService.getToken();
    if (!token) return false;

    try {
      // Verify token by making a request to protected endpoint
      const response = await authService.getCurrentUser();
      return response.success;
    } catch (error) {
      // Token is invalid, clear it
      await authService.setAuthToken(null);
      return false;
    }
  },

  // Initialize auth (call on app start)
  initializeAuth: async () => {
    const token = await authService.getToken();
    if (token) {
      await authService.setAuthToken(token);
      return await authService.isAuthenticated();
    }
    return false;
  },

  // Become a provider
  becomeProvider: async (providerData) => {
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add text data
      formData.append('organizationName', providerData.organizationName);
      formData.append('description', providerData.description);
      formData.append('partyEmail', providerData.partyEmail);
      formData.append('partyPhone', providerData.partyPhone);
      formData.append('website', providerData.website || '');
      formData.append('businessAddress', JSON.stringify(providerData.businessAddress));
      formData.append('taxInfo', JSON.stringify(providerData.taxInfo));
      formData.append('bankAccountInfo', JSON.stringify(providerData.bankAccountInfo));
      formData.append('identityVerification', JSON.stringify(providerData.identityVerification));
      
      // Add image files
      if (providerData.partyLogo) {
        formData.append('partyLogo', {
          uri: providerData.partyLogo,
          type: 'image/jpeg',
          name: 'party_logo.jpg'
        });
      }
      
      if (providerData.identityVerification?.idFrontImage) {
        formData.append('idFrontImage', {
          uri: providerData.identityVerification.idFrontImage,
          type: 'image/jpeg',
          name: 'id_front.jpg'
        });
      }
      
      if (providerData.identityVerification?.idBackImage) {
        formData.append('idBackImage', {
          uri: providerData.identityVerification.idBackImage,
          type: 'image/jpeg',
          name: 'id_back.jpg'
        });
      }
      
      if (providerData.identityVerification?.selfieImage) {
        formData.append('selfieImage', {
          uri: providerData.identityVerification.selfieImage,
          type: 'image/jpeg',
          name: 'selfie.jpg'
        });
      }

      const response = await api.post('/users/become-provider', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        await authService.setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Become provider error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to become provider' 
      };
    }
  },

  // Switch between attendee and provider modes
  switchMode: async (mode) => {
    try {
      const response = await api.post('/users/switch-mode', { mode });
      
      if (response.data.success) {
        await authService.setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Switch mode error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to switch mode' 
      };
    }
  },

  // Check if email exists
  checkEmail: async (email) => {
    try {
      const response = await api.post('/auth/check-email', { email });
      
      if (response.data.success) {
        return { 
          success: true, 
          exists: response.data.exists,
          message: response.data.message 
        };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Check email error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to check email' 
      };
    }
  },

  // Get identity verification status
  getIdentityVerificationStatus: async (token) => {
    try {
      // Temporarily set token for this request
      const oldAuth = api.defaults.headers.common['Authorization'];
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await api.get('/users/identity-verification-status');
      
      // Restore old auth
      if (oldAuth) {
        api.defaults.headers.common['Authorization'] = oldAuth;
      } else {
        delete api.defaults.headers.common['Authorization'];
      }
      
      if (response.data.success) {
        return { 
          success: true, 
          verificationStatus: response.data.verificationStatus 
        };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Get verification status error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to get verification status' 
      };
    }
  },
};

export default authService; 