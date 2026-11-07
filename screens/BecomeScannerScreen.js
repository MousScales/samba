import React, { useState } from 'react';
import {
  StyleSheet, View, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SambaBackground from '../components/SambaBackground';
import { samba } from '../theme/samba';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { registerScannerForEvent, addLocalScannerEventId } from '../services/scannerService';

const TOTAL_STEPS = 3;

const StepDots = ({ current, total }) => (
  <View style={styles.dotsRow}>
    {Array.from({ length: total }, (_, i) => (
      <View key={i} style={[styles.dot, i + 1 <= current ? styles.dotActive : styles.dotInactive]} />
    ))}
  </View>
);

export default function BecomeScannerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, becomeScanner, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [eventCode, setEventCode] = useState('');
  const [loading, setLoading] = useState(false);

  const finishOnboarding = async (code) => {
    if (!isAuthenticated) {
      Alert.alert(
        t('becomeScanner.signInRequired.title'),
        t('becomeScanner.signInRequired.message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('nav.signIn'), onPress: () => navigation.navigate('Profile') },
        ],
      );
      return;
    }

    setLoading(true);
    try {
      const result = await becomeScanner({ displayName: displayName.trim() || user?.name });
      if (!result.success) {
        Alert.alert(t('common.error'), result.message || t('becomeScanner.error.submitFailed'));
        return;
      }

      if (code?.trim()) {
        try {
          const reg = await registerScannerForEvent(code.trim());
          if (reg?.eventId && user?.id) {
            await addLocalScannerEventId(user.id, reg.eventId);
          }
        } catch (e) {
          Alert.alert(t('common.error'), e.message || t('scannerVerification.alert.noEventMessage'));
          navigation.replace('ScannerEvents');
          return;
        }
      }

      Alert.alert(
        t('becomeScanner.alert.submitted.title'),
        t('becomeScanner.alert.submitted.message'),
        [{ text: t('common.ok'), onPress: () => navigation.replace('ScannerEvents') }],
      );
    } catch {
      Alert.alert(t('common.error'), t('common.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !displayName.trim()) {
      Alert.alert(t('common.error'), t('becomeScanner.error.displayName'));
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }
    finishOnboarding(eventCode);
  };

  const handleSkipEventCode = () => finishOnboarding(null);

  return (
    <View style={styles.container}>
      <SambaBackground />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())} style={styles.backBtn}>
          <Icon name="arrow-left" type="feather" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('becomeScanner.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <StepDots current={step} total={TOTAL_STEPS} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <>
              <Text style={styles.prompt}>{t('becomeScanner.step1.prompt')}</Text>
              <Text style={styles.hint}>{t('becomeScanner.step1.hint')}</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('becomeScanner.step1.placeholder')}
                placeholderTextColor={samba.textFaint}
                autoCapitalize="words"
              />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.prompt}>{t('becomeScanner.step2.prompt')}</Text>
              {[1, 2, 3].map((n) => (
                <View key={n} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{t(`becomeScanner.step2.point${n}`)}</Text>
                </View>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.prompt}>{t('becomeScanner.step3.prompt')}</Text>
              <Text style={styles.hint}>{t('becomeScanner.step3.hint')}</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={eventCode}
                onChangeText={(v) => setEventCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={samba.textFaint}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity onPress={handleSkipEventCode} style={styles.skipBtn}>
                <Text style={styles.skipText}>{t('becomeScanner.step3.skip')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={samba.pinkGradient} style={styles.primaryGrad}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryText}>
                {step === TOTAL_STEPS ? t('becomeScanner.button.finish') : t('common.continue')}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: samba.pink },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  body: { paddingHorizontal: 24, paddingTop: 8 },
  prompt: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 10, lineHeight: 28 },
  hint: { fontSize: 14, color: samba.textMuted, lineHeight: 21, marginBottom: 20 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: '#FFF',
  },
  codeInput: { textAlign: 'center', fontSize: 28, letterSpacing: 8, fontWeight: '700' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  bulletDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: samba.green, marginTop: 6 },
  bulletText: { flex: 1, fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },
  skipBtn: { alignSelf: 'center', marginTop: 16, padding: 8 },
  skipText: { fontSize: 14, fontWeight: '600', color: samba.textMuted },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  primaryGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
