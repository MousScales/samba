import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const scannerEventsKey = (userId) => `scanner_event_ids_${userId}`;

export const getLocalScannerEventIds = async (userId) => {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(scannerEventsKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addLocalScannerEventId = async (userId, eventId) => {
  if (!userId || !eventId) return;
  const ids = await getLocalScannerEventIds(userId);
  if (!ids.includes(eventId)) {
    await AsyncStorage.setItem(scannerEventsKey(userId), JSON.stringify([...ids, eventId]));
  }
};

export const registerScannerForEvent = async (verificationCode) => {
  const { data, error } = await supabase.rpc('register_scanner_for_event', {
    p_verification_code: verificationCode,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const fetchMyScannerEvents = async () => {
  const { data, error } = await supabase.rpc('get_my_scanner_events');
  if (error) {
    console.warn('fetchMyScannerEvents:', error.message);
    return null;
  }
  return Array.isArray(data) ? data : (data ? [data] : []);
};

export const mapRemoteScannerEvent = (row) => ({
  id: row.id,
  title: row.title,
  date: row.date ? new Date(row.date) : new Date(),
  startTime: row.startTime ? new Date(row.startTime) : null,
  endTime: row.endTime ? new Date(row.endTime) : null,
  venue: row.venue,
  coverImage: row.coverImage,
  status: row.status || 'upcoming',
  verificationCode: row.verificationCode,
});

export const createScannerInvite = async (eventId) => {
  const { data, error } = await supabase.rpc('create_scanner_invite', {
    p_event_id: eventId,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const previewScannerInvite = async (inviteToken) => {
  const { data, error } = await supabase.rpc('preview_scanner_invite', {
    p_invite_token: inviteToken,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const claimScannerInvite = async (inviteToken) => {
  const { data, error } = await supabase.rpc('claim_scanner_invite', {
    p_invite_token: inviteToken,
  });
  if (error) throw new Error(error.message);
  return data;
};
