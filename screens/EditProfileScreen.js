import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity, Platform,
  TextInput, Text, Modal, FlatList, Dimensions, Image, ActivityIndicator,
} from 'react-native';
import { Icon } from '@rneui/themed';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { pickImageFromLibrary } from '../utils/pickImage';

const { width, height } = Dimensions.get('window');

// ── Country data (flag emoji + dial code) ─────────────────────────────────────
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra', dial: '+376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua & Barbuda', dial: '+1', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', dial: '+374', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', dial: '+994', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', dial: '+1', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', dial: '+1', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', dial: '+375', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', dial: '+501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', dial: '+229', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan', dial: '+975', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', dial: '+591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia & Herzegovina', dial: '+387', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', dial: '+673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮' },
  { code: 'CV', name: 'Cabo Verde', dial: '+238', flag: '🇨🇻' },
  { code: 'KH', name: 'Cambodia', dial: '+855', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'CF', name: 'Central African Republic', dial: '+236', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', dial: '+235', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', dial: '+269', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', dial: '+242', flag: '🇨🇬' },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
  { code: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', dial: '+420', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', dial: '+253', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', dial: '+1', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', dial: '+1', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', dial: '+240', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', dial: '+291', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', dial: '+268', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', dial: '+679', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', dial: '+220', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', dial: '+995', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', dial: '+1', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', dial: '+224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', dial: '+245', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', dial: '+592', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', dial: '+509', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
  { code: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', dial: '+98', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', dial: '+964', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', dial: '+1', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', dial: '+686', flag: '🇰🇮' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', dial: '+996', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', dial: '+856', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', dial: '+371', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', dial: '+266', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', dial: '+218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', dial: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { code: 'MG', name: 'Madagascar', dial: '+261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', dial: '+265', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', dial: '+960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹' },
  { code: 'MH', name: 'Marshall Islands', dial: '+692', flag: '🇲🇭' },
  { code: 'MR', name: 'Mauritania', dial: '+222', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', dial: '+230', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', dial: '+691', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldova', dial: '+373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', dial: '+377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', dial: '+976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', dial: '+382', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', dial: '+258', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', dial: '+264', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', dial: '+674', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', dial: '+505', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', dial: '+680', flag: '🇵🇼' },
  { code: 'PA', name: 'Panama', dial: '+507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', dial: '+675', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { code: 'KN', name: 'Saint Kitts & Nevis', dial: '+1', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', dial: '+1', flag: '🇱🇨' },
  { code: 'VC', name: 'Saint Vincent & Grenadines', dial: '+1', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', dial: '+685', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', dial: '+378', flag: '🇸🇲' },
  { code: 'ST', name: 'São Tomé & Príncipe', dial: '+239', flag: '🇸🇹' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', dial: '+248', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', dial: '+386', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', dial: '+677', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia', dial: '+252', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'SS', name: 'South Sudan', dial: '+211', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', dial: '+249', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', dial: '+597', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', dial: '+963', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', dial: '+992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', dial: '+670', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', dial: '+676', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad & Tobago', dial: '+1', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', dial: '+993', flag: '🇹🇲' },
  { code: 'TV', name: 'Tuvalu', dial: '+688', flag: '🇹🇻' },
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', dial: '+998', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', dial: '+678', flag: '🇻🇺' },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', dial: '+967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
];

const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === 'US');

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [countrySearch, setCountrySearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [profilePreview, setProfilePreview] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const isDirty = useRef(false);
  const savedTimer = useRef(null);

  const showSaved = () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSaveStatus('saved');
    savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const saveProfile = async (fields) => {
    setSaveStatus('saving');
    const result = await updateUser(fields);
    if (result.success) {
      if (result.user?.profilePicture) setProfilePreview(result.user.profilePicture);
      showSaved();
    } else {
      setSaveStatus('error');
    }
    return result;
  };

  useEffect(() => {
    if (user && !initialized) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfilePreview(user.profilePicture || null);
      const stored = user.phoneNumber || user.phone || '';
      const matched = COUNTRIES.find(c => stored.startsWith(c.dial));
      if (matched) {
        setCountry(matched);
        setPhone(stored.slice(matched.dial.length).trim());
      } else {
        setPhone(stored);
      }
      setInitialized(true);
    }
  }, [user, initialized]);

  useEffect(() => {
    if (!initialized || !isDirty.current) return undefined;
    const timer = setTimeout(() => {
      saveProfile({
        name,
        email,
        phoneNumber: `${country.dial} ${phone}`.trim(),
      });
      isDirty.current = false;
    }, 700);
    return () => clearTimeout(timer);
  }, [name, phone, email, country, initialized]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const pickImage = async () => {
    const uri = await pickImageFromLibrary();
    if (!uri) return;
    setProfilePreview(uri);
    await saveProfile({ profilePicture: uri });
  };

  const markDirty = () => { isDirty.current = true; };

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.dial.includes(countrySearch)
      )
    : COUNTRIES;

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-left" type="feather" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{t('editProfile.title')}</Text>
        <View style={styles.saveIndicator}>
          {saveStatus === 'saving' && (
            <>
              <ActivityIndicator size="small" color="#FF4B8C" />
              <Text style={styles.saveText}>{t('editProfile.saving')}</Text>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Icon name="check" type="feather" size={14} color="#4ADE80" />
              <Text style={[styles.saveText, styles.saveTextSuccess]}>{t('editProfile.saved')}</Text>
            </>
          )}
          {saveStatus === 'error' && (
            <Text style={[styles.saveText, styles.saveTextError]}>{t('editProfile.saveError')}</Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── PFP ── */}
        <TouchableOpacity style={styles.pfpBox} onPress={pickImage} activeOpacity={0.8}>
          {profilePreview ? (
            <Image source={{ uri: profilePreview }} style={styles.pfpImage} />
          ) : (
            <View style={styles.pfpPlaceholder}>
              <Text style={styles.pfpInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.pfpBadge}>
            <Icon name="camera" type="feather" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* ── Name ── */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('editProfile.label.name')}</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={(v) => { setName(v); markDirty(); }}
              placeholder={t('editProfile.placeholder.name')}
              placeholderTextColor="rgba(255,255,255,0.25)"
              selectionColor="#FF4B8C"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* ── Phone ── */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('editProfile.label.phone')}</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity style={styles.countryPill} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
                <Text style={styles.flagText}>{country.flag}</Text>
                <Text style={styles.dialText}>{country.dial}</Text>
                <Icon name="chevron-down" type="feather" size={13} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                value={phone}
                onChangeText={(v) => { setPhone(v); markDirty(); }}
                placeholder={t('editProfile.placeholder.phone')}
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="phone-pad"
                selectionColor="#FF4B8C"
              />
            </View>
          </View>
        </View>

        {/* ── Email ── */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('editProfile.label.email')}</Text>
            <TextInput
              style={styles.fieldInput}
              value={email}
              onChangeText={(v) => { setEmail(v); markDirty(); }}
              placeholder={t('editProfile.placeholder.email')}
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor="#FF4B8C"
            />
          </View>
        </View>

        {/* ── Language ── */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{t('language.title')}</Text>
            <View style={styles.languageRow}>
              <View style={styles.languageFlagWrap}>
                <TouchableOpacity
                  style={[styles.languageFlagBtn, language === 'en' && styles.languageFlagBtnActive]}
                  onPress={() => setLanguage('en')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>🇬🇧</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.languageFlagWrap}>
                <TouchableOpacity
                  style={[styles.languageFlagBtn, language === 'fr' && styles.languageFlagBtnActive]}
                  onPress={() => setLanguage('fr')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>🇫🇷</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ── Country picker modal ── */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={[styles.pickerModal, { paddingTop: insets.top + 8 }]}>
          {/* Picker header */}
          <View style={styles.pickerHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => { setPickerOpen(false); setCountrySearch(''); }} activeOpacity={0.7}>
              <Icon name="arrow-left" type="feather" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>{t('editProfile.countryPicker.title')}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Icon name="search" type="feather" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder={t('editProfile.countryPicker.searchPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
              selectionColor="#FF4B8C"
              autoFocus
            />
            {countrySearch.length > 0 && (
              <TouchableOpacity onPress={() => setCountrySearch('')}>
                <Icon name="x" type="feather" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={item => item.code}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryRow, country.code === item.code && styles.countryRowActive]}
                onPress={() => { setCountry(item); markDirty(); setPickerOpen(false); setCountrySearch(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryDial}>{item.dial}</Text>
                {country.code === item.code && (
                  <Icon name="check" type="feather" size={16} color="#FF4B8C" />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.countrySep} />}
          />
        </View>
      </Modal>
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
  saveIndicator: {
    minWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  saveText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  saveTextSuccess: {
    color: '#4ADE80',
  },
  saveTextError: {
    color: '#FF4B8C',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 12, flexGrow: 1, justifyContent: 'center' },

  // PFP
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
    marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },

  // Field
  fieldRow: { paddingVertical: 16 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 6, letterSpacing: 0.3,
  },
  fieldInput: {
    fontSize: 15, fontWeight: '500', color: '#FFFFFF', padding: 0,
  },

  // Phone row
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10,
  },
  flagText: { fontSize: 20 },
  dialText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  languageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  languageFlagWrap: {
    flex: 1,
  },
  languageFlagBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageFlagBtnActive: {
    backgroundColor: 'rgba(255,75,140,0.15)',
    borderWidth: 2,
    borderColor: '#FF4B8C',
  },
  languageFlag: {
    fontSize: 28,
  },
  // Country picker modal
  pickerModal: {
    flex: 1, backgroundColor: '#0d0d0d',
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 18, marginBottom: 8,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: '#FFFFFF', padding: 0,
  },
  countryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13, gap: 12,
  },
  countryRowActive: {
    backgroundColor: 'rgba(255,75,140,0.08)',
  },
  countryFlag: { fontSize: 24, width: 32 },
  countryName: { flex: 1, fontSize: 15, color: '#FFFFFF', fontWeight: '500' },
  countryDial: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginRight: 4 },
  countrySep: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 64 },
});
