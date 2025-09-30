// Mock react-native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles) => styles,
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
}));

// Mock expo modules
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 22.3193, longitude: 114.1694 }
  })),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([{
    street: 'Test Street',
    district: 'Test District',
    city: 'Hong Kong'
  }])),
  Accuracy: { High: 'high' },
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'test-token' })),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 'max' },
}));

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
  PROVIDER_GOOGLE: 'google',
}));