import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiTest } from '../components/ApiTest';

const ApiTestScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ApiTest />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default ApiTestScreen; 