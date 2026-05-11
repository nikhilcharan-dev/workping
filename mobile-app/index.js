import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import NetInfo from '@react-native-community/netinfo';

import App from './App';

// Offline attendance sync: configure reachability probe and flush queued
// check-ins whenever the device reconnects to the WorkPing API.
NetInfo.configure({ reachabilityUrl: 'https://api.workping.live/api/v1/health' });
NetInfo.addEventListener(state => {
  if (state.isConnected && state.isInternetReachable) {
    // Global handler registered by the offline queue service (src/services/offlineQueue.js)
    if (typeof global.__WP_FLUSH_OFFLINE_QUEUE__ === 'function') {
      global.__WP_FLUSH_OFFLINE_QUEUE__();
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// Global suppression for Expo internal development errors
const _matchesKeepAwake = (val) => {
  if (!val) return false;
  const str = typeof val === 'string' ? val : val instanceof Error ? val.message : String(val);
  return (
    str.includes('ExpoKeepAwake') ||
    str.includes('The current activity is no longer available') ||
    str.includes('Tried to show an alert while not attached to an Activity')
  );
};

const originalWarn = console.warn;
console.warn = (...args) => {
  if (args.some(_matchesKeepAwake)) return;
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (args.some(_matchesKeepAwake)) return;
  originalError(...args);
};

registerRootComponent(App);
