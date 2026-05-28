import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@rneui/themed';
import { PaperProvider, configureFonts } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { theme, paperTheme, fonts } from './theme';
import { AuthProvider } from './context/AuthContext';
import { EventsProvider } from './context/EventsContext';

import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import CreateEventScreen from './screens/CreateEventScreen';
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

const App = () => {
  const fontConfig = {
    ...configureFonts({ config: fonts }),
  };

  return (
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
              <NavigationContainer theme={theme}>
                <Stack.Navigator 
                  initialRouteName="Login"
                  screenOptions={{ 
                    headerShown: false,
                    presentation: 'card',
                    animationEnabled: false,
                    animation: 'none',
                    contentStyle: {
                      backgroundColor: theme.colors.background
                    },
                    headerBackTitle: '',
                    transitionSpec: {
                      open: { animation: 'timing', config: { duration: 0 } },
                      close: { animation: 'timing', config: { duration: 0 } },
                    },
                    cardStyleInterpolator: () => ({
                      cardStyle: { opacity: 1 }
                    }),
                  }}
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
                  <Stack.Screen name="Home" component={HomeScreen} />
                  <Stack.Screen name="Explore" component={ExploreScreen} />
                  <Stack.Screen name="Create" component={CreateEventScreen} />
                  <Stack.Screen name="ManageEvents" component={ManageEventsScreen} />
                  <Stack.Screen name="Dashboard" component={DashboardScreen} />
                  <Stack.Screen 
                    name="Profile" 
                    component={ProfileScreen}
                    options={{
                      headerShown: false,
                      presentation: 'card',
                      animationEnabled: true,
                    }}
                  />
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
                    name="EventConfirmation" 
                    component={EventConfirmationScreen}
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen name="My Tickets" component={MyTicketsScreen} />
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
                      headerTitle: "Who's Going",
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
                      headerTitle: 'Profile',
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
                      headerTitle: 'Organizer Profile',
                      headerStyle: {
                        backgroundColor: theme.colors.surface,
                      },
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen 
                    name="EditProfile" 
                    component={EditProfileScreen}
                    options={{
                      headerShown: false,
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen 
                    name="EditOrganization" 
                    component={EditOrganizationScreen}
                    options={{
                      headerShown: false,
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen 
                    name="Settings" 
                    component={SettingsScreen}
                    options={{
                      headerShown: true,
                      headerTitle: 'Settings',
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
                      headerTitle: 'Payment Methods',
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
                      headerTitle: 'Add Payment Method',
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
                      headerTitle: 'Checkout',
                      headerStyle: {
                        backgroundColor: theme.colors.surface,
                      },
                      headerTintColor: theme.colors.text,
                    }}
                  />
                  <Stack.Screen 
                    name="TicketConfirmation" 
                    component={TicketConfirmationScreen}
                    options={{
                      headerShown: false,
                    }}
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
                    options={{
                      headerShown: false,
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen 
                    name="BecomeProvider" 
                    component={BecomeProviderScreen}
                    options={{
                      headerShown: false,
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen 
                    name="ProviderDashboard" 
                    component={ProviderDashboardScreen}
                    options={{
                      headerShown: false,
                    }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
          </PaperProvider>
        </ThemeProvider>
      </EventsProvider>
    </AuthProvider>
  );
};

export default App;
