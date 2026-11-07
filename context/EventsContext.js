import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { fetchExploreEvents, fetchEventById } from '../services/eventsService';
import {
  syncEventForShare,
  deleteSyncedEvent,
  syncMyEventsToCloud,
} from '../services/shareService';
import {
  createTicketShare,
  claimTicketShare,
  assignTicketHolder,
  fetchHeldTicketsFromSupabase,
  getOrderShareCompanions,
} from '../services/ticketShareService';
import { samba } from '../theme/samba';

const EventsContext = createContext();

const toValidDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const applyTimePartsToDate = (baseDate, timeValue) => {
  const eventDateTime = toValidDate(baseDate);
  if (!eventDateTime || timeValue == null) return null;

  if (timeValue instanceof Date) {
    eventDateTime.setHours(
      timeValue.getHours(),
      timeValue.getMinutes(),
      timeValue.getSeconds(),
      timeValue.getMilliseconds(),
    );
    return eventDateTime;
  }

  const timeStr = timeValue.toString();
  const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (timeParts) {
    let hours = parseInt(timeParts[1], 10);
    const minutes = parseInt(timeParts[2], 10);
    const period = timeParts[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    else if (period === 'AM' && hours === 12) hours = 0;
    eventDateTime.setHours(hours, minutes, 0, 0);
  }
  return eventDateTime;
};

const getEventStartDateTime = (event) => {
  if (!event?.date || !event?.startTime) return null;
  const liveStart = toValidDate(event.liveStartedAt);
  if (liveStart) return liveStart;
  if (event.startedEarly || event.status === 'live') {
    const start = toValidDate(event.startTime);
    if (start) return start;
  }
  return applyTimePartsToDate(event.date, event.startTime);
};

const getEventEndDateTime = (event, startDateTime) => {
  if (!startDateTime) return null;
  if (event.endTime && event.hasEndTime !== false) {
    return applyTimePartsToDate(event.date, event.endTime);
  }
  return new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000);
};

const computeEventStatus = (event, now = new Date()) => {
  if (event.status === 'completed') return 'completed';

  // Explicitly live events can only become completed — never upcoming
  if (event.status === 'live' || event.startedEarly || event.liveStartedAt) {
    const start = getEventStartDateTime(event);
    if (!start) return 'live';
    const end = getEventEndDateTime(event, start);
    return now > end ? 'completed' : 'live';
  }

  const start = getEventStartDateTime(event);
  if (!start) return event.status || 'upcoming';
  const end = getEventEndDateTime(event, start);
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'completed';
};

const mergeEventUpdate = (existing, incoming) => {
  const processed = {
    ...incoming,
    startTime: incoming.startTime !== undefined
      ? toValidDate(incoming.startTime) ?? existing.startTime
      : existing.startTime,
    endTime: incoming.endTime !== undefined
      ? (incoming.endTime ? toValidDate(incoming.endTime) : null)
      : existing.endTime,
    updatedAt: new Date(),
  };

  if (incoming.status === 'completed') {
    return { ...existing, ...processed, status: 'completed' };
  }

  if (incoming.status === 'live' || incoming.startedEarly || incoming.liveStartedAt) {
    const now = toValidDate(incoming.liveStartedAt) || toValidDate(incoming.startTime) || new Date();
    return {
      ...existing,
      ...processed,
      status: 'live',
      startedEarly: true,
      liveStartedAt: toValidDate(incoming.liveStartedAt) || existing.liveStartedAt || now,
      startTime: toValidDate(incoming.startTime) || now,
    };
  }

  if (existing.status === 'live' || existing.startedEarly || existing.liveStartedAt) {
    return {
      ...existing,
      ...processed,
      status: 'live',
      startedEarly: true,
      startTime: existing.startTime,
      liveStartedAt: existing.liveStartedAt ?? existing.startTime,
    };
  }

  return { ...existing, ...processed };
};

const isEventLive = (event, now = new Date()) => computeEventStatus(event, now) === 'live';

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};

