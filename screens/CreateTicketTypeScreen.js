import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

const CreateTicketTypeScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [ticketTypes, setTicketTypes] = useState([
    {
      type: '',
      price: '',
      quantity: '',
      perks: [''],
      instructions: '',
    }
  ]);

  const addPerk = (ticketIndex) => {
    const newTicketTypes = [...ticketTypes];
    newTicketTypes[ticketIndex].perks.push('');
    setTicketTypes(newTicketTypes);
  };

  const removePerk = (ticketIndex, perkIndex) => {
    const newTicketTypes = [...ticketTypes];
    newTicketTypes[ticketIndex].perks.splice(perkIndex, 1);
    setTicketTypes(newTicketTypes);
  };

  const updatePerk = (ticketIndex, perkIndex, value) => {
    const newTicketTypes = [...ticketTypes];
    newTicketTypes[ticketIndex].perks[perkIndex] = value;
    setTicketTypes(newTicketTypes);
  };

  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      {
        type: '',
        price: '',
        quantity: '',
        perks: [''],
        instructions: '',
      }
    ]);
  };

  const removeTicketType = (index) => {
    const newTicketTypes = [...ticketTypes];
    newTicketTypes.splice(index, 1);
    setTicketTypes(newTicketTypes);
  };

  const updateTicketType = (index, field, value) => {
    const newTicketTypes = [...ticketTypes];
    newTicketTypes[index][field] = value;
    setTicketTypes(newTicketTypes);
  };

  const handleNext = () => {
    // Validate and format ticket types
    const formattedTicketTypes = ticketTypes.map(ticket => ({
      ...ticket,
      price: parseFloat(ticket.price),
      quantity: parseInt(ticket.quantity),
      perks: ticket.perks.filter(perk => perk.trim() !== ''),
    }));

    // Navigate to next screen with ticket types data
    navigation.navigate('CreateEventReview', {
      ...route.params,
      ticketTypes: formattedTicketTypes,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {[1, 2, 3, 4, 5].map((step) => (
              <React.Fragment key={step}>
                {step > 1 && (
                  <View 
                    style={[
                      styles.progressLine,
                      { backgroundColor: step <= 3 ? theme.colors.primary : '#666666' }
                    ]} 
                  />
                )}
                <View 
                  style={[
                    styles.progressDot,
                    { backgroundColor: step <= 3 ? theme.colors.primary : '#666666' }
                  ]}
                >
                  <Text style={styles.progressText}>{step}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <Text style={[styles.title, { color: '#FFFFFF' }]}>Tickets & Capacity</Text>
        <Text style={[styles.subtitle, { color: '#CCCCCC' }]}>
          Set up your ticket types, prices, and specific instructions for each ticket type
        </Text>

        <ScrollView style={styles.content}>
          {ticketTypes.map((ticket, ticketIndex) => (
            <View 
              key={ticketIndex}
              style={[styles.ticketTypeCard, { backgroundColor: theme.colors.surface }]}
            >
              {ticketTypes.length > 1 && (
                <TouchableOpacity
                  style={styles.removeTicketButton}
                  onPress={() => removeTicketType(ticketIndex)}
                >
                  <Icon name="x-circle" type="feather" color={theme.colors.error} size={24} />
                </TouchableOpacity>
              )}

              <TextInput
                style={[styles.input, { color: '#FFFFFF', borderColor: theme.colors.border }]}
                placeholder="Ticket Type (e.g., VIP, General Admission)"
                placeholderTextColor="#999999"
                value={ticket.type}
                onChangeText={(value) => updateTicketType(ticketIndex, 'type', value)}
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <TextInput
                    style={[styles.input, { color: '#FFFFFF', borderColor: theme.colors.border }]}
                    placeholder="Price"
                    placeholderTextColor="#999999"
                    keyboardType="decimal-pad"
                    value={ticket.price}
                    onChangeText={(value) => updateTicketType(ticketIndex, 'price', value)}
                  />
                </View>
                <View style={styles.halfInput}>
                  <TextInput
                    style={[styles.input, { color: '#FFFFFF', borderColor: theme.colors.border }]}
                    placeholder="Quantity"
                    placeholderTextColor="#999999"
                    keyboardType="number-pad"
                    value={ticket.quantity}
                    onChangeText={(value) => updateTicketType(ticketIndex, 'quantity', value)}
                  />
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Perks & Benefits</Text>
              {ticket.perks.map((perk, perkIndex) => (
                <View key={perkIndex} style={styles.perkContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: '#FFFFFF', borderColor: theme.colors.border }]}
                    placeholder="Add a perk (e.g., Priority entrance)"
                    placeholderTextColor="#999999"
                    value={perk}
                    onChangeText={(value) => updatePerk(ticketIndex, perkIndex, value)}
                  />
                  <TouchableOpacity
                    style={styles.perkButton}
                    onPress={() => {
                      if (perkIndex === ticket.perks.length - 1) {
                        addPerk(ticketIndex);
                      } else {
                        removePerk(ticketIndex, perkIndex);
                      }
                    }}
                  >
                    <Icon 
                      name={perkIndex === ticket.perks.length - 1 ? "plus" : "minus"} 
                      type="feather" 
                      color={theme.colors.primary} 
                      size={20} 
                    />
                  </TouchableOpacity>
                </View>
              ))}

              <TextInput
                style={[
                  styles.input, 
                  styles.instructionsInput,
                  { color: '#FFFFFF', borderColor: theme.colors.border }
                ]}
                placeholder="Special Instructions (e.g., dress code, requirements)"
                placeholderTextColor="#999999"
                multiline
                value={ticket.instructions}
                onChangeText={(value) => updateTicketType(ticketIndex, 'instructions', value)}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addTicketButton, { borderColor: theme.colors.primary }]}
            onPress={addTicketType}
          >
            <Icon name="plus" type="feather" color={theme.colors.primary} size={20} />
            <Text style={[styles.addTicketText, { color: theme.colors.primary }]}>
              Add Another Ticket Type
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, { borderColor: theme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" type="feather" color={theme.colors.primary} size={20} />
            <Text style={[styles.footerButtonText, { color: theme.colors.primary }]}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.footerButtonText}>Next</Text>
            <Icon name="arrow-right" type="feather" color="#FFFFFF" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLine: {
    flex: 1,
    height: 2,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  ticketTypeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  removeTicketButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  perkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  perkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  addTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 24,
  },
  addTicketText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CreateTicketTypeScreen; 