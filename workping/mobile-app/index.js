import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

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
