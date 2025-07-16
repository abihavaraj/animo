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

function MainNavigator() {
  const { user } = useSelector((state: RootState) => state.auth);

  const getNavigatorByRole = () => {
    switch (user?.role) {
      case 'instructor': {
        const InstructorWithErrorBoundary = () => (
          <ErrorBoundary>
            <InstructorNavigator />
          </ErrorBoundary>
        );
        InstructorWithErrorBoundary.displayName = 'InstructorWithErrorBoundary';
        return InstructorWithErrorBoundary;
      }
      case 'admin': {
        const AdminWithErrorBoundary = () => (
          <ErrorBoundary>
            <AdminNavigator />
          </ErrorBoundary>
        );
        AdminWithErrorBoundary.displayName = 'AdminWithErrorBoundary';
        return AdminWithErrorBoundary;
      }
      case 'reception': {
        const ReceptionWithErrorBoundary = () => (
          <ErrorBoundary>
            <ReceptionNavigator />
          </ErrorBoundary>
        );
        ReceptionWithErrorBoundary.displayName = 'ReceptionWithErrorBoundary';
        return ReceptionWithErrorBoundary;
      }
      case 'client':
      default: {
        const ClientWithErrorBoundary = () => (
          <ErrorBoundary>
            <ClientNavigator />
          </ErrorBoundary>
        );
        ClientWithErrorBoundary.displayName = 'ClientWithErrorBoundary';
        return ClientWithErrorBoundary;
      }
    }
  };

  const NavigatorComponent = getNavigatorByRole();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="App" component={NavigatorComponent} />
    </Stack.Navigator>
  );
}

export default MainNavigator; 