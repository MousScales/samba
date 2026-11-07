import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { Text, Icon, Button } from '@rneui/themed';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { scanTicketByQrViaSupabase } from '../services/eventsService';

const { width } = Dimensions.get('window');

const TicketScannerScreen = ({ navigation, route }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualTicketNumber, setManualTicketNumber] = useState('');
  const { scanTicket, getUserTickets } = useEvents();
  const { isAuthenticated } = useAuth();
  
  // Get event data from route params
  const { event, eventId } = route.params || {};
  const finalEventId = eventId || event?.id;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }) => {
    try {
      setScanned(true);
      setLoading(true);

      // The scanned data should be a ticket ID or QR code
      // For now, let's assume it's a ticket ID
      const ticketId = data;
      
      // Find the ticket in user's tickets
      const userTickets = await getUserTickets();
      const ticket = Array.isArray(userTickets) ? userTickets.find(t => {
        // Check for legacy single QR code
        if (t.qrCode === data || t.id === ticketId) {
          return true;
        }
        // Check for new grouped tickets with multiple QR codes
        if (t.qrCodes && Array.isArray(t.qrCodes)) {
          return t.qrCodes.includes(data);
        }
        return false;
      }) : null;
      
      if (!ticket && isAuthenticated) {
        try {
          const remote = await scanTicketByQrViaSupabase(data, finalEventId || null);
          if (remote?.success) {
            Alert.alert(
              'Success',
              `Ticket scanned successfully!\n\nTicket Type: ${remote.ticket?.ticketType}\nGuest: ${remote.ticket?.buyerName}`,
              [{ text: 'Scan Another', onPress: () => { setScanned(false); setLoading(false); } }],
            );
            return;
          }
        } catch (remoteError) {
          Alert.alert('Invalid Ticket', remoteError.message || 'This ticket was not found.');
          setScanned(false);
          setLoading(false);
          return;
        }
      }

      if (!ticket) {
        Alert.alert(
          'Invalid Ticket',
          isAuthenticated
            ? 'This ticket was not found.'
            : 'Sign in as an event host to scan tickets at the door.',
        );
        setScanned(false);
        setLoading(false);
        return;
      }
      
      // Check if ticket belongs to this event
      if (finalEventId && ticket.eventId !== finalEventId) {
        Alert.alert('Wrong Event', 'This ticket is not for this event.');
        setScanned(false);
        setLoading(false);
        return;
      }
      
      // Scan the ticket using EventsContext
      const result = await scanTicket(ticket.id, ticket.eventId || finalEventId);
      
      if (result.success) {
        Alert.alert(
          'Success',
          `Ticket scanned successfully!\n\nTicket Type: ${ticket.ticketType}\nEvent: ${ticket.eventTitle}`,
          [{ text: 'Scan Another', onPress: () => { setScanned(false); setLoading(false); } }],
        );
      }
    } catch (error) {
      setScanned(false);
      setLoading(false);
      
      Alert.alert('Error', error.message || 'Failed to scan ticket. Please try again.');
    }
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'on' : 'off');
  };

  const handleManualEntry = async () => {
    if (!manualTicketNumber.trim()) {
      Alert.alert('Error', 'Please enter a ticket number');
      return;
    }

    try {
      setLoading(true);
      
      // Find the ticket in user's tickets
      const userTickets = await getUserTickets();
      const ticket = Array.isArray(userTickets) ? userTickets.find(t => {
        const searchValue = manualTicketNumber.trim();
        
        // Check main ticket ID
        if (t.id === searchValue || t.id.toLowerCase().includes(searchValue.toLowerCase())) {
          return true;
        }
        
        // Check legacy single ticket number
        if (t.ticketNumber === searchValue) {
          return true;
        }
        
        // Check new grouped ticket numbers
        if (t.ticketNumbers && Array.isArray(t.ticketNumbers)) {
          return t.ticketNumbers.some(ticketNum => 
            ticketNum === searchValue || 
            ticketNum.toLowerCase().includes(searchValue.toLowerCase())
          );
        }
        
        return false;
      }) : null;
      
      if (!ticket) {
        Alert.alert('Invalid Ticket', 'This ticket number was not found.');
        setLoading(false);
        return;
      }
      
      // Check if ticket belongs to this event
      if (ticket.eventId !== finalEventId) {
        Alert.alert('Wrong Event', 'This ticket is not for this event.');
        setLoading(false);
        return;
      }
      
      // Scan the ticket using EventsContext
      const result = await scanTicket(ticket.id, finalEventId);
      
      if (result.success) {
        setShowManualEntry(false);
        setManualTicketNumber('');
        setLoading(false);
        
        // Show success message
        Alert.alert(
          'Success',
          `Ticket validated successfully!\n\nTicket Type: ${ticket.ticketType}\nAttendee: ${ticket.buyerName}`,
          [
            {
              text: 'Validate Another',
              onPress: () => {
                setScanned(false);
              }
            }
          ]
        );
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to validate ticket. Please try again.');
        }
  };

  // If no event data provided, show error
  if (!event && !eventId) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No event data provided. Please go back and try again.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
    }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required to scan tickets</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={StyleSheet.absoluteFill}
      />

        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
          onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" type="feather" color="#FFFFFF" size={24} />
          </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {event?.title ? `Scan Tickets - ${event.title}` : 'Scan Tickets'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={() => setShowManualEntry(true)}
          >
            <Icon name="edit" type="feather" color="#FFFFFF" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.flashButton}
            onPress={toggleFlash}
          >
            <Icon
              name={flashMode === 'on' ? "flash" : "flash-off"}
              type="feather"
              color="#FFFFFF"
              size={20}
            />
          </TouchableOpacity>
        </View>
                      </View>
                      
      {!loading ? (
        <CameraView
          style={styles.camera}
          facing="back"
          flash={flashMode}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
          </View>
          <Text style={styles.instructions}>
            Position the QR code within the frame to scan
          </Text>
        </CameraView>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Validating ticket...</Text>
        </View>
      )}

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowManualEntry(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Ticket Number</Text>
              <TouchableOpacity
                onPress={() => setShowManualEntry(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="x" type="feather" color="#666" size={24} />
              </TouchableOpacity>
            </View>
            
          <TextInput
            style={styles.ticketInput}
              placeholder="Enter ticket number or ID"
              placeholderTextColor="#999"
              value={manualTicketNumber}
              onChangeText={setManualTicketNumber}
            autoCapitalize="characters"
              autoCorrect={false}
          />
            
            <View style={styles.modalButtons}>
          <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowManualEntry(false);
                  setManualTicketNumber('');
                }}
          >
                <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.validateButton}
                onPress={handleManualEntry}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.validateButtonText}>Validate</Text>
                )}
              </TouchableOpacity>
          </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 10,
  },
  manualEntryButton: {
    padding: 10,
    marginRight: 5,
  },
  flashButton: {
    padding: 10,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  instructions: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    minWidth: width * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  ticketInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  validateButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TicketScannerScreen; 