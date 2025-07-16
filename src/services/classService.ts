import { ApiResponse, apiService } from './api';

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
  instructorId: number;
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
  instructorId?: number;
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
}

export interface RoomAvailability {
  [roomName: string]: {
    available: boolean;
    conflictClass: BackendClass | null;
  };
}

class ClassService {
  async getClasses(filters?: ClassFilters): Promise<ApiResponse<BackendClass[]>> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/classes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiService.get<any>(endpoint);
    
    // Handle nested response structure from backend
    if (response.success && response.data && response.data.data) {
      return {
        success: true,
        data: response.data.data
      };
    } else if (response.success && response.data) {
      // Handle direct data structure
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      error: response.error || 'Failed to fetch classes'
    };
  }

  async getClass(id: number): Promise<ApiResponse<BackendClass>> {
    const response = await apiService.get<any>(`/classes/${id}`);
    
    if (response.success && response.data && response.data.data) {
      return {
        success: true,
        data: response.data.data
      };
    } else if (response.success && response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      error: response.error || 'Failed to fetch class'
    };
  }

  async createClass(classData: CreateClassRequest): Promise<ApiResponse<BackendClass>> {
    const response = await apiService.post<any>('/classes', classData);
    
    if (response.success && response.data && response.data.data) {
      return {
        success: true,
        data: response.data.data
      };
    } else if (response.success && response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      error: response.error || 'Failed to create class'
    };
  }

  async updateClass(id: number, classData: UpdateClassRequest): Promise<ApiResponse<BackendClass>> {
    const response = await apiService.put<any>(`/classes/${id}`, classData);
    
    if (response.success && response.data && response.data.data) {
      return {
        success: true,
        data: response.data.data
      };
    } else if (response.success && response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      error: response.error || 'Failed to update class'
    };
  }

  async deleteClass(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/classes/${id}`);
  }

  async cancelClass(id: number): Promise<ApiResponse<BackendClass>> {
    return this.updateClass(id, { status: 'cancelled' });
  }

  // Check room availability for a specific date and time
  async checkRoomAvailability(date: string, time: string, duration: number): Promise<ApiResponse<RoomAvailability>> {
    const response = await apiService.get<any>(`/classes/room-availability?date=${date}&time=${time}&duration=${duration}`);
    
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      error: response.error || 'Failed to check room availability'
    };
  }

  // Check for instructor scheduling conflicts
  async checkInstructorConflict(
    instructorId: number, 
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