export const EventsProvider = ({ children }) => {
  const { user } = useAuth(); // Get current user
  const [events, setEvents] = useState([]);
  const [followedOrganizers, setFollowedOrganizers] = useState([]);
  const [organizerFollowers, setOrganizerFollowers] = useState({});
  const [userTickets, setUserTickets] = useState([]);
  const [eventActivities, setEventActivities] = useState({});
  const [loading, setLoading] = useState(true);

  // Helper function to get user-specific storage keys
  const getUserStorageKey = (baseKey) => {
    const userId = user?.id || user?.email || 'anonymous';
    return `${baseKey}_${userId}`;
  };

  // Clear user data when user changes
  useEffect(() => {
    if (user) {
      console.log('🔄 User changed, loading user-specific data for:', user.email);
      cleanupOldStorageKeys(); // Clean up old non-user-specific keys
      loadUserSpecificData();
    } else {
      console.log('🔄 No user, clearing all data');
      clearUserData();
    }
  }, [user?.id, user?.email]);

  const clearUserData = () => {
    setUserTickets([]);
    setFollowedOrganizers([]);
    setEventActivities({});
  };

  // Clean up old storage keys that weren't user-specific
  const cleanupOldStorageKeys = async () => {
    try {
      const oldKeys = ['userTickets', 'followedOrganizers', 'eventActivities'];
      for (const key of oldKeys) {
        await AsyncStorage.removeItem(key);
      }
      console.log('🧹 Cleaned up old storage keys');
    } catch (error) {
      console.error('Error cleaning up old storage keys:', error);
    }
  };

  const loadUserSpecificData = async () => {
    try {
      await Promise.all([
        loadUserTickets(),
        loadFollowedOrganizers(),
        loadEventActivities()
      ]);
    } catch (error) {
      console.error('Error loading user-specific data:', error);
    }
  };

  // Update storage methods to use user-specific keys
  const loadUserTickets = async () => {
    try {
      if (!user) return;
      
      const userTicketsKey = getUserStorageKey('userTickets');
      const storedTickets = await AsyncStorage.getItem(userTicketsKey);
      
      if (storedTickets) {
        const parsedTickets = JSON.parse(storedTickets);
        // Convert date strings back to Date objects
        const ticketsWithDates = parsedTickets.map(ticket => ({
          ...ticket,
          purchaseDate: new Date(ticket.purchaseDate),
          eventDate: new Date(ticket.eventDate)
        }));
        setUserTickets(ticketsWithDates);
        console.log('📋 Loaded user tickets:', ticketsWithDates.length, 'for user:', user.email);
      } else {
        setUserTickets([]);
        console.log('📋 No tickets found for user:', user.email);
      }
    } catch (error) {
      console.error('Error loading user tickets:', error);
      setUserTickets([]);
    }
  };

  const saveUserTickets = async (ticketsToSave) => {
    try {
      if (!user) return;
      
      const userTicketsKey = getUserStorageKey('userTickets');
      await AsyncStorage.setItem(userTicketsKey, JSON.stringify(ticketsToSave));
      console.log('💾 Saved user tickets:', ticketsToSave.length, 'for user:', user.email);
    } catch (error) {
      console.error('Error saving user tickets:', error);
    }
  };

  const loadFollowedOrganizers = async () => {
    try {
      if (!user) return;
      
      const followedKey = getUserStorageKey('followedOrganizers');
      const storedFollowed = await AsyncStorage.getItem(followedKey);
      
      if (storedFollowed) {
        const parsed = JSON.parse(storedFollowed);
        // Ensure it's always an array
        setFollowedOrganizers(Array.isArray(parsed) ? parsed : []);
      } else {
        // Ensure it's initialized as an empty array if no storage
        setFollowedOrganizers([]);
      }
    } catch (error) {
      console.error('Error loading followed organizers:', error);
      // Ensure it's set to empty array on error
      setFollowedOrganizers([]);
    }
  };

  const saveFollowedOrganizers = async (organizersToSave) => {
    try {
      if (!user) return;
      
      const followedKey = getUserStorageKey('followedOrganizers');
      await AsyncStorage.setItem(followedKey, JSON.stringify(organizersToSave));
    } catch (error) {
      console.error('Error saving followed organizers:', error);
    }
  };

  const loadEventActivities = async () => {
    try {
      if (!user) return;
      
      const activitiesKey = getUserStorageKey('eventActivities');
      const storedActivities = await AsyncStorage.getItem(activitiesKey);
      
      if (storedActivities) {
        const parsedActivities = JSON.parse(storedActivities);
        // Convert date strings back to Date objects
        const activitiesWithDates = {};
        for (const eventId in parsedActivities) {
          activitiesWithDates[eventId] = parsedActivities[eventId].map(activity => ({
            ...activity,
            timestamp: new Date(activity.timestamp)
          }));
        }
        setEventActivities(activitiesWithDates);
      }
    } catch (error) {
      console.error('Error loading event activities:', error);
    }
  };

  const saveEventActivities = async (activitiesToSave) => {
    try {
      if (!user) return;
      
      const activitiesKey = getUserStorageKey('eventActivities');
      await AsyncStorage.setItem(activitiesKey, JSON.stringify(activitiesToSave));
    } catch (error) {
      console.error('Error saving event activities:', error);
    }
  };

  // Load general (non-user-specific) data on mount
  useEffect(() => {
    loadEvents();
    loadOrganizerFollowers();
  }, []);

  // Reload from Supabase when user logs in (fresh explore feed + cloud sync)
  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user?.id, user?.role]);

  // Load events, followed organizers, follower counts, and tickets from storage on app start
  useEffect(() => {
    loadEvents();
    loadFollowedOrganizers();
    loadOrganizerFollowers();
    loadUserTickets();
    loadEventActivities();
  }, []);

  // Force update all events with current user organization name
  const forceUpdateAllEventsWithOrgName = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.providerInfo?.organizationName && user?.id) {
          console.log('🔄 Force updating all events with organization name:', user.providerInfo.organizationName);
          await updateEventsWithOrganizationNames(user.providerInfo, user.id);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error force updating events with organization names:', error);
      return false;
    }
  };

  const normalizeStoredEvent = (event) => ({
    ...event,
    date: new Date(event.date),
    startTime: new Date(event.startTime),
    endTime: event.endTime ? new Date(event.endTime) : null,
    liveStartedAt: event.liveStartedAt ? new Date(event.liveStartedAt) : null,
    startedEarly: !!event.startedEarly,
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
  });

  const mergeLocalAndSupabaseEvents = (localEvents, remoteEvents) => {
    const byId = new Map();
    remoteEvents.forEach((event) => byId.set(event.id, event));
    localEvents.forEach((local) => {
      const remote = byId.get(local.id);
      if (!remote) {
        byId.set(local.id, local);
        return;
      }
      const localIsLive = local.status === 'live' || local.startedEarly || local.liveStartedAt;
      const remoteIsLive = remote.status === 'live' || remote.startedEarly || remote.liveStartedAt;
      const localUpdated = toValidDate(local.updatedAt)?.getTime() || 0;
      const remoteUpdated = toValidDate(remote.updatedAt)?.getTime() || 0;
      if (localIsLive || (!remoteIsLive && localUpdated >= remoteUpdated)) {
        byId.set(local.id, local);
      }
    });
    return Array.from(byId.values());
  };

  // ── CT/New England fallback events (shown on map near New London, CT) ──────
  const CT_FALLBACK_EVENTS = [
    {
      id: 'mock_ct_latin_night', title: 'New London Latin Night',
      description: 'Live salsa band, bachata DJ, and beginner lessons. Right on the waterfront.',
      date: new Date(Date.now() + 5 * 86400000),
      startTime: new Date(Date.now() + 5 * 86400000),
      endTime: null, hasEndTime: false,
      venue: 'Oasis Waterfront Bar',
      address: { street:'1 Golden St', city:'New London', state:'CT', zipCode:'06320', formatted:'1 Golden St, New London, CT 06320', coordinates:{ latitude:41.3557, longitude:-72.0995 } },
      coverImage: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800',
      flyers: ['https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800'],
      tickets: [{ id:'t1', name:'General', price:18, isFree:false, quantity:120, isUnlimited:false, availableQuantity:120 }, { id:'t2', name:'VIP', price:45, isFree:false, quantity:20, isUnlimited:false, availableQuantity:20 }],
      organizer: { id:'mock-org-1', name:'Samba Nights' }, organizerId:'mock-org-1',
      status:'upcoming', ticketSalesOpen:true, showOnExplore:true, category:'Nightlife', source:'fallback',
    },
    {
      id: 'mock_ct_mystic_rooftop', title: 'Mystic Rooftop Sessions',
      description: 'Sunset DJ set overlooking Mystic Harbor. Craft cocktails and local food trucks.',
      date: new Date(Date.now() + 9 * 86400000),
      startTime: new Date(Date.now() + 9 * 86400000),
      endTime: null, hasEndTime: false,
      venue: 'Steamboat Wharf',
      address: { street:'1 Holmes St', city:'Mystic', state:'CT', zipCode:'06355', formatted:'1 Holmes St, Mystic, CT 06355', coordinates:{ latitude:41.3543, longitude:-71.9665 } },
      coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
      flyers: ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800'],
      tickets: [{ id:'t1', name:'Admission', price:22, isFree:false, quantity:200, isUnlimited:false, availableQuantity:200 }],
      organizer: { id:'mock-org-2', name:'Pulse Events' }, organizerId:'mock-org-2',
      status:'upcoming', ticketSalesOpen:true, showOnExplore:true, category:'Festival', source:'fallback',
    },
    {
      id: 'mock_ct_groton_brunch', title: 'Groton Beats & Brunch',
      description: 'Sunday brunch with a live DJ, bottomless mimosas, and harbor views.',
      date: new Date(Date.now() + 3 * 86400000),
      startTime: new Date(Date.now() + 3 * 86400000),
      endTime: null, hasEndTime: false,
      venue: 'Thames Club',
      address: { street:'100 Thames St', city:'Groton', state:'CT', zipCode:'06340', formatted:'100 Thames St, Groton, CT 06340', coordinates:{ latitude:41.3501, longitude:-72.0784 } },
      coverImage: 'https://images.unsplash.com/photo-1415201364774-f6f0ff38f28b?w=800',
      flyers: ['https://images.unsplash.com/photo-1415201364774-f6f0ff38f28b?w=800'],
      tickets: [{ id:'t1', name:'Brunch Seat', price:48, isFree:false, quantity:60, isUnlimited:false, availableQuantity:60 }],
      organizer: { id:'mock-org-1', name:'Samba Nights' }, organizerId:'mock-org-1',
      status:'upcoming', ticketSalesOpen:true, showOnExplore:true, category:'Food & Drink', source:'fallback',
    },
    {
      id: 'mock_ct_newhaven_indie', title: 'New Haven Indie Night',
      description: 'Three local indie acts at a historic venue near Yale.',
      date: new Date(Date.now() + 12 * 86400000),
      startTime: new Date(Date.now() + 12 * 86400000),
      endTime: null, hasEndTime: false,
      venue: "Toad's Place",
      address: { street:'300 York St', city:'New Haven', state:'CT', zipCode:'06511', formatted:'300 York St, New Haven, CT 06511', coordinates:{ latitude:41.3083, longitude:-72.9279 } },
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
      flyers: ['https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800'],
      tickets: [{ id:'t1', name:'Standing', price:25, isFree:false, quantity:150, isUnlimited:false, availableQuantity:150 }],
      organizer: { id:'mock-org-2', name:'Pulse Events' }, organizerId:'mock-org-2',
      status:'upcoming', ticketSalesOpen:true, showOnExplore:true, category:'Live Music', source:'fallback',
    },
  ];

  const loadEvents = async () => {
    try {
      setLoading(true);
      const storedEvents = await AsyncStorage.getItem('events');
      let localEvents = [];

      if (storedEvents) {
        localEvents = JSON.parse(storedEvents).map(normalizeStoredEvent);
        console.log('📅 Loaded events from storage:', localEvents.length);
      } else {
        console.log('📅 No stored events found');
      }

      if (user?.role === 'provider' && user?.id) {
        localEvents = await backfillAndSyncLocalEvents(localEvents);
      }

      const remoteEvents = await fetchExploreEvents();
      if (remoteEvents.length > 0) {
        console.log('☁️ Loaded explore events from Suupabase:', remoteEvents.length);
      }

      // Always merge CT fallback events (they have unique IDs, won't duplicate)
      const fallbackFiltered = CT_FALLBACK_EVENTS.filter(
        fb => !remoteEvents.some(r => r.id === fb.id) && !localEvents.some(l => l.id === fb.id)
      );

      const merged = mergeLocalAndSupabaseEvents(localEvents, [...remoteEvents, ...fallbackFiltered]);
      setEvents(merged);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents(CT_FALLBACK_EVENTS); // at minimum show CT events
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizerFollowers = async () => {
    try {
      const storedFollowers = await AsyncStorage.getItem('organizerFollowers');
      if (storedFollowers) {
        setOrganizerFollowers(JSON.parse(storedFollowers));
      }
    } catch (error) {
      console.error('Error loading organizer followers:', error);
    }
  };

  const saveOrganizerFollowers = async (followersToSave) => {
    try {
      await AsyncStorage.setItem('organizerFollowers', JSON.stringify(followersToSave));
    } catch (error) {
      console.error('Error saving organizer followers:', error);
    }
  };

  const logActivity = async (eventId, activity) => {
    try {
      const activityWithTimestamp = {
        ...activity,
        timestamp: new Date(),
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      };

      const updatedActivities = {
        ...eventActivities,
        [eventId]: [
          activityWithTimestamp,
          ...(eventActivities[eventId] || [])
        ].slice(0, 50) // Keep only last 50 activities per event
      };

      setEventActivities(updatedActivities);
      await saveEventActivities(updatedActivities);

      console.log('📝 Activity logged for event', eventId, ':', activity.type);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const getEventActivities = (eventId) => {
    return eventActivities[eventId] || [];
  };

  const registerEventScanner = async (eventId, scannerInfo) => {
    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) return false;

      const scannerKey = scannerInfo.id || scannerInfo.email || scannerInfo.name;
      const alreadyRegistered = (event.activeScanners || []).some(
        (s) => (s.id || s.email || s.name) === scannerKey,
      );
      if (alreadyRegistered) return false;

      const scanner = {
        id: scannerInfo.id || scannerKey,
        name: scannerInfo.name || 'Scanner',
        email: scannerInfo.email || null,
        profilePicture: scannerInfo.profilePicture || null,
        joinedAt: new Date(),
      };

      await updateEvent(eventId, {
        activeScanners: [...(event.activeScanners || []), scanner],
      });

      await logActivity(eventId, {
        type: 'scanner_added',
        icon: 'smartphone',
        scannerName: scanner.name,
        avatar: scanner.profilePicture || null,
        text: `${scanner.name} joined as a scanner`,
      });

      return true;
    } catch (error) {
      console.error('Error registering event scanner:', error);
      return false;
    }
  };

  const followOrganizer = async (organizerName, organizerId) => {
    try {
      const organizerKey = organizerId || organizerName;
      if (!followedOrganizers.includes(organizerKey)) {
        // Add to user's followed list
        const updatedFollowed = [...followedOrganizers, organizerKey];
        setFollowedOrganizers(updatedFollowed);
        await saveFollowedOrganizers(updatedFollowed);

        // Increment organizer's follower count
        const updatedFollowers = {
          ...organizerFollowers,
          [organizerKey]: (organizerFollowers[organizerKey] || 0) + 1
        };
        setOrganizerFollowers(updatedFollowers);
        await saveOrganizerFollowers(updatedFollowers);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error following organizer:', error);
      throw error;
    }
  };

  const unfollowOrganizer = async (organizerName, organizerId) => {
    try {
      const organizerKey = organizerId || organizerName;
      
      // Remove from user's followed list
      const updatedFollowed = followedOrganizers.filter(org => org !== organizerKey);
      setFollowedOrganizers(updatedFollowed);
      await saveFollowedOrganizers(updatedFollowed);

      // Decrement organizer's follower count (don't go below 0)
      const updatedFollowers = {
        ...organizerFollowers,
        [organizerKey]: Math.max(0, (organizerFollowers[organizerKey] || 0) - 1)
      };
      setOrganizerFollowers(updatedFollowers);
      await saveOrganizerFollowers(updatedFollowers);
      
      return true;
    } catch (error) {
      console.error('Error unfollowing organizer:', error);
      throw error;
    }
  };

  const isFollowingOrganizer = (organizerName, organizerId) => {
    const organizerKey = organizerId || organizerName;
    return followedOrganizers.includes(organizerKey);
  };

  const getOrganizerStats = (organizerName, organizerId) => {
    console.log('📊 Getting organizer stats for:', { organizerName, organizerId });
    console.log('📋 Total events to search:', events.length);
    
    const organizerEvents = events.filter(event => {
      // Helper function to safely get organizer name as string
      const getOrganizerName = (organizer) => {
        if (typeof organizer === 'string') {
          return organizer;
        }
        if (typeof organizer === 'object' && organizer?.name) {
          return organizer.name;
        }
        return null;
      };

      const eventOrganizerName = getOrganizerName(event.organizer);
      
      // Multiple ways to match organizer
      const matches = 
        event.organizer === organizerName || 
        event.organizerId === organizerId ||
        event.organizer?.name === organizerName ||
        event.organizer?.id === organizerId ||
        event.organizerData?.name === organizerName ||
        event.createdBy === organizerId ||
        eventOrganizerName === organizerName ||
        // Case insensitive matching - only call toLowerCase on strings
        (typeof event.organizer === 'string' && organizerName && event.organizer.toLowerCase() === organizerName.toLowerCase()) ||
        (eventOrganizerName && organizerName && eventOrganizerName.toLowerCase() === organizerName.toLowerCase()) ||
        (event.organizer?.name && organizerName && typeof event.organizer.name === 'string' && event.organizer.name.toLowerCase() === organizerName.toLowerCase());
      
      if (matches) {
        console.log('✅ Found matching event for stats:', event.title);
      }
      
      return matches;
    });

    const totalEvents = organizerEvents.length;
    const totalAttendees = organizerEvents.reduce((sum, event) => sum + (event.bookedSpots || 0), 0);
    
    // Get actual follower count from the tracking system
    const organizerKey = organizerId || organizerName;
    const followerCount = organizerFollowers[organizerKey] || 0;

    console.log('📊 Final stats:', { totalEvents, totalAttendees, followers: followerCount });

    return {
      totalEvents,
      totalAttendees,
      followers: followerCount
    };
  };

  const saveEvents = async (eventsToSave) => {
    try {
      await AsyncStorage.setItem('events', JSON.stringify(eventsToSave));
    } catch (error) {
      console.error('Error saving events:', error);
    }
  };

  const cloudSyncEvent = async (event) => {
    if (user?.role !== 'provider' || !user?.id || !event) return;
    await syncEventForShare(event, user.id);
  };

  const cloudDeleteEvent = async (eventId) => {
    if (user?.role !== 'provider' || !user?.id || !eventId) return;
    await deleteSyncedEvent(eventId);
  };

  const backfillAndSyncLocalEvents = async (localEvents) => {
    if (user?.role !== 'provider' || !user?.id) return localEvents;

    let backfillChanged = false;
    const backfilled = localEvents.map((event) => {
      if (String(event.id).startsWith('mock_')) return event;

      const orgId = event.organizerId || event.organizer?.id;
      if (orgId && orgId !== user.id) return event;
      if (orgId === user.id) return event;

      backfillChanged = true;
      return {
        ...event,
        organizerId: user.id,
        organizer: {
          ...(typeof event.organizer === 'object' ? event.organizer : {}),
          id: user.id,
        },
      };
    });

    if (backfillChanged) {
      await saveEvents(backfilled);
      console.log('☁️ Backfilled organizer_id on legacy local events');
    }

    await syncMyEventsToCloud(backfilled, user.id);
    return backfilled;
  };

  const addEvent = async (eventData) => {
    try {
      const organizerId = user?.role === 'provider' && user?.id
        ? user.id
        : (eventData.organizerId || eventData.organizer?.id);

      const newEvent = {
        ...eventData,
        id: eventData.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
        organizerId,
        organizer: {
          ...(typeof eventData.organizer === 'object' ? eventData.organizer : {}),
          id: organizerId,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'upcoming',
        // Initialize attendance tracking
        scannedTickets: 0,
        actualAttendees: 0,
        bookedSpots: 0,
        // Initialize sold count for each ticket type
        tickets: eventData.tickets.map(ticket => ({
          ...ticket,
          sold: 0,
          scanned: 0
        }))
      };
      
      const updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);
      await saveEvents(updatedEvents);
      await cloudSyncEvent(newEvent);
      return newEvent;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  const updateEvent = async (eventId, updatedData) => {
    try {
      let updatedEvent = null;
      let nextEvents = [];

      setEvents((prev) => {
        nextEvents = prev.map((event) => {
          if (event.id !== eventId) return event;
          updatedEvent = mergeEventUpdate(event, updatedData);
          return updatedEvent;
        });
        return nextEvents;
      });

      await saveEvents(nextEvents);
      if (updatedEvent) await cloudSyncEvent(updatedEvent);
      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  };

  const startEventLive = async (eventId) => {
    const now = new Date();
    return updateEvent(eventId, {
      status: 'live',
      startedEarly: true,
      liveStartedAt: now,
      startTime: now,
    });
  };

  const deleteEvent = async (eventId) => {
    try {
      await cloudDeleteEvent(eventId);
      const updatedEvents = events.filter(event => event.id !== eventId);
      setEvents(updatedEvents);
      await saveEvents(updatedEvents);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  const getEventById = (eventId) => {
    return events.find(event => event.id === eventId);
  };

  const getEventsByOrganizer = (organizerId) => {
    return events.filter(event => event.organizer.id === organizerId);
  };

  const getUpcomingEvents = () => {
    return events
      .filter((event) => {
        if (event.status === 'live' || event.startedEarly || event.liveStartedAt) return false;
        return computeEventStatus(event) === 'upcoming';
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getPastEvents = () => {
    return events
      .filter(event => computeEventStatus(event) === 'completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const searchEvents = (query) => {
    const lowercaseQuery = query.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(lowercaseQuery) ||
      event.description.toLowerCase().includes(lowercaseQuery) ||
      event.venue.toLowerCase().includes(lowercaseQuery) ||
      event.address.city.toLowerCase().includes(lowercaseQuery)
    );
  };

  const getEventsByCategory = (category) => {
    return events.filter(event => 
      event.category && event.category.toLowerCase() === category.toLowerCase()
    );
  };

  // Get events near user's location
  const getEventsNearUser = (userLocation, radiusMiles = 50) => {
    if (!userLocation?.latitude || !userLocation?.longitude) {
      return [];
    }

    return events
      .filter(event => {
        if (!event.address?.coordinates?.latitude || !event.address?.coordinates?.longitude) {
          return false;
        }
        if (event.status !== 'upcoming' && event.status !== 'live') {
          return false;
        }
        if (event.showOnExplore === false) {
          return false;
        }

        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          event.address.coordinates.latitude,
          event.address.coordinates.longitude
        );

        return distance <= radiusMiles;
      })
      .sort((a, b) => {
        // Sort by distance, then by date
        const distanceA = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          a.address.coordinates.latitude,
          a.address.coordinates.longitude
        );
        const distanceB = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          b.address.coordinates.latitude,
          b.address.coordinates.longitude
        );
        
        if (distanceA !== distanceB) {
          return distanceA - distanceB;
        }
        return new Date(a.date) - new Date(b.date);
      });
  };

  // Get events in the same state as user
  const getEventsByState = (userState) => {
    if (!userState) return [];
    
    return events
      .filter(event => {
        if (!event.address?.state) return false;
        if (event.status !== 'upcoming' && event.status !== 'live') return false;
        if (event.showOnExplore === false) return false;
        
        return event.address.state.toLowerCase() === userState.toLowerCase();
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in miles
  };

  const updateEventTicketSales = async (eventId, ticketSalesOpen) => {
    try {
      const updatedEvents = events.map(event => 
        event.id === eventId 
          ? { ...event, ticketSalesOpen, updatedAt: new Date() }
          : event
      );
      
      setEvents(updatedEvents);
      await saveEvents(updatedEvents);
      
      return updatedEvents.find(event => event.id === eventId);
    } catch (error) {
      console.error('Error updating ticket sales:', error);
      throw error;
    }
  };

  const purchaseTickets = async (event, ticketDetails, userInfo) => {
    try {
      console.log('💳 Starting ticket purchase for event:', event.title);
      console.log('📋 Initial event ticket state:', event.tickets.map(t => ({
        name: t.name,
        quantity: t.quantity,
        availableQuantity: t.availableQuantity,
        sold: t.sold,
        isUnlimited: t.isUnlimited
      })));
      console.log('🎫 Ticket details to purchase:', ticketDetails);
      
      // First, validate ticket availability before proceeding
      const validationErrors = [];
      let totalTicketsPurchased = 0;
      
      Object.entries(ticketDetails).forEach(([ticketType, quantity]) => {
        if (quantity > 0) {
          totalTicketsPurchased += quantity; // Count actual number of tickets requested
          
          // Find the ticket type info from the event
          const eventTicketType = event.tickets.find(t => t.name === ticketType);
          
          if (!eventTicketType) {
            validationErrors.push(`Ticket type "${ticketType}" not found`);
            return;
          }
          
          // Check availability for this ticket type
          const availableQuantity = eventTicketType.isUnlimited 
            ? Infinity 
            : (eventTicketType.availableQuantity || eventTicketType.quantity || 0);
          
          console.log(`🔍 Checking availability for "${ticketType}":`, {
            requested: quantity,
            available: availableQuantity,
            isUnlimited: eventTicketType.isUnlimited
          });
          
          if (quantity > availableQuantity) {
            validationErrors.push(
              `Only ${availableQuantity} tickets available for "${ticketType}", but ${quantity} requested`
            );
          }
        }
      });
      
      // Check overall event capacity if it exists
      if (event.totalSpots && typeof event.totalSpots === 'number') {
        const currentSpotsLeft = event.spotsLeft || event.totalSpots;
        if (totalTicketsPurchased > currentSpotsLeft) {
          validationErrors.push(
            `Event only has ${currentSpotsLeft} spots left, but ${totalTicketsPurchased} tickets requested`
          );
        }
      }
      
      // If there are validation errors, throw them
      if (validationErrors.length > 0) {
        console.error('❌ Validation errors:', validationErrors);
        throw new Error(`Purchase validation failed: ${validationErrors.join('; ')}`);
      }
      
      // Create individual tickets with the same ticket number but different QR codes
      console.log('🎫 Creating individual tickets for event:', event.title);
      
      // Create a proper event datetime by combining date and start time
      const eventDateTime = new Date(event.date);
      const startTime = new Date(event.startTime);
      eventDateTime.setHours(
        startTime.getHours(),
        startTime.getMinutes(),
        startTime.getSeconds()
      );

      const newTickets = [];
      
      // Generate a single ticket number for this purchase
      const sharedTicketNumber = `${Date.now()}${Math.random().toString(36).substr(2, 4)}`;
      
      // Create individual tickets for each requested quantity
      Object.entries(ticketDetails).forEach(([ticketType, quantity]) => {
        if (quantity > 0) {
          const eventTicketType = event.tickets.find(t => t.name === ticketType);
          
          // Create the actual number of tickets requested
          for (let i = 0; i < quantity; i++) {
            const ticket = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              ticketNumber: sharedTicketNumber, // Same ticket number for all tickets in this purchase
              eventId: event.id,
              eventTitle: event.title,
              eventDate: eventDateTime,
              eventTime: event.startTime,
              eventLocation: event.address?.formatted || event.venue,
              eventImage: event.coverImage || event.flyers?.[0] || 'https://via.placeholder.com/400x300',
              ticketType: ticketType,
              price: eventTicketType?.price || 0,
              isFree: eventTicketType?.isFree || false,
              purchaseDate: new Date(),
              buyerName: userInfo.name,
              buyerEmail: userInfo.email,
              buyerAvatar: userInfo.profilePicture || null,
              status: 'upcoming',
              qrCode: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`, // Different QR code for each ticket
              organizer: event.organizer,
              joinedGuestList: userInfo.joinGuestList || false
            };
            
            newTickets.push(ticket);
          }
        }
      });

      // Add all new tickets to user's tickets
      const updatedTickets = [...userTickets, ...newTickets];
      setUserTickets(updatedTickets);
      await saveUserTickets(updatedTickets);
      
      console.log('✅ Created individual tickets:', newTickets.length);

      // Update event ticket availability and spots
      const updatedEvent = { ...event };
      
      // Update each ticket type's availability
      updatedEvent.tickets = event.tickets.map(ticketType => {
        const purchasedQuantity = ticketDetails[ticketType.name] || 0;
        if (purchasedQuantity > 0) {
          // For unlimited tickets, don't update availableQuantity
          if (ticketType.isUnlimited) {
            return {
              ...ticketType,
              sold: (ticketType.sold || 0) + purchasedQuantity
            };
          } else {
            const currentAvailable = ticketType.availableQuantity || ticketType.quantity || 0;
            const newAvailable = Math.max(0, currentAvailable - purchasedQuantity);
            console.log(`📊 Updating "${ticketType.name}":`, {
              previousAvailable: currentAvailable,
              purchased: purchasedQuantity,
              newAvailable: newAvailable
            });
            return {
              ...ticketType,
              availableQuantity: newAvailable,
              sold: (ticketType.sold || 0) + purchasedQuantity
            };
          }
        }
        return ticketType;
      });

      // Update event's total spots if it has a limit
      if (updatedEvent.totalSpots && typeof updatedEvent.totalSpots === 'number') {
        updatedEvent.spotsLeft = Math.max(0, (updatedEvent.spotsLeft || updatedEvent.totalSpots) - totalTicketsPurchased);
        updatedEvent.bookedSpots = (updatedEvent.bookedSpots || 0) + totalTicketsPurchased;
      }

      console.log('📋 Final event ticket state:', updatedEvent.tickets.map(t => ({
        name: t.name,
        quantity: t.quantity,
        availableQuantity: t.availableQuantity,
        sold: t.sold,
        isUnlimited: t.isUnlimited
      })));

      // Add to guest list if user opted in
      if (userInfo.joinGuestList) {
        // Initialize guest list if it doesn't exist
        if (!updatedEvent.guestList) {
          updatedEvent.guestList = [];
        }
        
        // Check if user is already on the guest list (by email to avoid duplicates)
        const existingGuestIndex = updatedEvent.guestList.findIndex(guest => guest.email === userInfo.email);
        
        if (existingGuestIndex === -1) {
          // Add new guest to the list
          updatedEvent.guestList.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: userInfo.name,
            email: userInfo.email,
            joinedAt: new Date(),
            ticketCount: totalTicketsPurchased
          });
          
          console.log('👥 Added to guest list:', userInfo.name);
        } else {
          // Update existing guest's ticket count
          updatedEvent.guestList[existingGuestIndex].ticketCount += totalTicketsPurchased;
          console.log('👥 Updated guest list ticket count for:', userInfo.name);
        }
      }

      // Update the event in the events array and save to storage
      const updatedEvents = events.map(e => e.id === event.id ? updatedEvent : e);
      setEvents(updatedEvents);
      await saveEvents(updatedEvents);

      // Log activity for ticket purchase
      await logActivity(event.id, {
        type: 'ticket_purchased',
        icon: 'shopping-bag',
        text: `${totalTicketsPurchased} ticket${totalTicketsPurchased > 1 ? 's' : ''} purchased by ${userInfo.name}`,
        color: samba.green,
        purchaserName: userInfo.name,
        avatar: userInfo.profilePicture || null,
        ticketCount: totalTicketsPurchased,
        ticketTypes: Object.keys(ticketDetails).filter(key => ticketDetails[key] > 0)
      });

      console.log('✅ Tickets purchased successfully:', newTickets.length, 'tickets');
      console.log('📊 Event updated:', {
        eventId: event.id,
        totalTicketsPurchased,
        newSpotsLeft: updatedEvent.spotsLeft,
        newBookedSpots: updatedEvent.bookedSpots,
        updatedTicketAvailability: updatedEvent.tickets.map(t => ({
          name: t.name,
          availableQuantity: t.availableQuantity,
          sold: t.sold,
          isUnlimited: t.isUnlimited
        }))
      });
      
      return newTickets;
    } catch (error) {
      console.error('Error purchasing tickets:', error);
      throw error;
    }
  };

  const saveTicketsFromPurchase = async (event, purchaseResult, buyer) => {
    const eventDateTime = toValidDate(event.date) || new Date();
    const startTime = toValidDate(event.startTime);
    if (startTime) {
      eventDateTime.setHours(
        startTime.getHours(),
        startTime.getMinutes(),
        startTime.getSeconds(),
      );
    }

    const newTickets = (purchaseResult.tickets || []).map((t) => ({
      id: t.id,
      ticketNumber: purchaseResult.ticketNumber,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: eventDateTime,
      eventTime: event.startTime,
      eventLocation: event.address?.formatted || event.venue,
      eventImage: event.coverImage || event.flyers?.[0],
      ticketType: t.ticketType,
      price: t.price || 0,
      isFree: t.isFree || false,
      purchaseDate: new Date(),
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerAvatar: buyer.profilePicture || null,
      status: 'upcoming',
      qrCode: t.qrCode,
      organizer: event.organizer,
      orderId: purchaseResult.orderId,
      source: 'supabase',
    }));

    const updatedTickets = [...userTickets, ...newTickets];
    setUserTickets(updatedTickets);
    await saveUserTickets(updatedTickets);

    if (user?.id) {
      await Promise.all(
        newTickets.map((t) => assignTicketHolder(t.id, user.id)),
      );
      const withHolder = updatedTickets.map((t) =>
        newTickets.some((n) => n.id === t.id)
          ? { ...t, holderUserId: user.id }
          : t,
      );
      setUserTickets(withHolder);
      await saveUserTickets(withHolder);
    }

    const remoteEvent = await fetchEventById(event.id);
    if (remoteEvent) {
      const updatedEvents = events.map((e) => (
        e.id === event.id
          ? { ...e, ...remoteEvent, scannedTickets: e.scannedTickets, actualAttendees: e.actualAttendees }
          : e
      ));
      setEvents(updatedEvents);
      await saveEvents(updatedEvents);
    }

    return newTickets;
  };

  // Auto-update ticket statuses based on event times
  const updateTicketStatuses = async () => {
    const now = new Date();
    let hasUpdates = false;
    
    const updatedTickets = userTickets.map(ticket => {
      // Skip tickets that are already processed
      if (ticket.status === 'used' || ticket.status === 'missed' || ticket.isScanned) {
        return ticket;
      }
      
      const eventDateTime = new Date(ticket.eventDate);
      
      // Find the corresponding event to get end time
      const correspondingEvent = events.find(e => e.id === ticket.eventId);
      let eventEndDateTime;
      
      if (correspondingEvent && correspondingEvent.endTime) {
        // If event has end time, use that
        const eventDate = new Date(correspondingEvent.date);
        const endTime = new Date(correspondingEvent.endTime);
        eventEndDateTime = new Date(eventDate);
        eventEndDateTime.setHours(
          endTime.getHours(),
          endTime.getMinutes(),
          endTime.getSeconds()
        );
      } else {
        // If no end time, assume event lasts 4 hours
        eventEndDateTime = new Date(eventDateTime.getTime() + (4 * 60 * 60 * 1000));
      }
      
      // If event has ended and ticket wasn't scanned, mark as missed
      if (eventEndDateTime < now && ticket.status === 'upcoming' && !ticket.isScanned) {
        console.log(`⏰ Marking ticket as missed: ${ticket.eventTitle}`);
        hasUpdates = true;
        return { ...ticket, status: 'missed', missedAt: now };
      }
      
      return ticket;
    });
    
    // Save updates if any changes were made
    if (hasUpdates) {
      setUserTickets(updatedTickets);
      await saveUserTickets(updatedTickets);
      console.log('✅ Updated ticket statuses automatically');
    }
    
    return updatedTickets;
  };

  const syncUserTicketsFromSupabase = async () => {
    if (!user?.id) return userTickets;

    const heldFromServer = await fetchHeldTicketsFromSupabase(user.id);
    const heldIdSet = new Set(heldFromServer.map((t) => t.id));
    const merged = [];
    const seen = new Set();

    userTickets.forEach((t) => {
      if (t.source !== 'supabase') {
        merged.push(t);
        seen.add(t.id);
      }
    });

    heldFromServer.forEach((serverTicket) => {
      const local = userTickets.find((t) => t.id === serverTicket.id);
      merged.push(
        local
          ? { ...local, ...serverTicket, holderUserId: user.id }
          : { ...serverTicket, holderUserId: user.id },
      );
      seen.add(serverTicket.id);
    });

    userTickets.forEach((t) => {
      if (
        t.source === 'supabase'
        && !seen.has(t.id)
        && t.buyerEmail?.toLowerCase() === user.email?.toLowerCase()
      ) {
        merged.push({ ...t, holderUserId: t.holderUserId || user.id });
        seen.add(t.id);
      }
    });

    const changed = merged.length !== userTickets.length
      || merged.some((t, i) => t.id !== userTickets[i]?.id);

    if (changed) {
      setUserTickets(merged);
      await saveUserTickets(merged);
    }

    return merged;
  };

  const shareTicket = async (ticketId) => {
    return createTicketShare(ticketId);
  };

  const claimSharedTicket = async (shareToken) => {
    const result = await claimTicketShare(shareToken);
    const { ticket, event } = result;

    const eventDateTime = toValidDate(event?.date) || new Date();
    const startTime = toValidDate(event?.startTime);
    if (startTime) {
      eventDateTime.setHours(
        startTime.getHours(),
        startTime.getMinutes(),
        startTime.getSeconds(),
      );
    }

    const newTicket = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      orderId: ticket.orderId,
      eventId: event.id,
      eventTitle: event.title || 'Event',
      eventDate: eventDateTime,
      eventTime: event.startTime,
      eventLocation: event.venue,
      eventImage: event.coverImage,
      ticketType: ticket.ticketType,
      price: Number(ticket.price) || 0,
      isFree: ticket.isFree,
      buyerName: ticket.buyerName,
      buyerEmail: ticket.buyerEmail,
      status: ticket.status,
      qrCode: ticket.qrCode,
      source: 'supabase',
      holderUserId: user?.id,
      isSharedTicket: true,
      sharedFromUserId: result.share?.sharerUserId,
      purchaseDate: new Date(),
    };

    const withoutDup = userTickets.filter((t) => t.id !== newTicket.id);
    const updated = [...withoutDup, newTicket];
    setUserTickets(updated);
    await saveUserTickets(updated);
    return newTicket;
  };

  const getTicketsByOrderId = (orderId) => {
    if (!orderId) return [];
    return userTickets.filter((t) => t.orderId === orderId);
  };

  const getUserTickets = async (filterType = 'all') => {
    const now = new Date();

    await syncUserTicketsFromSupabase();

    // Auto-update ticket statuses first
    const currentTickets = await updateTicketStatuses();
    
    console.log(`📋 Getting user tickets with filter: ${filterType}`, {
      totalTickets: currentTickets.length,
      currentTime: now.toISOString(),
      ticketStatuses: currentTickets.map(t => ({ id: t.id, status: t.status, eventTitle: t.eventTitle }))
    });
    
    switch (filterType) {
      case 'upcoming':
        const upcomingTickets = currentTickets.filter(ticket => {
          // Only show tickets that are still upcoming and not processed
          const isUpcoming = ticket.status === 'upcoming';
          
          console.log(`🔍 Checking upcoming ticket: ${ticket.eventTitle}`, {
            ticketStatus: ticket.status,
            isUpcoming: isUpcoming
          });
          
          return isUpcoming;
        });
        
        console.log(`✅ Found ${upcomingTickets.length} upcoming tickets`);
        return upcomingTickets;
        
      case 'past':
        const pastTickets = currentTickets.filter(ticket => {
          // Show tickets that were attended (scanned) or missed
          const isPast = ticket.status === 'used' || ticket.status === 'missed' || ticket.isScanned;
          
          console.log(`🕒 Checking past ticket: ${ticket.eventTitle}`, {
            ticketStatus: ticket.status,
            isScanned: ticket.isScanned,
            isPast: isPast
          });
          
          return isPast;
        });
        
        console.log(`✅ Found ${pastTickets.length} past tickets`);
        return pastTickets;
        
      default:
        return currentTickets;
    }
  };

  const getTicketById = (ticketId) => {
    return userTickets.find(ticket => ticket.id === ticketId);
  };

  // Add ticket scanning functionality
  const scanTicket = async (ticketId, eventId) => {
    try {
      console.log('🔍 Scanning ticket:', { ticketId, eventId });
      
      // Find the ticket
      const ticket = userTickets.find(t => t.id === ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      
      // Check if ticket is already scanned
      if (ticket.isScanned) {
        throw new Error('Ticket has already been scanned');
      }
      
      // Find the event
      const event = events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      
      // Mark ticket as scanned
      const updatedTickets = userTickets.map(t => 
        t.id === ticketId 
          ? { ...t, isScanned: true, scannedAt: new Date(), status: 'used' }
          : t
      );
      
      // Update event attendance
      const updatedEvent = {
        ...event,
        scannedTickets: (event.scannedTickets || 0) + 1,
        actualAttendees: (event.actualAttendees || 0) + 1,
        updatedAt: new Date()
      };
      
      // Update events array
      const updatedEvents = events.map(e => e.id === eventId ? updatedEvent : e);
      
      // Save to storage
      setUserTickets(updatedTickets);
      setEvents(updatedEvents);
      await saveUserTickets(updatedTickets);
      await saveEvents(updatedEvents);
      
      // Log activity for this ticket scan
      await logActivity(eventId, {
        type: 'ticket_scanned',
        icon: 'user-check',
        text: `${ticket.buyerName} checked in`,
        color: '#4CAF50',
        ticketId: ticketId,
        attendeeName: ticket.buyerName,
        avatar: ticket.buyerAvatar || null,
        ticketType: ticket.ticketType,
      });
      
      console.log('✅ Ticket scanned successfully:', {
        ticketId,
        eventTitle: event.title,
        newScannedCount: updatedEvent.scannedTickets
      });
      
      return { success: true, ticket: updatedTickets.find(t => t.id === ticketId) };
    } catch (error) {
      console.error('Error scanning ticket:', error);
      throw error;
    }
  };

  const getLiveEvents = () => {
    const now = new Date();
    return events
      .filter(event => isEventLive(event, now))
      .sort((a, b) => {
        const aStart = getEventStartDateTime(a) || new Date(0);
        const bStart = getEventStartDateTime(b) || new Date(0);
        return aStart - bStart;
      });
  };

  const runStatusUpdate = () => {
    setEvents((prev) => {
      const now = new Date();
      let hasChanges = false;

      const updatedEvents = prev.map((event) => {
        if (!event.date || !event.startTime) return event;

        const newStatus = computeEventStatus(event, now);

        // Never demote a live/started event back to upcoming
        if (
          newStatus === 'upcoming'
          && (event.status === 'live' || event.startedEarly || event.liveStartedAt)
        ) {
          return event;
        }

        if (newStatus !== event.status) {
          hasChanges = true;
          return { ...event, status: newStatus, updatedAt: new Date() };
        }
        return event;
      });

      if (hasChanges) {
        saveEvents(updatedEvents);
        return updatedEvents;
      }
      return prev;
    });
  };

  const triggerStatusUpdate = () => {
    runStatusUpdate();
  };

  // Periodic status sync — does not re-run on every events change
  useEffect(() => {
    runStatusUpdate();
    const intervalId = setInterval(runStatusUpdate, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Function to clean up unwanted organizer events
  const cleanupOrganizerEvents = async (organizerNamesToRemove) => {
    try {
      console.log('🧹 Cleaning up events for organizers:', organizerNamesToRemove);
      
      const updatedEvents = events.filter(event => {
        const eventOrganizerName = typeof event.organizer === 'string' 
          ? event.organizer 
          : event.organizer?.name;
        const eventOrganizerId = event.organizerId;
        
        // Remove events that match any of the organizer names/IDs to remove
        const shouldRemove = organizerNamesToRemove.some(name => 
          eventOrganizerName === name || 
          eventOrganizerId === name ||
          (typeof event.organizer === 'string' && event.organizer.toLowerCase() === name.toLowerCase()) ||
          (eventOrganizerName && eventOrganizerName.toLowerCase() === name.toLowerCase())
        );
        
        if (shouldRemove) {
          console.log('🗑️ Removing event:', event.title, 'by organizer:', eventOrganizerName || eventOrganizerId);
        }
        
        return !shouldRemove;
      });
      
      if (updatedEvents.length !== events.length) {
        setEvents(updatedEvents);
        await saveEvents(updatedEvents);
        console.log(`✅ Cleaned up ${events.length - updatedEvents.length} events`);
      } else {
        console.log('✅ No events to clean up');
      }
      
      return updatedEvents;
    } catch (error) {
      console.error('Error cleaning up organizer events:', error);
      throw error;
    }
  };

  // Function to clear all events (useful for removing all sample/test events)
  const clearAllEvents = async () => {
    try {
      console.log('🧹 Clearing all events...');
      setEvents([]);
      await saveEvents([]);
      console.log('✅ All events cleared');
      return [];
    } catch (error) {
      console.error('Error clearing all events:', error);
      throw error;
    }
  };

  // Update events to use organization name from provider info
  const updateEventsWithOrganizationNames = async (userProviderInfo, userId) => {
    if (!userProviderInfo?.organizationName || !userId) {
      console.log('❌ Missing organization name or user ID for update');
      return false;
    }

    try {
      console.log('🔄 Starting to update events with organization name:', userProviderInfo.organizationName);
      console.log('📊 Total events to check:', events.length);
      
      let updatedCount = 0;
      const updatedEvents = events.map(event => {
        // Check if this event was created by the current user
        const isUserEvent = event.organizer?.id === userId || 
                           event.organizerId === userId || 
                           event.createdBy === userId;
        
        if (isUserEvent) {
          // Check if the organizer name needs updating
          const currentOrganizerName = event.organizer?.name;
          const needsUpdate = currentOrganizerName !== userProviderInfo.organizationName;
          
          if (needsUpdate) {
            console.log('🔧 Updating event:', event.title, 'from:', currentOrganizerName, 'to:', userProviderInfo.organizationName);
            updatedCount++;
            
            return {
              ...event,
              organizer: {
                ...event.organizer,
                name: userProviderInfo.organizationName,
                organizationName: userProviderInfo.organizationName,
                description: userProviderInfo.description,
                profilePicture: userProviderInfo.partyLogo ?? event.organizer?.profilePicture,
                contactEmail: userProviderInfo.partyEmail,
                contactPhone: userProviderInfo.partyPhone
              },
              updatedAt: new Date()
            };
          }
        }
        return event;
      });

      if (updatedCount > 0) {
        setEvents(updatedEvents);
        await saveEvents(updatedEvents);
        console.log('✅ Successfully updated', updatedCount, 'events with organization name:', userProviderInfo.organizationName);
        return true;
      } else {
        console.log('ℹ️ No events needed updating');
        return false;
      }
    } catch (error) {
      console.error('Error updating events with organization names:', error);
      return false;
    }
  };

  // Clean up invalid followed organizers
  const cleanupFollowedOrganizers = async () => {
    try {
      const cleanedOrganizers = followedOrganizers.filter(organizerKey => {
        // Remove generic or invalid organizer entries
        return organizerKey !== 'Event Organizer' && 
               !organizerKey.includes('Event Organizer') &&
               organizerKey.length < 50 && // Remove very long hash-like strings
               organizerKey.trim().length > 0;
      });
      
      if (cleanedOrganizers.length !== followedOrganizers.length) {
        console.log('🧹 Cleaning up followed organizers:', {
          before: followedOrganizers.length,
          after: cleanedOrganizers.length,
          removed: followedOrganizers.filter(key => !cleanedOrganizers.includes(key))
        });
        
        setFollowedOrganizers(cleanedOrganizers);
        await saveFollowedOrganizers(cleanedOrganizers);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error cleaning up followed organizers:', error);
      return false;
    }
  };

  // Migrate old tickets to have ticket numbers
  const migrateTicketNumbers = async () => {
    try {
      console.log('🔧 Migrating tickets to add ticket numbers...');
      
      let migrationsMade = false;
      const migratedTickets = userTickets.map(ticket => {
        // If ticket doesn't have a ticketNumber, add one
        if (!ticket.ticketNumber) {
          console.log('🔧 Adding ticket number to ticket:', {
            id: ticket.id,
            eventTitle: ticket.eventTitle
          });
          
          migrationsMade = true;
          
          // Generate a ticket number using the same format as new tickets
          const ticketNumber = `${Date.now()}${Math.random().toString(36).substr(2, 4)}`;
          
          return {
            ...ticket,
            ticketNumber: ticketNumber
          };
        }
        
        return ticket;
      });
      
      if (migrationsMade) {
        console.log('✅ Ticket number migrations applied, saving to storage...');
        setUserTickets(migratedTickets);
        await saveUserTickets(migratedTickets);
        
        return {
          success: true,
          migratedCount: migratedTickets.filter(t => !!t.ticketNumber).length
        };
      } else {
        console.log('✅ No tickets needed ticket number migration');
        return {
          success: true,
          migratedCount: 0
        };
      }
    } catch (error) {
      console.error('❌ Error migrating ticket numbers:', error);
      throw error;
    }
  };

  // Migrate old tickets to new grouped format
  const migrateTicketsToGroupedFormat = async () => {
    try {
      console.log('🔄 Starting ticket migration to grouped format...');
      console.log('📊 Current userTickets:', userTickets);
      console.log('📊 Total tickets to check:', userTickets.length);
      
      let migrationsMade = false;
      const migratedTickets = userTickets.map(ticket => {
        console.log('🔍 Checking ticket:', {
          id: ticket.id,
          hasQrCodes: !!ticket.qrCodes,
          hasTicketNumbers: !!ticket.ticketNumbers,
          hasTotalQuantity: !!ticket.totalQuantity,
          eventTitle: ticket.eventTitle
        });
        
        // Skip if already in new format
        if (ticket.qrCodes && ticket.ticketNumbers && ticket.totalQuantity) {
          console.log('✅ Ticket already in new format:', ticket.id);
          return ticket;
        }
        
        // Convert old format to new format
        console.log('🔄 Migrating ticket:', ticket.id);
        migrationsMade = true;
        
        return {
          ...ticket,
          qrCodes: [ticket.qrCode || ticket.id],
          ticketNumbers: [ticket.id],
          totalQuantity: 1,
          ticketTypes: [{
            type: ticket.ticketType || 'General',
            quantity: 1,
            price: ticket.price || 0,
            isFree: ticket.isFree || false
          }],
          // Keep old fields for backward compatibility
          qrCode: ticket.qrCode,
          ticketType: ticket.ticketType
        };
      });
      
      if (migrationsMade) {
        console.log('✅ Tickets migrated, saving to storage...');
        setUserTickets(migratedTickets);
        await saveUserTickets(migratedTickets);
        
        return {
          success: true,
          migratedCount: migratedTickets.length
        };
      } else {
        console.log('✅ No tickets needed migration');
        return {
          success: true,
          migratedCount: 0
        };
      }
    } catch (error) {
      console.error('❌ Error migrating tickets:', error);
      throw error;
    }
  };

  const value = {
    events,
    loading,
    addEvent,
    updateEvent,
    startEventLive,
    deleteEvent,
    getEventById,
    getEventsByOrganizer,
    getUpcomingEvents,
    getPastEvents,
    getLiveEvents,
    getEventStatus: (event) => computeEventStatus(event),
    getEventLiveStartTime: (event) => getEventStartDateTime(event),
    searchEvents,
    getEventsByCategory,
    getEventsNearUser,
    getEventsByState,
    calculateDistance,
    refreshEvents: loadEvents,
    followOrganizer,
    unfollowOrganizer,
    isFollowingOrganizer,
    getOrganizerStats,
    followedOrganizers,
    organizerFollowers,
    updateEventTicketSales,
    purchaseTickets,
    saveTicketsFromPurchase,
    getUserTickets,
    syncUserTicketsFromSupabase,
    shareTicket,
    claimSharedTicket,
    getTicketsByOrderId,
    getOrderShareCompanions,
    updateTicketStatuses,
    getTicketById,
    scanTicket,
    getEventActivities,
    logActivity,
    registerEventScanner,
    cleanupOrganizerEvents,
    clearAllEvents,
    updateEventsWithOrganizationNames,
    forceUpdateAllEventsWithOrgName,
    cleanupFollowedOrganizers,
    migrateTicketsToGroupedFormat,
    migrateTicketNumbers,
    triggerStatusUpdate,
    clearUserData
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
};

export default EventsContext; 