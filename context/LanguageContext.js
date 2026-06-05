import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en } from '../i18n/en';
import { fr } from '../i18n/fr';

const STORAGE_KEY = '@samba_language';

const TRANSLATIONS = { en, fr };

const LanguageContext = createContext(null);

const getNested = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);

const interpolate = (str, params = {}) =>
  Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    str
  );

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'en' || stored === 'fr') setLanguageState(stored);
      })
      .finally(() => setIsReady(true));
  }, []);

  const setLanguage = useCallback(async (lang) => {
    if (lang !== 'en' && lang !== 'fr') return;
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key, params) => {
      const value =
        getNested(TRANSLATIONS[language], key) ??
        getNested(TRANSLATIONS.en, key) ??
        key;
      return typeof value === 'string' ? interpolate(value, params) : key;
    },
    [language]
  );

  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  const value = useMemo(
    () => ({ language, setLanguage, t, locale, isReady }),
    [language, setLanguage, t, locale, isReady]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
