import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const EventsContext = createContext();

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

  const loadEvents = async () => {
    try {
      setLoading(true);
      const storedEvents = await AsyncStorage.getItem('events');
      if (storedEvents) {
        const parsedEvents = JSON.parse(storedEvents);
        
        // Convert date strings back to Date objects
        const eventsWithDates = parsedEvents.map(event => ({
          ...event,
          date: new Date(event.date),
          startTime: new Date(event.startTime),
          endTime: event.endTime ? new Date(event.endTime) : null,
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt)
        }));
        
        console.log('📅 Loaded events from storage:', eventsWithDates.length, 'events');
        
        // Debug ticket availability for each event
        eventsWithDates.forEach(event => {
          if (event.tickets && event.tickets.length > 0) {
            console.log(`🎪 Event "${event.title}" ticket availability:`, event.tickets.map(t => ({
              name: t.name,
              quantity: t.quantity,
              availableQuantity: t.availableQuantity,
              sold: t.sold,
              isUnlimited: t.isUnlimited
            })));
          }
        });
        
        setEvents(eventsWithDates);
      } else {
        // No stored events found, initialize empty array
        setEvents([]);
        console.log('📅 No stored events found, starting with empty array');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
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

  const addEvent = async (eventData) => {
    try {
      const newEvent = {
        ...eventData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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
      return newEvent;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  const updateEvent = async (eventId, updatedData) => {
    try {
      const updatedEvents = events.map(event => {
        if (event.id === eventId) {
          // Convert any date strings to Date objects
          const processedData = {
            ...updatedData,
            endTime: updatedData.endTime ? new Date(updatedData.endTime) : null,
            updatedAt: new Date()
          };
          return { ...event, ...processedData };
        }
        return event;
      });
      
      setEvents(updatedEvents);
      await saveEvents(updatedEvents);
      
      return updatedEvents.find(event => event.id === eventId);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  };

  const deleteEvent = async (eventId) => {
    try {
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
    // Filter events by status - rely on the automatic status update for accuracy
    return events.filter(event => {
      return event.status === 'upcoming';
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getPastEvents = () => {
    // Filter events by status - rely on the automatic status update for accuracy
    return events.filter(event => {
      return event.status === 'completed';
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
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
        color: '#FFD700',
        purchaserName: userInfo.name,
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

  const getUserTickets = async (filterType = 'all') => {
    const now = new Date();
    
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
        ticketType: ticket.ticketType
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
    return events.filter(event => {
      // Skip if event doesn't have required time fields
      if (!event.date || !event.startTime) {
        return false;
      }

      const eventDateTime = new Date(event.date);
      
      // Handle both Date objects and time strings
      if (event.startTime instanceof Date) {
        eventDateTime.setHours(
          event.startTime.getHours(),
          event.startTime.getMinutes(),
          event.startTime.getSeconds()
        );
      } else {
        // Handle time strings like "10:20 AM"
        const timeStr = event.startTime.toString();
        const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1], 10);
          const minutes = parseInt(timeParts[2], 10);
          const period = timeParts[3].toUpperCase();
          
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          eventDateTime.setHours(hours, minutes, 0);
        }
      }
      
      // If event has end time, check if current time is between start and end
      if (event.endTime) {
        const eventEndDateTime = new Date(event.date);
        
        if (event.endTime instanceof Date) {
          eventEndDateTime.setHours(
            event.endTime.getHours(),
            event.endTime.getMinutes(),
            event.endTime.getSeconds()
          );
        } else {
          // Handle time strings
          const endTimeStr = event.endTime.toString();
          const endTimeParts = endTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (endTimeParts) {
            let endHours = parseInt(endTimeParts[1], 10);
            const endMinutes = parseInt(endTimeParts[2], 10);
            const endPeriod = endTimeParts[3].toUpperCase();
            
            if (endPeriod === 'PM' && endHours !== 12) {
              endHours += 12;
            } else if (endPeriod === 'AM' && endHours === 12) {
              endHours = 0;
            }
            
            eventEndDateTime.setHours(endHours, endMinutes, 0);
          }
        }
        
        return now >= eventDateTime && now <= eventEndDateTime;
      }
      
      // If no end time, event is considered live for 4 hours after start time
      const eventEndDateTime = new Date(eventDateTime.getTime() + (4 * 60 * 60 * 1000));
      return now >= eventDateTime && now <= eventEndDateTime;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  // Event status update function
  const updateEventStatuses = () => {
      const now = new Date();
      let hasChanges = false;
      
      const updatedEvents = events.map(event => {
        // Skip if event doesn't have required time fields
        if (!event.date || !event.startTime) {
          return event;
        }

        const eventDateTime = new Date(event.date);
        // Handle both Date objects and time strings
        if (event.startTime instanceof Date) {
          eventDateTime.setHours(
            event.startTime.getHours(),
            event.startTime.getMinutes(),
            event.startTime.getSeconds()
          );
        } else {
          // Handle time strings like "10:20 AM"
          const timeStr = event.startTime.toString();
          const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeParts) {
            let hours = parseInt(timeParts[1], 10);
            const minutes = parseInt(timeParts[2], 10);
            const period = timeParts[3].toUpperCase();
            
            if (period === 'PM' && hours !== 12) {
              hours += 12;
            } else if (period === 'AM' && hours === 12) {
              hours = 0;
            }
            
            eventDateTime.setHours(hours, minutes, 0);
          }
        }

        let newStatus = event.status;
        
        // If event has end time, use it to determine status
        if (event.endTime) {
          const eventEndDateTime = new Date(event.date);
          
          if (event.endTime instanceof Date) {
            eventEndDateTime.setHours(
              event.endTime.getHours(),
              event.endTime.getMinutes(),
              event.endTime.getSeconds()
            );
          } else {
            // Handle time strings
            const endTimeStr = event.endTime.toString();
            const endTimeParts = endTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (endTimeParts) {
              let endHours = parseInt(endTimeParts[1], 10);
              const endMinutes = parseInt(endTimeParts[2], 10);
              const endPeriod = endTimeParts[3].toUpperCase();
              
              if (endPeriod === 'PM' && endHours !== 12) {
                endHours += 12;
              } else if (endPeriod === 'AM' && endHours === 12) {
                endHours = 0;
              }
              
              eventEndDateTime.setHours(endHours, endMinutes, 0);
            }
          }
          
          if (now < eventDateTime) {
            newStatus = 'upcoming';
          } else if (now >= eventDateTime && now <= eventEndDateTime) {
            newStatus = 'live';
          } else {
            newStatus = 'completed';
          }
        } else {
          // If no end time, use 4-hour window
          const eventEndDateTime = new Date(eventDateTime.getTime() + (4 * 60 * 60 * 1000));
          
          if (now < eventDateTime) {
            newStatus = 'upcoming';
          } else if (now >= eventDateTime && now <= eventEndDateTime) {
            newStatus = 'live';
          } else {
            newStatus = 'completed';
          }
        }

        // Only update if status has changed
        if (newStatus !== event.status) {
          console.log(`🔄 Event status updated: "${event.title}" from "${event.status}" to "${newStatus}"`);
          hasChanges = true;
          return { ...event, status: newStatus, updatedAt: new Date() };
        }
        return event;
      });

      // Only save if there are actual changes
      if (hasChanges) {
        console.log('📱 Saving updated event statuses...');
        setEvents(updatedEvents);
        saveEvents(updatedEvents);
      }
    };

  // Function to manually trigger status update
  const triggerStatusUpdate = () => {
    updateEventStatuses();
  };

  // Trigger status update when events are first loaded or changed
  useEffect(() => {
    if (events.length > 0) {
      // Small delay to ensure events are properly set before status update
      const timeoutId = setTimeout(() => {
        updateEventStatuses();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [events.length]);

  // Add automatic status update functionality
  useEffect(() => {
    // Update statuses immediately and then every 10 seconds for maximum responsiveness
    updateEventStatuses();
    const intervalId = setInterval(updateEventStatuses, 10000);

    return () => clearInterval(intervalId);
  }, [events]);

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
                profilePicture: event.organizer?.profilePicture || userProviderInfo.partyLogo,
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
    deleteEvent,
    getEventById,
    getEventsByOrganizer,
    getUpcomingEvents,
    getPastEvents,
    getLiveEvents,
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
    getUserTickets,
    updateTicketStatuses,
    getTicketById,
    scanTicket,
    getEventActivities,
    logActivity,
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