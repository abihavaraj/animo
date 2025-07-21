import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { loginUser } from '../store/authSlice';

export const AuthTest: React.FC = () => {
  const [email, setEmail] = useState('admin@pilatesstudio.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  
  const dispatch = useDispatch();
  const { error, isLoggedIn, user } = useSelector((state: RootState) => state.auth);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await dispatch(loginUser({ emailOrPhone: email, password }) as any);
      
      if (loginUser.fulfilled.match(result)) {
        Alert.alert('Success', `Logged in as ${result.payload.user.name} (${result.payload.user.role})`);
      } else {
        Alert.alert('Error', result.payload as string || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Authentication Test</Text>
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Logging in...' : 'Test Login'}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Error: {error}</Text>
        </View>
      )}

      {isLoggedIn && user && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>✅ Logged in successfully!</Text>
          <Text style={styles.userText}>User: {user.name}</Text>
          <Text style={styles.userText}>Role: {user.role}</Text>
          <Text style={styles.userText}>Email: {user.email}</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>📋 Test Accounts:</Text>
        <Text style={styles.infoText}>• admin@pilatesstudio.com</Text>
        <Text style={styles.infoText}>• client@pilatesstudio.com</Text>
        <Text style={styles.infoText}>• instructor@pilatesstudio.com</Text>
        <Text style={styles.infoText}>• reception@pilatesstudio.com</Text>
        <Text style={styles.infoText}>Password: password123</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  form: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  userText: {
    color: '#2e7d32',
    fontSize: 14,
    marginBottom: 5,
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoText: {
    color: '#1565c0',
    fontSize: 14,
    marginBottom: 3,
  },
});

export default AuthTest; 