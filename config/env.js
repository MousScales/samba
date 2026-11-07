import Constants from 'expo-constants';

/** Runtime + build-time config (EAS/TestFlight safe via app.config.js extra). */
const extra = Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? Constants.manifest?.extra ?? {};

const read = (envKey, extraKey) => {
  const fromEnv = process.env[envKey];
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  const fromExtra = extra[extraKey];
  if (fromExtra && String(fromExtra).trim()) return String(fromExtra).trim();
  return '';
};

export const ENV = {
  supabaseUrl: read('EXPO_PUBLIC_SUPABASE_URL', 'supabaseUrl'),
  supabaseAnonKey: read('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'supabaseAnonKey'),
  googleMapsApiKey: read('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 'googleMapsApiKey'),
};

export const isSupabaseConfigured = () => (
  Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey)
  && !ENV.supabaseUrl.includes('placeholder.supabase.co')
  && ENV.supabaseAnonKey !== 'placeholder-key'
);

export const getGoogleMapsApiKey = () => ENV.googleMapsApiKey;

export default ENV;
