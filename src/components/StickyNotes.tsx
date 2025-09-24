import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import stickyNotesService, { StickyNote as DBStickyNote } from '../services/stickyNotesService';

export interface StickyNote {
  id: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface StickyNotesProps {
  userId: string; // To store notes per user
}

const STICKY_NOTE_COLORS = [
  '#FFE066', // Yellow
  '#FFB3BA', // Pink
  '#BAFFC9', // Light Green
  '#BAE1FF', // Light Blue
  '#FFFFBA', // Cream
  '#FFDFBA', // Peach
  '#E6E6FA', // Lavender
  '#D3D3D3', // Light Gray
];

export default function StickyNotes({ userId }: StickyNotesProps) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [deletedNotes, setDeletedNotes] = useState<StickyNote[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(STICKY_NOTE_COLORS[0]);

  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

  useEffect(() => {
    loadNotes();
  }, [userId]);

  const loadNotes = async () => {
    try {
      // Load active notes
      const notesResponse = await stickyNotesService.getStickyNotes();
      if (notesResponse.success && notesResponse.data) {
        const formattedNotes = notesResponse.data.map((note: DBStickyNote) => ({
          id: note.id || '',
          content: note.content,
          color: note.color,
          position_x: note.position_x,
          position_y: note.position_y,
          width: note.width,
          height: note.height,
          created_at: note.created_at,
          updated_at: note.updated_at,
          deleted_at: note.deleted_at
        }));
        setNotes(formattedNotes);
      }

      // Load deleted notes
      const deletedResponse = await stickyNotesService.getDeletedStickyNotes();
      if (deletedResponse.success && deletedResponse.data) {
        const formattedDeletedNotes = deletedResponse.data.map((note: DBStickyNote) => ({
          id: note.id || '',
          content: note.content,
          color: note.color,
          position_x: note.position_x,
          position_y: note.position_y,
          width: note.width,
          height: note.height,
          created_at: note.created_at,
          updated_at: note.updated_at,
          deleted_at: note.deleted_at
        }));
        setDeletedNotes(formattedDeletedNotes);
      }
    } catch (error) {
      console.error('Error loading sticky notes:', error);
      Alert.alert('Error', 'Failed to load sticky notes');
    }
  };

  const addNote = async () => {
    if (!newNoteContent.trim()) {
      Alert.alert('Error', 'Please enter some content for your note');
      return;
    }

    try {
      const response = await stickyNotesService.createStickyNote({
        content: newNoteContent.trim(),
        color: selectedColor,
        position_x: 100 + (notes.length * 20), // Stagger position
        position_y: 100 + (notes.length * 20),
        width: 250,
        height: 200
      });

      if (response.success && response.data) {
        const newNote: StickyNote = {
          id: response.data.id || '',
          content: response.data.content,
          color: response.data.color,
          position_x: response.data.position_x,
          position_y: response.data.position_y,
          width: response.data.width,
          height: response.data.height,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at,
          deleted_at: response.data.deleted_at
        };

        setNotes([...notes, newNote]);
        setNewNoteContent('');
        setSelectedColor(STICKY_NOTE_COLORS[0]);
        setShowAddModal(false);
      } else {
        Alert.alert('Error', response.error || 'Failed to create note');
      }
    } catch (error) {
      console.error('Error creating note:', error);
      Alert.alert('Error', 'Failed to create note');
    }
  };

  const editNote = (note: StickyNote) => {
    setEditingNote(note);
    setNewNoteContent(note.content);
    setSelectedColor(note.color);
    setShowAddModal(true);
  };

  const updateNote = async () => {
    if (!newNoteContent.trim() || !editingNote) {
      Alert.alert('Error', 'Please enter some content for your note');
      return;
    }

    try {
      const response = await stickyNotesService.updateStickyNote(editingNote.id, {
        content: newNoteContent.trim(),
        color: selectedColor
      });

      if (response.success && response.data) {
        const updatedNotes = notes.map(note =>
          note.id === editingNote.id
            ? {
                ...note,
                content: response.data.content,
                color: response.data.color,
                updated_at: response.data.updated_at,
              }
            : note
        );

        setNotes(updatedNotes);
        setNewNoteContent('');
        setEditingNote(null);
        setShowAddModal(false);
        setSelectedColor(STICKY_NOTE_COLORS[0]);
      } else {
        Alert.alert('Error', response.error || 'Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Error', 'Failed to update note');
    }
  };

  const deleteNote = async (noteId: string) => {
    const confirmed = confirm('Are you sure you want to delete this note? You can recover it from recently deleted.');
    
    if (confirmed) {
      try {
        const response = await stickyNotesService.deleteStickyNote(noteId);
        
        if (response.success) {
          // Move note to deleted state locally
          const noteToDelete = notes.find(note => note.id === noteId);
          if (noteToDelete) {
            const deletedNote = { ...noteToDelete, deleted_at: new Date().toISOString() };
            setDeletedNotes([deletedNote, ...deletedNotes]);
            
            // Remove from active notes
            setNotes(notes.filter(note => note.id !== noteId));
            console.log('✅ Note deleted successfully:', noteId);
          }
        } else {
          Alert.alert('Error', response.error || 'Failed to delete note');
        }
      } catch (error) {
        console.error('Error deleting note:', error);
        Alert.alert('Error', 'Failed to delete note');
      }
    }
  };

  const recoverNote = async (noteId: string) => {
    try {
      const response = await stickyNotesService.restoreStickyNote(noteId);
      
      if (response.success && response.data) {
        // Add back to active notes
        const recoveredNote: StickyNote = {
          id: response.data.id || '',
          content: response.data.content,
          color: response.data.color,
          position_x: response.data.position_x,
          position_y: response.data.position_y,
          width: response.data.width,
          height: response.data.height,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at,
          deleted_at: response.data.deleted_at
        };
        
        setNotes([...notes, recoveredNote]);
        
        // Remove from deleted notes
        setDeletedNotes(deletedNotes.filter(note => note.id !== noteId));
        console.log('✅ Note recovered successfully:', noteId);
      } else {
        Alert.alert('Error', response.error || 'Failed to recover note');
      }
    } catch (error) {
      console.error('Error recovering note:', error);
      Alert.alert('Error', 'Failed to recover note');
    }
  };

  const permanentlyDeleteNote = async (noteId: string) => {
    const confirmed = confirm('This will permanently delete the note. This action cannot be undone. Are you sure?');
    
    if (confirmed) {
      try {
        const response = await stickyNotesService.permanentlyDeleteStickyNote(noteId);
        
        if (response.success) {
          setDeletedNotes(deletedNotes.filter(note => note.id !== noteId));
          console.log('✅ Note permanently deleted:', noteId);
        } else {
          Alert.alert('Error', response.error || 'Failed to permanently delete note');
        }
      } catch (error) {
        console.error('Error permanently deleting note:', error);
        Alert.alert('Error', 'Failed to permanently delete note');
      }
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setShowDeletedModal(false);
    setEditingNote(null);
    setNewNoteContent('');
    setSelectedColor(STICKY_NOTE_COLORS[0]);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="note" size={24} color="#FFD700" />
          <Text style={[styles.headerTitle, { color: textColor }]}>Sticky Notes</Text>
          <View style={[styles.noteCount, { backgroundColor: '#FFD700' }]}>
            <Text style={styles.noteCountText}>{notes.length}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {deletedNotes.length > 0 && (
            <TouchableOpacity
              style={[styles.recentlyDeletedButton, { backgroundColor: '#FF9800' }]}
              onPress={() => setShowDeletedModal(true)}
            >
              <MaterialIcons name="restore" size={20} color="#333" />
              <Text style={styles.recentlyDeletedButtonText}>
                Recently Deleted ({deletedNotes.length})
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#FFD700' }]}
            onPress={() => setShowAddModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#333" />
            <Text style={styles.addButtonText}>Add Note</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes Grid */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={styles.notesScrollView}
        contentContainerStyle={styles.notesContainer}
        scrollIndicatorInsets={{ right: 1 }}
      >
        {notes.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: surfaceColor }]}>
            <MaterialIcons name="note-add" size={48} color="#ccc" />
            <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
              No sticky notes yet
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: textSecondaryColor }]}>
              Add your first note to get started!
            </Text>
          </View>
        ) : (
          notes.map((note) => (
            <View
              key={note.id}
              style={[styles.stickyNote, { backgroundColor: note.color }]}
            >
              {/* Note Content */}
              <View style={styles.noteContent}>
                <Text style={styles.noteText} numberOfLines={8}>
                  {note.content}
                </Text>
              </View>

              {/* Note Footer */}
              <View style={styles.noteFooter}>
                <Text style={styles.noteDate}>
                  {formatDate(note.updated_at)}
                </Text>
                <View style={styles.noteActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => editNote(note)}
                  >
                    <MaterialIcons name="edit" size={16} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteNote(note.id)}
                  >
                    <MaterialIcons name="delete" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sticky Note Shadow Effect */}
              <View style={styles.noteShadow} />
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Note Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {editingNote ? 'Edit Note' : 'Add New Note'}
              </Text>
              <TouchableOpacity onPress={handleModalClose}>
                <MaterialIcons name="close" size={24} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Color Selection */}
              <Text style={[styles.colorLabel, { color: textColor }]}>Choose Color:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorSelector}>
                {STICKY_NOTE_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColor,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <MaterialIcons name="check" size={16} color="#333" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Note Content */}
              <Text style={[styles.contentLabel, { color: textColor }]}>Note Content:</Text>
              <TextInput
                style={[styles.contentInput, { backgroundColor: backgroundColor, color: textColor }]}
                value={newNoteContent}
                onChangeText={setNewNoteContent}
                placeholder="Write your note here..."
                placeholderTextColor={textSecondaryColor}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: '#f5f5f5' }]}
                onPress={handleModalClose}
              >
                <Text style={[styles.cancelButtonText, { color: textSecondaryColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#FFD700' }]}
                onPress={editingNote ? updateNote : addNote}
              >
                <Text style={styles.saveButtonText}>
                  {editingNote ? 'Update Note' : 'Add Note'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recently Deleted Modal */}
      <Modal
        visible={showDeletedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeletedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Recently Deleted Notes
              </Text>
              <TouchableOpacity onPress={() => setShowDeletedModal(false)}>
                <MaterialIcons name="close" size={24} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.deletedNotesList}>
              {deletedNotes.length === 0 ? (
                <Text style={[styles.noDeletedNotesText, { color: textSecondaryColor }]}>
                  No recently deleted notes
                </Text>
              ) : (
                deletedNotes.map((note) => (
                  <View key={note.id} style={[styles.deletedNoteItem, { backgroundColor: note.color }]}>
                    <View style={styles.deletedNoteContent}>
                      <Text style={styles.deletedNoteText} numberOfLines={3}>
                        {note.content}
                      </Text>
                      <Text style={styles.deletedNoteDate}>
                        Deleted: {formatDate(note.deleted_at)}
                      </Text>
                    </View>
                    <View style={styles.deletedNoteActions}>
                      <TouchableOpacity
                        style={[styles.recoverButton, { backgroundColor: '#4CAF50' }]}
                        onPress={() => recoverNote(note.id)}
                      >
                        <MaterialIcons name="restore" size={16} color="white" />
                        <Text style={styles.recoverButtonText}>Recover</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.permanentDeleteButton, { backgroundColor: '#F44336' }]}
                        onPress={() => permanentlyDeleteNote(note.id)}
                      >
                        <MaterialIcons name="delete-forever" size={16} color="white" />
                        <Text style={styles.permanentDeleteButtonText}>Delete Forever</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  noteCount: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  noteCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  recentlyDeletedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recentlyDeletedButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  notesScrollView: {
    maxHeight: 180,
    paddingVertical: 4,
  },
  notesContainer: {
    paddingHorizontal: 8,
    paddingRight: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  emptyState: {
    width: 200,
    height: 150,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    flexShrink: 0, // Prevent shrinking in horizontal scroll
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  stickyNote: {
    width: 160,
    height: 150,
    borderRadius: 8,
    padding: 12,
    position: 'relative',
    flexShrink: 0, // Prevent shrinking in horizontal scroll
    // Sticky note effect
    transform: [{ rotate: '1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  noteContent: {
    flex: 1,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#333',
    fontWeight: '500',
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  noteShadow: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    zIndex: -1,
    transform: [{ rotate: '1deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    marginBottom: 20,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorSelector: {
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
  },
  contentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deletedNotesList: {
    maxHeight: 400,
  },
  noDeletedNotesText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  deletedNoteItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deletedNoteContent: {
    flex: 1,
    marginRight: 12,
  },
  deletedNoteText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  deletedNoteDate: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  deletedNoteActions: {
    flexDirection: 'column',
    gap: 4,
  },
  recoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  recoverButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  permanentDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  permanentDeleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
});
