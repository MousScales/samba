import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { uploadImage } from './imageService';

const USER_KEY = 'user_data';

const mapProfileToUser = (profile) => {
  if (!profile) return null;

  const providerInfo = profile.provider_info || {};
  const scannerInfo = profile.scanner_info || {};

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    phoneNumber: profile.phone_number,
    phone: profile.phone_number,
    dateOfBirth: profile.date_of_birth,
    address: profile.address || {},
    profilePicture: profile.profile_picture_url,
    role: profile.role || 'attendee',
    currentMode: profile.current_mode || 'attendee',
    providerInfo,
    scannerInfo,
  };
};

const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Fetch profile error:', error);
    return null;
  }

  return mapProfileToUser(data);
};

const uploadProviderAsset = async (userId, uri, fileName, folder = 'provider') =>
  uploadImage(uri, { userId, folder, filename: fileName });

export const authService = {
  setAuthToken: async () => {
    // Session is managed by Supabase + AsyncStorage
  },

  getToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  },

  getUser: async () => {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  setUser: async (user) => {
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
  },

  register: async (userData) => {
    try {
      const email = userData.email?.trim().toLowerCase();
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
          },
        },
      });

      if (signUpError) {
        return { success: false, message: signUpError.message };
      }

      const userId = authData.user?.id;
      if (!userId) {
        return {
          success: false,
          message: 'Account created. Check your email to confirm before signing in.',
        };
      }

      let profilePictureUrl = userData.profilePicture;
      if (profilePictureUrl) {
        profilePictureUrl = await uploadImage(profilePictureUrl, {
          userId,
          folder: 'avatars',
          filename: 'profile.jpg',
        });
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          phone_number: userData.phoneNumber,
          date_of_birth: userData.dateOfBirth,
          address: userData.address || {},
          profile_picture_url: profilePictureUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update after signup:', profileError);
      }

      const user = await fetchProfile(userId);
      if (user) {
        await authService.setUser(user);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      return {
        success: true,
        user,
        token: sessionData.session?.access_token,
        needsEmailConfirmation: !sessionData.session,
      };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  },

  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      const user = await fetchProfile(data.user.id);
      if (!user) {
        return { success: false, message: 'Profile not found. Run supabase/schema.sql.' };
      }

      await authService.setUser(user);
      return {
        success: true,
        user,
        token: data.session?.access_token,
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Login failed' };
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      await authService.setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) {
        return { success: false, message: error?.message || 'Not authenticated' };
      }

      const cached = await authService.getUser();
      const user = await fetchProfile(authUser.id);
      if (!user) {
        return { success: false, message: 'Profile not found' };
      }

      if (cached?.id === authUser.id && cached.profilePicture && !user.profilePicture) {
        user.profilePicture = cached.profilePicture;
      }

      await authService.setUser(user);
      return { success: true, user };
    } catch (error) {
      console.error('Get current user error:', error);
      return { success: false, message: error.message || 'Failed to get user' };
    }
  },

  buildUserFromSession: (session) => {
    const meta = session.user.user_metadata || {};
    return {
      id: session.user.id,
      email: session.user.email,
      name: meta.name || session.user.email?.split('@')[0] || 'User',
      role: 'attendee',
      currentMode: 'attendee',
      providerInfo: {},
      address: {},
    };
  },

  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  initializeAuth: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        await authService.setUser(null);
        return { restored: false, user: null };
      }

      const cached = await authService.getUser();
      if (cached?.id === session.user.id) {
        authService.getCurrentUser().then((result) => {
          if (result.success) authService.setUser(result.user);
        });
        return { restored: true, user: cached };
      }

      const result = await authService.getCurrentUser();
      if (result.success) {
        return { restored: true, user: result.user };
      }

      const fallback = authService.buildUserFromSession(session);
      await authService.setUser(fallback);
      return { restored: true, user: fallback };
    } catch (err) {
      console.error('initializeAuth error:', err);
      const { data: { session } } = await supabase.auth.getSession();
      const cached = await authService.getUser();
      if (session && cached?.id === session.user.id) {
        return { restored: true, user: cached };
      }
      return { restored: false, user: null };
    }
  },

  becomeProvider: async (providerData) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return { success: false, message: 'Not authenticated' };
      }

      const partyLogoUrl = await uploadProviderAsset(
        authUser.id,
        providerData.partyLogo,
        'party_logo.jpg'
      );
      const idFrontUrl = await uploadProviderAsset(
        authUser.id,
        providerData.identityVerification?.idFrontImage,
        'id_front.jpg'
      );
      const idBackUrl = await uploadProviderAsset(
        authUser.id,
        providerData.identityVerification?.idBackImage,
        'id_back.jpg'
      );
      const selfieUrl = await uploadProviderAsset(
        authUser.id,
        providerData.identityVerification?.selfieImage,
        'selfie.jpg'
      );

      const providerInfo = {
        organizationName: providerData.organizationName,
        description: providerData.description,
        partyEmail: providerData.partyEmail,
        partyPhone: providerData.partyPhone,
        website: providerData.website || '',
        businessAddress: providerData.businessAddress,
        taxInfo: providerData.taxInfo,
        bankAccountInfo: providerData.bankAccountInfo,
        identityVerification: {
          ...providerData.identityVerification,
          idFrontImage: idFrontUrl || providerData.identityVerification?.idFrontImage,
          idBackImage: idBackUrl || providerData.identityVerification?.idBackImage,
          selfieImage: selfieUrl || providerData.identityVerification?.selfieImage,
        },
        partyLogo: partyLogoUrl || providerData.partyLogo,
        verificationStatus: 'pending',
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'provider',
          current_mode: 'provider',
          provider_info: providerInfo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (error) {
        return { success: false, message: error.message };
      }

      const user = await fetchProfile(authUser.id);
      await authService.setUser(user);
      return { success: true, user };
    } catch (error) {
      console.error('Become provider error:', error);
      return { success: false, message: error.message || 'Failed to become provider' };
    }
  },

  becomeScanner: async (scannerData) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return { success: false, message: 'Not authenticated' };
      }

      const scannerInfo = {
        displayName: scannerData.displayName || scannerData.name,
        status: 'active',
        onboardedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          scanner_info: scannerInfo,
          current_mode: 'scanner',
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (error) {
        return { success: false, message: error.message };
      }

      const user = await fetchProfile(authUser.id);
      await authService.setUser(user);
      return { success: true, user };
    } catch (error) {
      console.error('Become scanner error:', error);
      return { success: false, message: error.message || 'Failed to become scanner' };
    }
  },

  switchMode: async (mode) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return { success: false, message: 'Not authenticated' };
      }

      const profile = await fetchProfile(authUser.id);
      if (mode === 'provider' && profile?.role !== 'provider') {
        return { success: false, message: 'You are not registered as an event host' };
      }
      if (mode === 'scanner' && profile?.scannerInfo?.status !== 'active') {
        return { success: false, message: 'You are not registered as a scanner' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          current_mode: mode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (error) {
        return { success: false, message: error.message };
      }

      const user = await fetchProfile(authUser.id);
      await authService.setUser(user);
      return { success: true, user };
    } catch (error) {
      console.error('Switch mode error:', error);
      return { success: false, message: error.message || 'Failed to switch mode' };
    }
  },

  checkEmail: async (email) => {
    try {
      const { data, error } = await supabase.rpc('email_exists', {
        email_input: email.trim().toLowerCase(),
      });

      if (error) {
        return { success: false, message: error.message };
      }

      const exists = !!data;
      return {
        success: true,
        exists,
        message: exists ? 'Email already registered' : 'Email available',
      };
    } catch (error) {
      console.error('Check email error:', error);
      return { success: false, message: error.message || 'Failed to check email' };
    }
  },

  getIdentityVerificationStatus: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return { success: false, message: 'Not authenticated' };
      }

      const profile = await fetchProfile(authUser.id);
      return {
        success: true,
        verificationStatus: profile?.providerInfo?.verificationStatus || 'none',
      };
    } catch (error) {
      console.error('Get verification status error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get verification status',
      };
    }
  },
};

export default authService;
