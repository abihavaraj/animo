import { ApiResponse, apiService } from './api';

export interface Booking {
  id: number;
  userId: number;
  classId: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  checkedIn: boolean;
  bookingDate: string;
  createdAt: string;
  updatedAt: string;
  
  // Backend fields (snake_case)
  user_id?: number;
  class_id?: number;
  checked_in?: boolean;
  booking_date?: string;
  created_at?: string;
  updated_at?: string;
  
  // Class details from JOIN query
  class_name?: string;
  class_date?: string;
  class_time?: string;
  class_level?: string;
  equipment_type?: string;
  instructor_name?: string;
  
  class?: {
    id: number;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    instructorName: string;
    equipmentType: string;
  };
}

export interface BookingRequest {
  classId: number;
}

export interface BookingFilters {
  status?: string;
  from?: string;
  to?: string;
}

export interface WaitlistEntry {
  id: number;
  userId: number;
  classId: number;
  position: number;
  createdAt: string;
  className?: string;
  classDate?: string;
  classTime?: string;
  classLevel?: string;
  instructorName?: string;
}

export interface WaitlistRequest {
  classId: number;
}

class BookingService {
  async getBookings(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value);
        }
      });
    }
    
    const endpoint = `/bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<Booking[]>(endpoint);
  }

  async createBooking(bookingData: BookingRequest): Promise<ApiResponse<Booking>> {
    return apiService.post<Booking>('/bookings', bookingData);
  }

  async cancelBooking(id: number): Promise<ApiResponse<Booking>> {
    return apiService.put<Booking>(`/bookings/${id}/cancel`);
  }

  async checkIn(id: number): Promise<ApiResponse<Booking>> {
    return apiService.put<Booking>(`/bookings/${id}/checkin`);
  }

  async markCompleted(id: number): Promise<ApiResponse<Booking>> {
    return apiService.put<Booking>(`/bookings/${id}/complete`);
  }

  async getClassAttendees(classId: number): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>(`/bookings/class/${classId}/attendees`);
  }

  // Waitlist methods
  async joinWaitlist(waitlistData: WaitlistRequest): Promise<ApiResponse<WaitlistEntry>> {
    return apiService.post<WaitlistEntry>('/bookings/waitlist', waitlistData);
  }

  async leaveWaitlist(waitlistId: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/bookings/waitlist/${waitlistId}`);
  }

  async getUserWaitlist(userId?: number): Promise<ApiResponse<WaitlistEntry[]>> {
    const endpoint = userId ? `/bookings/waitlist/${userId}` : '/bookings/waitlist/user';
    return apiService.get<WaitlistEntry[]>(endpoint);
  }

  async getClassWaitlist(classId: number): Promise<ApiResponse<WaitlistEntry[]>> {
    return apiService.get<WaitlistEntry[]>(`/bookings/waitlist/class/${classId}`);
  }

  // Reception methods
  async assignClientToClass(userId: number, classId: number, notes?: string, overrideRestrictions?: boolean): Promise<ApiResponse<any>> {
    return apiService.post<any>('/bookings/reception-assign', {
      userId,
      classId,
      notes: notes || '',
      overrideRestrictions: overrideRestrictions || false
    });
  }

  async cancelClientBooking(userId: number, classId: number, notes?: string): Promise<ApiResponse<any>> {
    return apiService.post<any>('/bookings/reception-cancel', {
      userId,
      classId,
      notes: notes || ''
    });
  }
}

export const bookingService = new BookingService(); 