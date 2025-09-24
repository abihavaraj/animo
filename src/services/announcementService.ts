import { supabase } from '../config/supabase.config';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
  is_active: boolean;
  start_date: string;
  end_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
  start_date?: string;
  end_date?: string;
}

export interface UpdateAnnouncementData {
  title?: string;
  message?: string;
  type?: 'info' | 'warning' | 'urgent';
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
}

class AnnouncementService {
  // Get the most recent active announcement (for popup display)
  async getActiveAnnouncement(): Promise<Announcement | null> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching active announcement:', error);
        return null;
      }

      // Return the first announcement if any exist, otherwise null
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error in getActiveAnnouncement:', error);
      return null;
    }
  }

  // Get all active announcements visible to users
  async getActiveAnnouncements(): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active announcements:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveAnnouncements:', error);
      return [];
    }
  }

  // Get all announcements for management (reception/admin)
  async getAllAnnouncements(): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all announcements:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllAnnouncements:', error);
      return [];
    }
  }

  // Create new announcement
  async createAnnouncement(announcementData: CreateAnnouncementData): Promise<Announcement> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('announcements')
        .insert({
          ...announcementData,
          created_by: user.id,
          start_date: announcementData.start_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating announcement:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createAnnouncement:', error);
      throw error;
    }
  }

  // Update announcement
  async updateAnnouncement(id: string, updates: UpdateAnnouncementData): Promise<Announcement> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating announcement:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateAnnouncement:', error);
      throw error;
    }
  }

  // Delete announcement
  async deleteAnnouncement(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting announcement:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteAnnouncement:', error);
      throw error;
    }
  }

  // Deactivate announcement (soft delete)
  async deactivateAnnouncement(id: string): Promise<Announcement> {
    try {
      return await this.updateAnnouncement(id, { is_active: false });
    } catch (error) {
      console.error('Error deactivating announcement:', error);
      throw error;
    }
  }

  // Check if user can manage announcements
  async canManageAnnouncements(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || !data) return false;

      return ['reception', 'admin'].includes(data.role);
    } catch (error) {
      console.error('Error checking announcement permissions:', error);
      return false;
    }
  }
}

export const announcementService = new AnnouncementService();
