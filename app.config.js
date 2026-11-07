/** @type {import('@expo/config').ExpoConfig} */
const appJson = require('./app.json');

/**
 * Bakes EXPO_PUBLIC_* into the native app (extra) at build time.
 * Local: loaded from .env via Expo CLI.
 * EAS/TestFlight: set the same vars on the EAS project (production environment).
 */
module.exports = () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    || appJson.expo?.ios?.config?.googleMapsApiKey
    || appJson.expo?.android?.config?.googleMaps?.apiKey
    || '';

  const missing = [];
  if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (missing.length) {
    console.warn(
      `[Samba] Missing env for release build: ${missing.join(', ')}. `
      + 'Add them to .env locally or run: npm run eas:env:production',
    );
  }

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      ios: {
        ...appJson.expo.ios,
        config: {
          ...appJson.expo.ios?.config,
          googleMapsApiKey,
        },
      },
      android: {
        ...appJson.expo.android,
        config: {
          ...appJson.expo.android?.config,
          googleMaps: {
            ...appJson.expo.android?.config?.googleMaps,
            apiKey: googleMapsApiKey,
          },
        },
      },
      extra: {
        ...appJson.expo.extra,
        supabaseUrl,
        supabaseAnonKey,
        googleMapsApiKey,
      },
    },
  };
};
