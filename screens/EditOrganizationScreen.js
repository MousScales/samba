import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity,
  Platform, TextInput, Text, Image, Alert,
} from 'react-native';
import { Icon } from '@rneui/themed';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { pickImageFromLibrary } from '../utils/pickImage';

export default function EditOrganizationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { updateEventsWithOrganizationNames } = useEvents();

  const [orgName, setOrgName]           = useState('');
  const [description, setDescription]   = useState('');
  const [initialized, setInitialized]   = useState(false);

  const latest = useRef({ orgName, description });
  useEffect(() => { latest.current = { orgName, description }; }, [orgName, description]);

  useEffect(() => {
    if (user && !initialized) {
      setOrgName(user.providerInfo?.organizationName || '');
      setDescription(user.providerInfo?.description || '');
      setInitialized(true);
    }
  }, [user, initialized]);

  // Auto-save on navigate away
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', async () => {
      const { orgName: n, description: d } = latest.current;
      try {
        const result = await updateUser({
          providerInfo: {
            ...(user?.providerInfo || {}),
            organizationName: n,
            description: d,
          },
        });
        if (result?.success) {
          await updateEventsWithOrganizationNames({ organizationName: n, description: d }, user?.id);
        }
      } catch { /* silent */ }
    });
    return unsub;
  }, [navigation, user]);

  const pickLogo = async () => {
    const uri = await pickImageFromLibrary();
    if (!uri) return;
    const result = await updateUser({
      providerInfo: { ...(user?.providerInfo || {}), partyLogo: uri },
    });
    if (!result?.success) Alert.alert('Error', 'Failed to update logo.');
  };

  const logoUri = user?.providerInfo?.partyLogo;
  const initials = orgName
    ? orgName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'O';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-left" type="feather" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Edit Organization</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <TouchableOpacity style={styles.pfpBox} onPress={pickLogo} activeOpacity={0.8}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.pfpImage} />
          ) : (
            <View style={styles.pfpPlaceholder}>
              <Text style={styles.pfpInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.pfpBadge}>
            <Icon name="camera" type="feather" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Org Name */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Organization Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={orgName}
              onChangeText={setOrgName}
              placeholder="Your organization name"
              placeholderTextColor="rgba(255,255,255,0.25)"
              selectionColor="#FF4B8C"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell people about your organization…"
              placeholderTextColor="rgba(255,255,255,0.25)"
              selectionColor="#FF4B8C"
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>
        </View>

        <Text style={styles.autoSaveHint}>Changes save automatically when you go back</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Logo
  pfpBox: {
    alignSelf: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  pfpImage: {
    width: 100, height: 100, borderRadius: 24,
    backgroundColor: '#2a2a2a',
  },
  pfpPlaceholder: {
    width: 100, height: 100, borderRadius: 24,
    backgroundColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center',
  },
  pfpInitials: {
    fontSize: 34, fontWeight: '700', color: '#FFFFFF',
  },
  pfpBadge: {
    position: 'absolute', bottom: -6, right: -6,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FF4B8C',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0d0d0d',
  },

  // Card
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  fieldRow: { paddingVertical: 14 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 6, letterSpacing: 0.3,
  },
  fieldInput: {
    fontSize: 15, fontWeight: '500', color: '#FFFFFF', padding: 0,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'right',
    marginTop: 6,
  },

  autoSaveHint: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 4,
  },
});
