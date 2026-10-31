import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from '../components/Icon';
import { BottomNav } from '../components/BottomNav';
import type { RootParams } from './types';
import { usePrefs } from '../store/prefs';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { LocationScreen } from '../features/onboarding/Onboarding';
import { LoginGateScreen, LinkMobileScreen } from '../features/auth/LoginGate';
import { WelcomeScreen } from '../features/auth/Welcome';
import { HomeScreen, OffersScreen } from '../features/home/Home';
import { BusSearchScreen } from '../features/bus/BusSearch';
import { BusHomeScreen } from '../features/bus/BusHome';
import { ComingSoonScreen } from '../features/comingsoon/ComingSoon';
import { BusResultsScreen } from '../features/bus/BusResults';
import { SeatLayoutScreen } from '../features/bus/SeatLayout';
import { BoardingDroppingScreen } from '../features/bus/BoardingDropping';
import { BusPassengersScreen } from '../features/bus/BusPassengers';
import { HotelSearchScreen } from '../features/hotel/HotelSearch';
import { HotelListScreen, HotelMapScreen } from '../features/hotel/HotelList';
import { HotelDetailsScreen, RoomsScreen, HotelGuestScreen } from '../features/hotel/HotelDetails';
import { FlightSearchScreen } from '../features/flight/FlightSearch';
import { FlightListScreen } from '../features/flight/FlightList';
import { FareOptionsScreen } from '../features/flight/FareOptions';
import { FlightTravellersScreen, FlightSeatsScreen, FlightAddonsScreen, IntlChecksScreen } from '../features/flight/FlightBooking';
import { TrainSearchScreen, TrainListScreen, IrctcLinkScreen, TrainPassengersScreen, PnrStatusScreen } from '../features/train/Train';
import { CabSearchScreen } from '../features/cab/CabSearch';
import { CabOptionsScreen } from '../features/cab/CabOptions';
import { CabRiderScreen } from '../features/cab/CabRider';
import { CabRideScreen } from '../features/cab/CabRide';
import { CheckoutScreen } from '../features/checkout/Checkout';
import { PaymentStatusScreen } from '../features/checkout/PaymentStatus';
import { MyTripsScreen } from '../features/trips/MyTrips';
import { BookingDetailsScreen } from '../features/trips/BookingDetails';
import { TrackBusScreen, FlightStatusScreen, RateTripScreen, SafetyKitScreen } from '../features/trips/TripTools';
import { CancelSelectScreen, CancelConfirmScreen, RefundTrackerScreen, RefundPayoutScreen } from '../features/cancel/Cancel';
import { AccountScreen, ProfileScreen, TravellersScreen, EmergencyContactsScreen, WalletScreen, HelpScreen, SettingsScreen, ForceUpdateScreen } from '../features/account/Account';
import { ParcelHomeScreen, ParcelPickupScreen, ParcelDropScreen, ParcelVehicleScreen, ParcelGoodsScreen, ParcelReviewScreen } from '../features/parcel/ParcelBooking';
import { ParcelOrderScreen, ParcelOrdersScreen } from '../features/parcel/ParcelOrder';
import { BikeHomeScreen, BikeListScreen, BikeDetailsScreen, BikeKycScreen, BikeReviewScreen, BikeBookedScreen, BikePickupScreen } from '../features/bike/BikeBooking';
import { BikeRideScreen, BikeReturnScreen, BikeClosedScreen, BikeRentalsScreen } from '../features/bike/BikeRide';

const Stack = createNativeStackNavigator<RootParams>();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, IconName> = { Home: 'home', MyTrips: 'ticket', OffersTab: 'tag', HelpTab: 'help', Account: 'user' };

