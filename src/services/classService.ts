import { supabase } from '../config/supabase.config';

// Define ApiResponse interface locally
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BackendClass {
  id: number;
  name: string;
  instructor_id: number;
  instructor_name: string;
  date: string;
  time: string;
  duration: number;
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'personal' | 'group';
  capacity: number;
  enrolled: number;
  equipment_type: 'mat' | 'reformer' | 'both';
  equipment: string[];
  description?: string;
  notes?: string; // Add notes field
  status: 'active' | 'cancelled' | 'full';
  room?: 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '';
  created_at: string;
  updated_at: string;
}

export interface CreateClassRequest {
  name: string;
  instructorId: number | string; // Support both integer (SQLite) and UUID string (Supabase)
  date: string;
  time: string;
  duration: number;
  category: 'personal' | 'group';
  capacity: number;
  equipmentType: 'mat' | 'reformer' | 'both';
  equipment: string[];
  description?: string;
  notes?: string; // Add notes field
  room?: 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '';
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  enableNotifications?: boolean;
  notificationMinutes?: number;
}

export interface UpdateClassRequest {
  name?: string;
  instructorId?: number | string; // Support both integer (SQLite) and UUID string (Supabase)
  date?: string;
  time?: string;
  duration?: number;
  category?: 'personal' | 'group';
  capacity?: number;
  equipmentType?: 'mat' | 'reformer' | 'both';
  equipment?: string[];
  description?: string;
  notes?: string; // Add notes field
  room?: 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '';
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  status?: 'active' | 'cancelled' | 'full';
  enableNotifications?: boolean;
  notificationMinutes?: number;
}

export interface ClassFilters {
  date?: string;
  instructor?: string;
  level?: string;
  category?: string;
  equipmentType?: string;
  status?: string;
  room?: string;
  upcoming?: boolean; // Added for upcoming classes
}

export interface RoomAvailability {
  [roomName: string]: {
    available: boolean;
    conflictClass: BackendClass | null;
  };
}

class ClassService {
  async getClasses(filters?: ClassFilters): Promise<ApiResponse<BackendClass[]>> {
    try {
      let query = supabase
        .from('classes')
        .select(`
          *,
          users!classes_instructor_id_fkey (name, email)
        `);
        
      // Only filter by status if it's explicitly requested, otherwise show all classes
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.date) {
        query = query.eq('date', filters.date);
      }
      
      if (filters?.instructor) {
        query = query.eq('instructor_id', filters.instructor);
      }
   
      if (filters?.level) {
        query = query.eq('level', filters.level);
      }
      
      if (filters?.equipmentType) {
        query = query.eq('equipment_type', filters.equipmentType);
      }
      
      if (filters?.upcoming) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        query = query.gte('date', todayStr);
      }
      
      query = query.order('date').order('time');
      
      const { data, error } = await query;
   
      if (error) {
        console.error('❌ ClassService: Supabase error:', error);
        return { success: false, error: error.message };
      }
      
      // Get enrollment counts for all classes in a separate query
      const classIds = (data || []).map(class_ => class_.id);
      let enrollmentCounts: { [key: string]: number } = {};
      
      if (classIds.length > 0) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('class_id, status')
          .in('class_id', classIds)
          .eq('status', 'confirmed');
          
