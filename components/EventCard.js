import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { Text, Card, Icon, useTheme } from '@rneui/themed';

const EventCard = ({ 
  event, 
  onPress,
  style 
}) => {
  const { theme } = useTheme();
  const spotsRemaining = event.capacity - event.bookedSpots;
  const isLowAvailability = spotsRemaining <= 5 && spotsRemaining > 0;
  const isSoldOut = spotsRemaining === 0;
  
  // Use View instead of TouchableOpacity for sold out events
  const CardWrapper = isSoldOut ? View : TouchableOpacity;
  
  return (
    <CardWrapper 
      onPress={isSoldOut ? undefined : onPress}
      activeOpacity={isSoldOut ? 1 : 0.7}
      style={isSoldOut ? { opacity: 0.6 } : {}}
    >
      <Card 
        containerStyle={[
          styles.card, 
          { 
            backgroundColor: 'transparent',
            borderColor: isSoldOut ? 'rgba(255, 59, 48, 0.3)' : 'transparent',
            padding: 0,
          },
          isSoldOut && { borderWidth: 2 }, // Make border more prominent for sold out events
          style
        ]}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.image}
          />
          
          {/* Gradient overlay */}
          <View style={styles.gradientOverlay} />
          
          {/* Top badges */}
          <View style={styles.topBadges}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>
                {new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {event.category}
              </Text>
            </View>
          </View>
          
          {/* Content overlay */}
          <View style={styles.contentOverlay}>
            <Text style={styles.title} numberOfLines={2}>
              {event.title}
            </Text>
            
            <View style={styles.locationRow}>
              <Icon
                name="map-pin"
                type="feather"
                size={14}
                color="rgba(255,255,255,0.8)"
                style={styles.icon}
              />
              <Text style={styles.location} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
            
            <View style={styles.footerRow}>
              <View style={[
                styles.availabilityContainer,
                isLowAvailability && styles.lowAvailability,
                spotsRemaining === 0 && styles.soldOut
              ]}>
                <Text style={[
                  styles.availabilityText,
                  isLowAvailability && styles.lowAvailabilityText,
                  spotsRemaining === 0 && styles.soldOutText
                ]}>
                  {spotsRemaining === 0 
                    ? 'Sold Out'
                    : `${spotsRemaining} spots left`}
                </Text>
              </View>
              
              <Text style={styles.price}>
                ${event.price}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 0,
    margin: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 220,
  },
  image: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textTransform: 'uppercase',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  location: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  availabilityContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  availabilityText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  lowAvailability: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
  },
  lowAvailabilityText: {
    color: '#FFFFFF',
  },
  soldOut: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  soldOutText: {
    color: '#FFFFFF',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default EventCard; 