import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { useSleepStore } from './src/store/sleepStore';
import { useThemeStore } from './src/store/themeStore';

export default function App() {
  useEffect(() => {
    useSleepStore.getState().init();
    useThemeStore.getState().init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
