import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

const IconTest: React.FC = () => {
  return (
    <View style={{ padding: 20, backgroundColor: 'white' }}>
      <Text>Icon Test:</Text>
      <MaterialIcons name="home" size={24} color="black" />
      <MaterialIcons name="person" size={24} color="black" />
      <MaterialIcons name="notifications" size={24} color="black" />
      <MaterialIcons name="card-membership" size={24} color="black" />
      <MaterialIcons name="sentiment-satisfied" size={24} color="black" />
    </View>
  );
};

export default IconTest;
