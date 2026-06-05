import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from '@rneui/themed';
import { PaperProvider, configureFonts } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { theme, paperTheme, fonts } from './theme';
import {
  navigationTheme,
  defaultStackScreenOptions,
  modalStackScreenOptions,
  fadeStackScreenOptions,
  tabStackScreenOptions,
} from './config/navigation';
import { AuthProvider } from './context/AuthContext';
import { EventsProvider } from './context/EventsContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import EditEventScreen from './screens/EditEventScreen';
import EventConfirmationScreen from './screens/EventConfirmationScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import EditOrganizationScreen from './screens/EditOrganizationScreen';
import SettingsScreen from './screens/SettingsScreen';
import EventDetailsScreen from './screens/EventDetailsScreen';
import OrganizerProfileScreen from './screens/OrganizerProfileScreen';
import MyTicketsScreen from './screens/MyTicketsScreen';
import TicketDetailsScreen from './screens/TicketDetailsScreen';
import AttendeesScreen from './screens/AttendeesScreen';
import AttendeeProfileScreen from './screens/AttendeeProfileScreen';
import PastEventDetailsScreen from './screens/PastEventDetailsScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import TicketConfirmationScreen from './screens/TicketConfirmationScreen';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen';
import AddPaymentMethodScreen from './screens/AddPaymentMethodScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import VerificationCodeScreen from './screens/VerificationCodeScreen';
import TicketScannerScreen from './screens/TicketScannerScreen';
import BecomeProviderScreen from './screens/BecomeProviderScreen';
import ProviderDashboardScreen from './screens/ProviderDashboardScreen';
import ManageEventsScreen from './screens/ManageEventsScreen';
import DashboardScreen from './screens/DashboardScreen';
import EventStats from './screens/EventStats';
import LiveEventStats from './screens/LiveEventStats';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

const AuthGate = ({ children }) => {
  const { isLoading, isAuthenticated } = useAuth();
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    if (isLoading || !navReady || !navigationRef.isReady()) return;

    const route = isAuthenticated ? 'Profile' : 'Login';
    const current = navigationRef.getCurrentRoute()?.name;
    if (current === route) return;

    navigationRef.reset({
      index: 0,
      routes: [{ name: route }],
    });
  }, [isLoading, isAuthenticated, navReady]);

  if (isLoading) {
    return (
      <View style={authGateStyles.loading}>
        <ActivityIndicator size="large" color="#E0E0E0" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={() => setNavReady(true)}
    >
      {children}
    </NavigationContainer>
  );
};

const authGateStyles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
});

