import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  Platform,
  Image,
  Alert 
} from 'react-native';
import { Text, Icon, Button, useTheme, Divider } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PaymentMethodCard = ({ 
  type, 
  last4, 
  expiry, 
  isDefault, 
  onPress, 
  onDelete, 
  onSetDefault,
  animatedValue 
}) => {
  const { theme } = useTheme();
  
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });
  
  // Get card logo based on type
  const getCardLogo = () => {
    // Use text-based display instead since we don't have actual images
    return null;
  };
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.cardContainer,
          {
            backgroundColor: 'rgba(42, 42, 42, 0.8)',
            borderColor: isDefault ? theme.colors.primary : 'transparent',
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          {getCardLogo() ? (
            <Image source={getCardLogo()} style={styles.cardLogo} resizeMode="contain" />
          ) : (
            <View style={[styles.cardTypeContainer, { backgroundColor: 'rgba(255, 71, 87, 0.15)' }]}>
              <Text style={[styles.cardType, { color: theme.colors.primary }]}>{type}</Text>
            </View>
          )}
          
          <View style={styles.cardActions}>
            {isDefault ? (
              <View style={[styles.defaultBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={onSetDefault}
              >
                <Text style={[styles.actionText, { color: theme.colors.primary }]}>Set Default</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={onDelete}
            >
              <Icon name="trash-2" type="feather" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.cardDetails}>
          <Text style={[styles.cardNumber, { color: theme.colors.text }]}>
            •••• •••• •••• {last4}
          </Text>
          <Text style={[styles.cardExpiry, { color: theme.colors.textSecondary }]}>
            Expires {expiry}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const PaymentMethodsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [paymentMethods, setPaymentMethods] = useState([
    { id: '1', type: 'Visa', last4: '4242', expiry: '05/25', isDefault: true },
    { id: '2', type: 'Mastercard', last4: '5555', expiry: '12/24', isDefault: false },
  ]);
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const handleAddPaymentMethod = () => {
    // Navigate to add payment method screen
    navigation.navigate('AddPaymentMethod');
  };
  
  const handleDeletePaymentMethod = (id) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(paymentMethods.filter(method => method.id !== id));
          },
        },
      ]
    );
  };
  
  const handleSetDefault = (id) => {
    setPaymentMethods(
      paymentMethods.map(method => ({
        ...method,
        isDefault: method.id === id,
      }))
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['rgba(50, 50, 50, 0.4)', 'transparent']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>Payment Methods</Text>
        
        {paymentMethods.length > 0 ? (
          <View style={styles.cardsContainer}>
            {paymentMethods.map((method, index) => (
              <PaymentMethodCard
                key={method.id}
                type={method.type}
                last4={method.last4}
                expiry={method.expiry}
                isDefault={method.isDefault}
                onPress={() => {}}
                onDelete={() => handleDeletePaymentMethod(method.id)}
                onSetDefault={() => handleSetDefault(method.id)}
                animatedValue={animatedValue}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon 
              name="credit-card" 
              type="feather" 
              size={48} 
              color={theme.colors.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No payment methods added yet
            </Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.bottomContainer}>
        <Button
          title="Add Payment Method"
          icon={{
            name: 'plus',
            type: 'feather',
            size: 18,
            color: 'white',
          }}
          buttonStyle={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          containerStyle={styles.addButtonContainer}
          onPress={handleAddPaymentMethod}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  cardsContainer: {
    marginTop: 16,
  },
  cardContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardLogo: {
    width: 50,
    height: 30,
  },
  cardTypeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  cardType: {
    color: 'white',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  defaultText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardExpiry: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  addButton: {
    height: 50,
    borderRadius: 25,
  },
  addButtonContainer: {
    borderRadius: 25,
  },
});

export default PaymentMethodsScreen; 