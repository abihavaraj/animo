import { supabase } from '../config/supabase.config';

export interface StickyNote {
  id?: string;
  user_id?: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class StickyNotesService {
  
  // Get all active (non-deleted) sticky notes for current user
  async getStickyNotes(): Promise<ApiResponse<StickyNote[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('reception_sticky_notes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching sticky notes:', error);
        return { success: false, error: 'Failed to fetch sticky notes' };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error in getStickyNotes:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get deleted (trashed) sticky notes for current user
  async getDeletedStickyNotes(): Promise<ApiResponse<StickyNote[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('reception_sticky_notes')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error('Error fetching deleted sticky notes:', error);
        return { success: false, error: 'Failed to fetch deleted sticky notes' };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error in getDeletedStickyNotes:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Create a new sticky note
  async createStickyNote(noteData: Omit<StickyNote, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<ApiResponse<StickyNote>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('reception_sticky_notes')
        .insert({
          user_id: user.id,
          content: noteData.content,
          color: noteData.color,
          position_x: noteData.position_x,
          position_y: noteData.position_y,
          width: noteData.width,
          height: noteData.height
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating sticky note:', error);
        return { success: false, error: 'Failed to create sticky note' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in createStickyNote:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Update an existing sticky note
  async updateStickyNote(id: string, updates: Partial<Omit<StickyNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<StickyNote>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('reception_sticky_notes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only update their own notes
        .select()
        .single();

      if (error) {
        console.error('Error updating sticky note:', error);
        return { success: false, error: 'Failed to update sticky note' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in updateStickyNote:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Soft delete a sticky note (move to trash)
  async deleteStickyNote(id: string): Promise<ApiResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('reception_sticky_notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own notes

      if (error) {
        console.error('Error deleting sticky note:', error);
        return { success: false, error: 'Failed to delete sticky note' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteStickyNote:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Restore a deleted sticky note from trash
  async restoreStickyNote(id: string): Promise<ApiResponse<StickyNote>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('reception_sticky_notes')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only restore their own notes
        .select()
        .single();

      if (error) {
        console.error('Error restoring sticky note:', error);
        return { success: false, error: 'Failed to restore sticky note' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in restoreStickyNote:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Permanently delete a sticky note
  async permanentlyDeleteStickyNote(id: string): Promise<ApiResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('reception_sticky_notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only permanently delete their own notes

      if (error) {
        console.error('Error permanently deleting sticky note:', error);
        return { success: false, error: 'Failed to permanently delete sticky note' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in permanentlyDeleteStickyNote:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Bulk operations
  async bulkDeleteStickyNotes(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('reception_sticky_notes')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error bulk deleting sticky notes:', error);
        return { success: false, error: 'Failed to delete sticky notes' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in bulkDeleteStickyNotes:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Auto-save functionality - saves position and size changes
  async autoSave(id: string, position_x: number, position_y: number, width?: number, height?: number): Promise<void> {
    try {
      const updates: any = { position_x, position_y };
      if (width !== undefined) updates.width = width;
      if (height !== undefined) updates.height = height;

      await this.updateStickyNote(id, updates);
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Silent fail for auto-save to not interrupt user experience
    }
  }
}

export const stickyNotesService = new StickyNotesService();
export default stickyNotesService;
