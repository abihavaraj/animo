import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    Chip,
    Dialog,
    List,
    Button as PaperButton,
    Card as PaperCard,
    Paragraph,
    Portal,
    Searchbar,
    Title,
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { Colors } from '../../../constants/Colors';
import { instructorClientService } from '../../services/instructorClientService';
import { userService } from '../../services/userService';
import { RootState } from '../../store';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
}

function ClientAssignment() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignDialogVisible, setAssignDialogVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all clients
      const clientsResponse = await instructorClientService.getAllClientsForAssignment();
      if (clientsResponse.success && clientsResponse.data) {
        setClients(clientsResponse.data);
      }

      // Load all instructors
      const instructorsResponse = await userService.getAllInstructors();
      if (instructorsResponse.success && instructorsResponse.data) {
        setInstructors(instructorsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignClient = (client: Client) => {
    setSelectedClient(client);
    setAssignDialogVisible(true);
  };

  const confirmAssignment = async () => {
    if (!selectedClient || !selectedInstructor || !user) {
      return;
    }

    try {
      const response = await instructorClientService.assignClientToInstructor(
        selectedClient.id,
        selectedInstructor.id,
        user.id,
        'primary',
        'Manually assigned by reception'
      );

      if (response.success) {
        Alert.alert(
          'Success', 
          `${selectedClient.name} has been assigned to ${selectedInstructor.name}`
        );
        setAssignDialogVisible(false);
        setSelectedClient(null);
        setSelectedInstructor(null);
      } else {
        Alert.alert('Error', response.error || 'Failed to assign client');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      Alert.alert('Error', 'Failed to assign client');
    }
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Client Assignment</Title>
      <Paragraph style={styles.subtitle}>
        Manually assign clients to instructors (Note: Clients are automatically assigned when they book classes)
      </Paragraph>

      <Searchbar
        placeholder="Search clients..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <ScrollView style={styles.scrollView}>
        {filteredClients.map((client) => (
          <PaperCard key={client.id} style={styles.clientCard}>
            <PaperCard.Content>
              <View style={styles.clientInfo}>
                <View style={styles.clientDetails}>
                  <Title style={styles.clientName}>{client.name}</Title>
                  <Paragraph style={styles.clientEmail}>{client.email}</Paragraph>
                </View>
                <PaperButton
                  mode="contained"
                  onPress={() => handleAssignClient(client)}
                  style={styles.assignButton}
                >
                  Assign
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>
        ))}
      </ScrollView>

      <Portal>
        <Dialog visible={assignDialogVisible} onDismiss={() => setAssignDialogVisible(false)}>
          <Dialog.Title>Assign Client to Instructor</Dialog.Title>
          <Dialog.Content>
            {selectedClient && (
              <Paragraph style={styles.dialogText}>
                Assign {selectedClient.name} to which instructor?
              </Paragraph>
            )}
            
            <View style={styles.instructorList}>
              {instructors.map((instructor) => (
                <List.Item
                  key={instructor.id}
                  title={instructor.name}
                  description={instructor.email}
                  left={() => (
                    <Chip
                      selected={selectedInstructor?.id === instructor.id}
                      onPress={() => setSelectedInstructor(instructor)}
                      style={styles.instructorChip}
                    >
                      {selectedInstructor?.id === instructor.id ? '✓' : ''}
                    </Chip>
                  )}
                  onPress={() => setSelectedInstructor(instructor)}
                  style={[
                    styles.instructorItem,
                    selectedInstructor?.id === instructor.id && styles.selectedInstructor
                  ]}
                />
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setAssignDialogVisible(false)}>
              Cancel
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={confirmAssignment}
              disabled={!selectedInstructor}
            >
              Assign
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.light.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  searchbar: {
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  clientCard: {
    marginBottom: 12,
    elevation: 2,
  },
  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  assignButton: {
    marginLeft: 12,
  },
  dialogText: {
    marginBottom: 16,
  },
  instructorList: {
    maxHeight: 300,
  },
  instructorItem: {
    paddingVertical: 8,
  },
  selectedInstructor: {
    backgroundColor: Colors.light.surfaceVariant,
  },
  instructorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignSelf: 'center',
  },
});

export default ClientAssignment;