const AppNavigator = () => {
  const { t } = useLanguage();

  return (
    <AuthGate>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={defaultStackScreenOptions}
      >
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen 
                    name="VerificationCode" 
                    component={VerificationCodeScreen}
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen 
                    name="TicketScanner" 
                    component={TicketScannerScreen}
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen name="Home" component={HomeScreen} options={tabStackScreenOptions} />
                  <Stack.Screen name="Explore" component={ExploreScreen} options={tabStackScreenOptions} />
                  <Stack.Screen name="Create" component={CreateEventScreen} options={tabStackScreenOptions} />
                  <Stack.Screen name="ManageEvents" component={ManageEventsScreen} options={tabStackScreenOptions} />
                  <Stack.Screen name="Dashboard" component={DashboardScreen} options={tabStackScreenOptions} />
                  <Stack.Screen name="Profile" component={ProfileScreen} options={tabStackScreenOptions} />
                  <Stack.Screen 
                    name="EventStats" 
                    component={EventStats}
                    options={{
                      headerShown: false,
                      presentation: 'card',
                    }}
                  />
                  <Stack.Screen 
                    name="LiveEventStats" 
                    component={LiveEventStats}
                    options={{
                      headerShown: false,
                      presentation: 'card',
                    }}
                  />
                  <Stack.Screen
                    name="EditEvent"
                    component={EditEventScreen}
                    options={defaultStackScreenOptions}
                  />
                  <Stack.Screen
                    name="EventConfirmation"
                    component={EventConfirmationScreen}
                    options={fadeStackScreenOptions}
                  />
                  <Stack.Screen
                    name="My Tickets"
                    component={MyTicketsScreen}
                    options={{ headerTitle: t('screens.myTickets') }}
                  />
                  <Stack.Screen 
                    name="EventDetails" 
                    component={EventDetailsScreen}
                    options={{
                      headerShown: true,
                      headerTransparent: true,
                      headerTitle: '',
                      headerBackVisible: true,
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen 
                    name="TicketDetails" 
                    component={TicketDetailsScreen}
                    options={{
                      headerShown: true,
                      headerTransparent: true,
                      headerTitle: '',
                      headerBackVisible: true,
                      headerTintColor: '#FFFFFF',
                      headerStyle: {
                        backgroundColor: 'transparent',
                      },
                      headerShadowVisible: false,
                    }}
                  />
                  <Stack.Screen 
                    name="Attendees" 
                    component={AttendeesScreen}
                    options={{
                      headerShown: true,
                      headerTitle: t('screens.attendees'),
                      headerStyle: {
                        backgroundColor: theme.colors.surface,
                      },
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen 
                    name="AttendeeProfile" 
                    component={AttendeeProfileScreen}
                    options={{
                      headerShown: true,
                      headerTitle: t('screens.attendeeProfile'),
                      headerStyle: {
                        backgroundColor: theme.colors.surface,
                      },
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen 
                    name="OrganizerProfile" 
                    component={OrganizerProfileScreen}
                    options={{
                      headerShown: true,
                      headerTitle: t('screens.organizerProfile'),
                      headerStyle: {
                        backgroundColor: theme.colors.surface,
                      },
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen
                    name="EditProfile"
                    component={EditProfileScreen}
                    options={modalStackScreenOptions}
                  />
                  <Stack.Screen
                    name="EditOrganization"
                    component={EditOrganizationScreen}
                    options={modalStackScreenOptions}
                  />
                  <Stack.Screen 
                    name="Settings" 
                    component={SettingsScreen}
                    options={{
                      headerShown: true,
                      headerTitle: t('settings.title'),
                      headerStyle: {
                        backgroundColor: theme.colors.surface,
                      },
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen 
                    name="PaymentMethods" 
                    component={PaymentMethodsScreen}
                    options={{
                      headerShown: true,
                      headerTitle: t('screens.paymentMethods'),
                      headerStyle: {
                        backgroundColor: theme.colors.surface,
                      },
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen 
                    name="AddPaymentMethod" 
                    component={AddPaymentMethodScreen}
                    options={{
                      headerShown: true,
                      headerTitle: t('screens.addPaymentMethod'),
                      headerStyle: {
                        backgroundColor: theme.colors.surface,
                      },
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen 
                    name="Checkout" 
                    component={CheckoutScreen}
                    options={{
                      headerShown: true,
                      headerTitle: t('screens.checkout'),
                      headerStyle: {
                        backgroundColor: theme.colors.surface,
                      },
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen
                    name="TicketConfirmation"
                    component={TicketConfirmationScreen}
                    options={fadeStackScreenOptions}
                  />
                  <Stack.Screen 
                    name="PastEventDetails" 
                    component={PastEventDetailsScreen}
                    options={{
                      headerShown: true,
                      headerTransparent: true,
                      headerTitle: '',
                      headerBackVisible: true,
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen
                    name="Register"
                    component={RegisterScreen}
                    options={modalStackScreenOptions}
                  />
                  <Stack.Screen
                    name="BecomeProvider"
                    component={BecomeProviderScreen}
                    options={modalStackScreenOptions}
                  />
                  <Stack.Screen 
                    name="ProviderDashboard" 
                    component={ProviderDashboardScreen}
                    options={{
                      headerShown: false,
                    }}
                  />
      </Stack.Navigator>
    </AuthGate>
  );
};

const App = () => {
  const fontConfig = {
    ...configureFonts({ config: fonts }),
  };

  return (
    <LanguageProvider>
      <AuthProvider>
        <EventsProvider>
          <ThemeProvider theme={theme}>
            <PaperProvider
              theme={{
                ...paperTheme,
                fonts: fontConfig,
              }}
            >
              <StatusBar style="light" />
              <SafeAreaProvider>
                <AppNavigator />
              </SafeAreaProvider>
            </PaperProvider>
          </ThemeProvider>
        </EventsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
