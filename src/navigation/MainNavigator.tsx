import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSelector } from 'react-redux';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { RootState } from '../store';
import AdminNavigator from './AdminNavigator';
import ClientNavigator from './ClientNavigator';
import InstructorNavigator from './InstructorNavigator';
import ReceptionNavigator from './ReceptionNavigator';

const Stack = createStackNavigator();

const screens = {
  instructor: InstructorNavigator,
  admin: AdminNavigator,
  reception: ReceptionNavigator,
  client: ClientNavigator,
};

function MainNavigator() {
  const { user } = useSelector((state: RootState) => state.auth);
  const role = user?.role || 'client';
  const NavigatorComponent = screens[role] || screens.client;

  return (
    <ErrorBoundary>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="App" component={NavigatorComponent} />
      </Stack.Navigator>
    </ErrorBoundary>
  );
}

export default MainNavigator; 