        if (!bookingsError && bookingsData) {
          // Count bookings per class
          bookingsData.forEach(booking => {
            const classId = booking.class_id;
            enrollmentCounts[classId] = (enrollmentCounts[classId] || 0) + 1;
          });
        }
      }
      
      // Transform the data to include instructor_name and enrolled count
      const transformedData = (data || []).map(class_ => ({
        ...class_,
        instructor_name: class_.users?.name || 'Unknown Instructor',
        enrolled: enrollmentCounts[class_.id] || 0
      }));
      
      return { success: true, data: transformedData };
    } catch (error) {
      console.error('❌ ClassService: Exception in getClasses:', error);
      return { success: false, error: 'Failed to get classes' };
    }
  }

  async getClassById(id: number): Promise<ApiResponse<BackendClass>> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          users!classes_instructor_id_fkey (name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Get enrollment count for this specific class
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('class_id', id)
        .eq('status', 'confirmed');
      
      const enrolled = !bookingsError && bookingsData ? bookingsData.length : 0;
      
      // Transform the data to include instructor_name and enrolled count
      const transformedData = {
        ...data,
        instructor_name: data?.users?.name || 'Unknown Instructor',
        enrolled
      };
      
      return { success: true, data: transformedData };
    } catch (error) {
      return { success: false, error: 'Failed to get class' };
    }
  }

  async createClass(classData: CreateClassRequest): Promise<ApiResponse<BackendClass>> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: classData.name,
          instructor_id: classData.instructorId,
          date: classData.date,
          time: classData.time,
          duration: classData.duration,
          level: classData.level,
          capacity: classData.capacity,
          equipment_type: classData.equipmentType,
          equipment: classData.equipment,
          description: classData.description,
          room: classData.room,
          status: 'active'
        })
        .select(`
          *,
          users!classes_instructor_id_fkey (name, email)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Transform the data to include instructor_name from the joined users table
      const transformedData = {
        ...data,
        instructor_name: data?.users?.name || 'Unknown Instructor'
      };
      
      return { success: true, data: transformedData };
    } catch (error) {
      return { success: false, error: 'Failed to create class' };
    }
  }

  async updateClass(id: number, updates: UpdateClassRequest): Promise<ApiResponse<BackendClass>> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          users!classes_instructor_id_fkey (name, email)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Transform the data to include instructor_name from the joined users table
      const transformedData = {
        ...data,
        instructor_name: data?.users?.name || 'Unknown Instructor'
      };
      
      return { success: true, data: transformedData };
    } catch (error) {
      return { success: false, error: 'Failed to update class' };
    }
  }

  async deleteClass(id: number): Promise<ApiResponse<void>> {
    try {
      // Actually delete the class record from the database
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete class' };
    }
  }

  async cancelClass(id: number): Promise<ApiResponse<BackendClass>> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          users!classes_instructor_id_fkey (name, email)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Transform the data to include instructor_name from the joined users table
      const transformedData = {
        ...data,
        instructor_name: data?.users?.name || 'Unknown Instructor'
      };
      
      return { success: true, data: transformedData };
    } catch (error) {
      return { success: false, error: 'Failed to cancel class' };
    }
  }

  // Check room availability for a specific date and time
  async checkRoomAvailability(date: string, time: string, duration: number): Promise<ApiResponse<RoomAvailability>> {
    try {
      // Calculate time range for overlap detection
      const startTime = this.timeToMinutes(time);
      const endTime = startTime + duration;

      // Get all classes for the specific date
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('date', date)
        .eq('status', 'active');

      if (error) {
        return { success: false, error: error.message };
      }

      const classes = data || [];
      const allRooms = ['Reformer Room', 'Mat Room', 'Cadillac Room', 'Wall Room'];
      const roomAvailability: RoomAvailability = {};

      // Initialize all rooms as available
      for (const room of allRooms) {
        roomAvailability[room] = {
          available: true,
          conflictClass: null
        };
      }

      // Check for conflicts with existing classes
      for (const class_ of classes) {
        if (class_.room) {
          const classStartTime = this.timeToMinutes(class_.time);
          const classEndTime = classStartTime + class_.duration;

          // Check for time overlap
          if (startTime < classEndTime && endTime > classStartTime) {
            roomAvailability[class_.room] = {
              available: false,
              conflictClass: class_
            };
          }
        }
      }

      return { success: true, data: roomAvailability };
    } catch (error) {
      return { success: false, error: 'Failed to check room availability' };
    }
  }

  // Check for instructor scheduling conflicts
  async checkInstructorConflict(
    instructorId: number | string, 
    date: string, 
    time: string, 
    duration: number,
    excludeClassId?: number
  ): Promise<ApiResponse<{ hasConflict: boolean; conflictClass?: BackendClass }>> {
    try {
      const response = await this.getClasses({
        instructor: instructorId.toString(),
        date: date,
        status: 'active'
      });

      if (response.success && response.data) {
        // Calculate new class time range
        const newStartTime = this.timeToMinutes(time);
        const newEndTime = newStartTime + duration;

        const conflictClass = response.data.find(class_ => {
          if (class_.id === excludeClassId) return false;
          
          // Calculate existing class time range
          const existingStartTime = this.timeToMinutes(class_.time);
          const existingEndTime = existingStartTime + class_.duration;
          
          // Check for overlap: new start < existing end AND new end > existing start
          return newStartTime < existingEndTime && newEndTime > existingStartTime;
        });

        return {
          success: true,
          data: {
            hasConflict: !!conflictClass,
            conflictClass: conflictClass || undefined
          }
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to check instructor conflicts'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to check instructor conflicts'
      };
    }
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  async getClassStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.getClasses();
      
      if (response.success && response.data) {
        const classes = response.data;
        const stats = {
          total: classes.length,
          active: classes.filter(c => c.status === 'active').length,
          cancelled: classes.filter(c => c.status === 'cancelled').length,
          full: classes.filter(c => c.status === 'full').length,
          byLevel: {
            beginner: classes.filter(c => c.level === 'Beginner').length,
            intermediate: classes.filter(c => c.level === 'Intermediate').length,
            advanced: classes.filter(c => c.level === 'Advanced').length
          },
          byCategory: {
            personal: classes.filter(c => c.category === 'personal').length,
            group: classes.filter(c => c.category === 'group').length
          },
          byRoom: {
            reformer: classes.filter(c => c.room === 'Reformer Room').length,
            mat: classes.filter(c => c.room === 'Mat Room').length,
            cadillac: classes.filter(c => c.room === 'Cadillac Room').length,
            wall: classes.filter(c => c.room === 'Wall Room').length
          }
        };
        
        return {
          success: true,
          data: stats
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to get class stats'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get class stats'
      };
    }
  }

  async getInstructorClasses(instructorId: number, filters?: Partial<ClassFilters>): Promise<ApiResponse<BackendClass[]>> {
    return this.getClasses({
      ...filters,
      instructor: instructorId.toString()
    });
  }

  async getUpcomingClasses(limit?: number): Promise<ApiResponse<BackendClass[]>> {
    const today = new Date().toISOString().split('T')[0];
    const response = await this.getClasses({
      date: today,
      status: 'active'
    });

    if (response.success && response.data) {
      const sortedClasses = response.data
        .filter(class_ => class_.date >= today)
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        });

      return {
        success: true,
        data: limit ? sortedClasses.slice(0, limit) : sortedClasses
      };
    }

    return response;
  }
}

export const classService = new ClassService(); 