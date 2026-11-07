import React, { useLayoutEffect, useState } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity, StatusBar, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SambaBackground from '../components/SambaBackground';
import { samba } from '../theme/samba';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ATTENDEE_FAQ_COUNT = 7;
const ORGANIZER_FAQ_COUNT = 7;

const FaqItem = ({ question, answer, isOpen, onToggle }) => (
  <View style={styles.faqCard}>
    <TouchableOpacity style={styles.faqQuestionRow} onPress={onToggle} activeOpacity={0.75}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Icon
        name={isOpen ? 'chevron-up' : 'chevron-down'}
        type="feather"
        size={18}
        color={isOpen ? samba.pink : 'rgba(255,255,255,0.45)'}
      />
    </TouchableOpacity>
    {isOpen && (
      <View style={styles.faqAnswerWrap}>
        <Text style={styles.faqAnswer}>{answer}</Text>
      </View>
    )}
  </View>
);

const FaqScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [openIndex, setOpenIndex] = useState(null);

  const isOrganizerView = isAuthenticated && (user?.currentMode || 'attendee') === 'provider';
  const namespace = isOrganizerView ? 'organizer' : 'attendee';
  const faqCount = isOrganizerView ? ORGANIZER_FAQ_COUNT : ATTENDEE_FAQ_COUNT;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const toggleItem = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const faqItems = Array.from({ length: faqCount }, (_, i) => ({
    question: t(`faqs.${namespace}.q${i + 1}`),
    answer: t(`faqs.${namespace}.a${i + 1}`),
  }));

  return (
    <View style={styles.container}>
      <SambaBackground />
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Icon name="arrow-left" type="feather" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('faqs.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        <View style={[styles.badge, isOrganizerView ? styles.badgeOrganizer : styles.badgeAttendee]}>
          <Icon
            name={isOrganizerView ? 'briefcase' : 'user'}
            type="feather"
            size={14}
            color={isOrganizerView ? samba.green : samba.pink}
          />
          <Text style={[styles.badgeText, { color: isOrganizerView ? samba.green : samba.pink }]}>
            {t(`faqs.${namespace}.badge`)}
          </Text>
        </View>

        <Text style={styles.lead}>{t(`faqs.${namespace}.subtitle`)}</Text>

        {faqItems.map((item, index) => (
          <FaqItem
            key={`${namespace}-${index}`}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === index}
            onToggle={() => toggleItem(index)}
          />
        ))}

        <Text style={styles.footerNote}>{t('faqs.contactNote')}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: samba.bgDeep,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: samba.lip,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeAttendee: {
    backgroundColor: samba.pinkFaint,
    borderWidth: 1,
    borderColor: samba.pinkBorder,
  },
  badgeOrganizer: {
    backgroundColor: samba.greenFaint,
    borderWidth: 1,
    borderColor: samba.greenBorder,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: samba.textMuted,
    marginBottom: 20,
  },
  faqCard: {
    backgroundColor: samba.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: samba.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 21,
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: samba.border,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 21,
    color: samba.textMuted,
    paddingTop: 12,
  },
  footerNote: {
    fontSize: 13,
    lineHeight: 19,
    color: samba.textFaint,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
  },
});

export default FaqScreen;
