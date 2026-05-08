import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

// Suppress internal Expo/KeepAwake development warnings
LogBox.ignoreLogs([
  "Error: Call to function 'ExpoKeepAwake.activate' has been rejected",
  "The current activity is no longer available"
]);

import { ThemeProvider } from '@/theme';
import { AuthProvider } from '@/context/useAuthContext';
import { LayoutProvider, useLayoutContext } from '@/context/useLayoutContext';
import { NotificationProvider } from '@/context/useNotificationContext';
import { PushNotificationProvider } from '@/context/usePushNotificationContext';
import { ChatProvider } from '@/context/useChatContext';
import { EmailProvider } from '@/context/useEmailContext';
import RootNavigator from '@/navigation';
const ApiLogViewer = __DEV__ ? require('@/components/ApiLogViewer').default : null;

const AppContent = () => {
  const { themeMode } = useLayoutContext();

  return (
    <ThemeProvider themeMode={themeMode}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <NotificationProvider>
        <PushNotificationProvider>
          <ChatProvider>
            <EmailProvider>
              <View style={{ flex: 1 }}>
                <RootNavigator />
                {__DEV__ && ApiLogViewer ? <ApiLogViewer /> : null}
                <Toast />
              </View>
            </EmailProvider>
          </ChatProvider>
        </PushNotificationProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LayoutProvider>
            <AppContent />
          </LayoutProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