function Tabs() {
  const { c } = useTheme();
  // Floating pill-shaped bar (see components/BottomNav). It handles the phone's bottom inset itself.
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.brand, tabBarInactiveTintColor: c.muted,
        tabBarIcon: ({ color }) => <Icon name={TAB_ICONS[route.name]} color={color} size={22} />,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyTrips" component={MyTripsScreen} options={{ title: 'My Trips' }} />
      <Tab.Screen name="OffersTab" component={OffersScreen} options={{ title: 'Offers' }} />
      <Tab.Screen name="HelpTab" component={HelpScreen} options={{ title: 'Help' }} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator({ forceUpdate }: { forceUpdate: boolean }) {
  const { c } = useTheme();
  const onboarded = usePrefs((s) => s.onboarded);
  const locationAsked = usePrefs((s) => s.locationAsked);
  if (forceUpdate) return <ForceUpdateScreen />;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}
      initialRouteName={!onboarded ? 'Onboarding' : !locationAsked ? 'Location' : 'Main'}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="Location" component={LocationScreen} />
      <Stack.Screen name="Main" component={Tabs} />
      {/* bus + booking for women */}
      <Stack.Screen name="BusHome" component={BusHomeScreen} />
      <Stack.Screen name="BusSearch" component={BusSearchScreen} />
      <Stack.Screen name="BusResults" component={BusResultsScreen} />
      <Stack.Screen name="SeatLayout" component={SeatLayoutScreen} />
      <Stack.Screen name="BoardingDropping" component={BoardingDroppingScreen} />
      <Stack.Screen name="BusPassengers" component={BusPassengersScreen} />
      {/* train / flight / hotel / cab / parcel / bike: coming soon */}
      <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
      {/* hotel */}
      <Stack.Screen name="HotelSearch" component={HotelSearchScreen} />
      <Stack.Screen name="HotelList" component={HotelListScreen} />
      <Stack.Screen name="HotelMap" component={HotelMapScreen} />
      <Stack.Screen name="HotelDetails" component={HotelDetailsScreen} />
      <Stack.Screen name="Rooms" component={RoomsScreen} />
      <Stack.Screen name="HotelGuest" component={HotelGuestScreen} />
      {/* flight */}
      <Stack.Screen name="FlightSearch" component={FlightSearchScreen} />
      <Stack.Screen name="FlightList" component={FlightListScreen} />
      <Stack.Screen name="FareOptions" component={FareOptionsScreen} />
      <Stack.Screen name="FlightTravellers" component={FlightTravellersScreen} />
      <Stack.Screen name="FlightSeats" component={FlightSeatsScreen} />
      <Stack.Screen name="FlightAddons" component={FlightAddonsScreen} />
      <Stack.Screen name="IntlChecks" component={IntlChecksScreen} />
      {/* train */}
      <Stack.Screen name="TrainSearch" component={TrainSearchScreen} />
      <Stack.Screen name="TrainList" component={TrainListScreen} />
      <Stack.Screen name="IrctcLink" component={IrctcLinkScreen} />
      <Stack.Screen name="TrainPassengers" component={TrainPassengersScreen} />
      <Stack.Screen name="PnrStatus" component={PnrStatusScreen} />
      {/* cab */}
      <Stack.Screen name="CabSearch" component={CabSearchScreen} />
      <Stack.Screen name="CabOptions" component={CabOptionsScreen} />
      <Stack.Screen name="CabRider" component={CabRiderScreen} />
      <Stack.Screen name="CabRide" component={CabRideScreen} />
      {/* checkout */}
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="PaymentStatus" component={PaymentStatusScreen} options={{ gestureEnabled: false }} />
      {/* after booking */}
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen name="TrackBus" component={TrackBusScreen} />
      <Stack.Screen name="FlightStatus" component={FlightStatusScreen} />
      <Stack.Screen name="RateTrip" component={RateTripScreen} />
      <Stack.Screen name="SafetyKit" component={SafetyKitScreen} />
      <Stack.Screen name="CancelSelect" component={CancelSelectScreen} />
      <Stack.Screen name="CancelConfirm" component={CancelConfirmScreen} />
      <Stack.Screen name="RefundTracker" component={RefundTrackerScreen} />
      <Stack.Screen name="RefundPayout" component={RefundPayoutScreen} />
      {/* account */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Travellers" component={TravellersScreen} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      {/* login gate (transparent sheet; the screen itself slides it down from the top) */}
      <Stack.Group screenOptions={{ presentation: 'transparentModal', animation: 'fade' }}>
        <Stack.Screen name="LoginGate" component={LoginGateScreen} />
      </Stack.Group>
      <Stack.Screen name="LinkMobile" component={LinkMobileScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="ForceUpdate" component={ForceUpdateScreen} />
      {/* parcel delivery */}
      <Stack.Screen name="ParcelHome" component={ParcelHomeScreen} />
      <Stack.Screen name="ParcelPickup" component={ParcelPickupScreen} />
      <Stack.Screen name="ParcelDrop" component={ParcelDropScreen} />
      <Stack.Screen name="ParcelVehicle" component={ParcelVehicleScreen} />
      <Stack.Screen name="ParcelGoods" component={ParcelGoodsScreen} />
      <Stack.Screen name="ParcelReview" component={ParcelReviewScreen} />
      <Stack.Screen name="ParcelOrder" component={ParcelOrderScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="ParcelOrders" component={ParcelOrdersScreen} />
      {/* bike rental */}
      <Stack.Screen name="BikeHome" component={BikeHomeScreen} />
      <Stack.Screen name="BikeList" component={BikeListScreen} />
      <Stack.Screen name="BikeDetails" component={BikeDetailsScreen} />
      <Stack.Screen name="BikeKyc" component={BikeKycScreen} />
      <Stack.Screen name="BikeReview" component={BikeReviewScreen} />
      <Stack.Screen name="BikeBooked" component={BikeBookedScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="BikePickup" component={BikePickupScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="BikeRide" component={BikeRideScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="BikeReturn" component={BikeReturnScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="BikeClosed" component={BikeClosedScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="BikeRentals" component={BikeRentalsScreen} />
    </Stack.Navigator>
  );
}
