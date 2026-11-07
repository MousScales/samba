import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV, isSupabaseConfigured } from './env';

if (!isSupabaseConfigured()) {
  console.error(
    '[Samba] Supabase is not configured. Ticket purchases, auth sync, and cloud events will fail. '
    + 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (dev) '
    + 'or EAS environment variables (TestFlight/production builds).',
  );
}

export const supabase = createClient(
  ENV.supabaseUrl || 'https://placeholder.supabase.co',
  ENV.supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export { isSupabaseConfigured };
export default supabase;
