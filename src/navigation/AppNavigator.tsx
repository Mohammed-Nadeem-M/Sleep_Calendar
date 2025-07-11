import React from 'react';
import { NavigationContainer, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CalendarScreen from '../screens/CalendarScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import TagDetailsScreen from '../screens/TagDetailsScreen';
import CompareTagsScreen from '../screens/CompareTagsScreen';
import TagStatsScreen from '../screens/TagStatsScreen';
import { useThemeStore } from '../store/themeStore';

enableScreens();

export type StatisticsStackParamList = {
  StatisticsMain: undefined;
  TagDetails: undefined;
  TagStats: { tag?: string };
  CompareTags: { tag1?: string; tag2?: string };
};


const HomeStackNav = createNativeStackNavigator();
const CalendarStackNav = createNativeStackNavigator();
const StatisticsStackNav = createNativeStackNavigator<StatisticsStackParamList>();
const SettingsStackNav = createNativeStackNavigator();

function HomeStack() {
  return (
    <HomeStackNav.Navigator>
      <HomeStackNav.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerTitle: 'Home' }}
      />
    </HomeStackNav.Navigator>
  );
}

function CalendarStack() {
  return (
    <CalendarStackNav.Navigator>
      <CalendarStackNav.Screen
        name="CalendarMain"
        component={CalendarScreen}
        options={{ headerTitle: 'Calendar' }}
      />
    </CalendarStackNav.Navigator>
  );
}

function StatisticsStack() {
  return (
    <StatisticsStackNav.Navigator>
      <StatisticsStackNav.Screen
        name="StatisticsMain"
        component={StatisticsScreen}
        options={{ headerTitle: 'Statistics' }}
      />
      <StatisticsStackNav.Screen
        name="TagDetails"
        component={TagDetailsScreen}
        options={{ headerTitle: 'Tag Details' }}
      />
      <StatisticsStackNav.Screen
        name="TagStats"
        component={TagStatsScreen}
        options={{ headerTitle: 'Tag Stats' }}
      />
      <StatisticsStackNav.Screen
        name="CompareTags"
        component={CompareTagsScreen}
        options={{ headerTitle: 'Compare Tags' }}
      />
    </StatisticsStackNav.Navigator>
  );
}

function SettingsStack() {
  return (
    <SettingsStackNav.Navigator>
      <SettingsStackNav.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ headerTitle: 'Settings' }}
      />
    </SettingsStackNav.Navigator>
  );
}

type RootTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Statistics: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const iconForRoute = (routeName: string): keyof typeof MaterialCommunityIcons.glyphMap => {
  switch (routeName) {
    case 'Home':
      return 'home';
    case 'Calendar':
      return 'calendar-month';
    case 'Statistics':
      return 'chart-bar';
    case 'Settings':
      return 'cog';
    default:
      return 'circle';
  }
};

export default function AppNavigator() {
  const mode = useThemeStore((s) => s.mode);
  const navTheme = mode === 'dark' ? NavDarkTheme : NavDefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name={iconForRoute(route.name)}
                color={color}
                size={size}
              />
            ),
          })}
        >
          <Tab.Screen name="Home" component={HomeStack} />
          <Tab.Screen name="Calendar" component={CalendarStack} />
          <Tab.Screen name="Statistics" component={StatisticsStack} />
          <Tab.Screen name="Settings" component={SettingsStack} />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
