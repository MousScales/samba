import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, View, TouchableOpacity, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SambaBackground from '../components/SambaBackground';
import { samba } from '../theme/samba';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  previewScannerInvite,
  claimScannerInvite,
  addLocalScannerEventId,
} from '../services/scannerService';
import { buildScannerInviteUrl } from '../utils/shareLinks';

export default function ScannerInviteClaimScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const inviteToken = route.params?.inviteToken || route.params?.token;

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const isScanner = user?.scannerInfo?.status === 'active';

  const loadPreview = useCallback(async () => {
    if (!inviteToken) {
      setError(t('dashboard.permissions.scannerInvite.invalidLink'));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await previewScannerInvite(inviteToken);
      setPreview(data);
      setError(null);
    } catch (e) {
      setError(e.message || t('dashboard.permissions.scannerInvite.invalidLink'));
    } finally {
      setLoading(false);
    }
  }, [inviteToken, t]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    loadPreview();
  }, [navigation, loadPreview]);

  const handleClaim = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        t('dashboard.permissions.scannerInvite.signInRequired.title'),
        t('dashboard.permissions.scannerInvite.signInRequired.message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('nav.signIn'), onPress: () => navigation.navigate('Profile') },
        ],
      );
      return;
    }

    if (!isScanner) {
      Alert.alert(
        t('dashboard.permissions.scannerInvite.scannerRequired.title'),
        t('dashboard.permissions.scannerInvite.scannerRequired.message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.menu.becomeScanner'), onPress: () => navigation.navigate('BecomeScanner') },
        ],
      );
      return;
    }

    setClaiming(true);
    try {
      const result = await claimScannerInvite(inviteToken);
      if (user?.id && result?.eventId) {
        await addLocalScannerEventId(user.id, result.eventId);
      }
      Alert.alert(
        t('dashboard.permissions.scannerInvite.claimSuccess.title'),
        t('dashboard.permissions.scannerInvite.claimSuccess.message'),
        [{
          text: t('scannerEvents.title'),
          onPress: () => navigation.replace('ScannerEvents'),
        }],
      );
    } catch (e) {
      Alert.alert(t('common.error'), e.message || t('dashboard.permissions.scannerInvite.claimFailed'));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <View style={styles.container}>
      <SambaBackground />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" type="feather" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dashboard.permissions.scannerInvite.claimTitle')}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {loading ? (
          <ActivityIndicator size="large" color={samba.pink} />
        ) : error ? (
          <>
            <Icon name="alert-circle" type="feather" size={48} color="rgba(255,255,255,0.25)" />
            <Text style={styles.errorText}>{error}</Text>
          </>
        ) : (
          <>
            {preview?.eventImage ? (
              <Image source={{ uri: preview.eventImage }} style={styles.hero} resizeMode="cover" />
            ) : (
              <View style={[styles.hero, styles.heroFallback]}>
                <Icon name="calendar" type="feather" size={36} color="rgba(255,255,255,0.2)" />
              </View>
            )}
            <Text style={styles.eventTitle}>{preview?.eventTitle}</Text>
            {preview?.organizerName ? (
              <Text style={styles.organizer}>{t('dashboard.permissions.scannerInvite.hostLabel', { name: preview.organizerName })}</Text>
            ) : null}
            <Text style={styles.eventSub}>{t('dashboard.permissions.scannerInvite.claimSubtitle')}</Text>

            <TouchableOpacity
              style={[styles.claimBtn, claiming && { opacity: 0.6 }]}
              onPress={handleClaim}
              disabled={claiming}
              activeOpacity={0.85}
            >
              <LinearGradient colors={samba.greenGradient} style={styles.claimGradient}>
                {claiming ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.claimText}>{t('dashboard.permissions.scannerInvite.claimButton')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: samba.bgDeep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  body: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', height: 180, borderRadius: 20, marginBottom: 20 },
  heroFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  organizer: { fontSize: 14, color: samba.pink, fontWeight: '600', marginBottom: 8 },
  eventSub: {
    fontSize: 14,
    color: samba.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  claimBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  claimGradient: { paddingVertical: 16, alignItems: 'center' },
  claimText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  errorText: { fontSize: 15, color: samba.textMuted, textAlign: 'center', marginTop: 16 },
});
