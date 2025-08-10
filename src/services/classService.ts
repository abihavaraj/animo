import { supabase } from '../config/supabase.config';

// Define ApiResponse interface locally
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string; // Optional success message with additional details
}

export interface BackendClass {
  id: string;
  name: string;
  instructor_id: string;
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
  date_from?: string; // 🚀 OPTIMIZATION: Date range filtering
  date_to?: string;   // 🚀 OPTIMIZATION: Date range filtering
  limit?: number;     // 🚀 OPTIMIZATION: Result limiting
}

export interface RoomAvailability {
  [roomName: string]: {
    available: boolean;
    conflictClass: BackendClass | null;
  };
}

class ClassService {
  // Update classes that have finished to 'completed' status
  async updateCompletedClassStatus(): Promise<ApiResponse<void>> {
    try {

      
      const now = new Date();
      const currentTimestamp = now.toISOString();
      
      // Find classes that have ended but are still marked as 'active'
      const { data: expiredClasses, error: fetchError } = await supabase
        .from('classes')
        .select('id, name, date, time, duration, status')
        .eq('status', 'active')
        .lte('date', now.toISOString().split('T')[0]); // Classes on or before today
      
      if (fetchError) {
        console.error('❌ [classService] Error fetching classes for status update:', fetchError);
        return { success: false, error: fetchError.message };
      }
      
      if (!expiredClasses || expiredClasses.length === 0) {

        return { success: true };
      }
      
      // Filter classes that have actually ended (class end time < now)
      const classesToComplete = expiredClasses.filter(cls => {
        const classDateTime = new Date(`${cls.date}T${cls.time}`);
        const classEndTime = new Date(classDateTime.getTime() + (cls.duration || 60) * 60000);
        const hasEnded = classEndTime < now;
        
        if (hasEnded) {

        }
        
        return hasEnded;
      });
      
      if (classesToComplete.length === 0) {

        return { success: true };
      }
      
      // Update classes to 'completed' status
      const classIdsToUpdate = classesToComplete.map(cls => cls.id);
      const { error: updateError } = await supabase
        .from('classes')
        .update({ 
          status: 'completed',
          updated_at: currentTimestamp
        })
        .in('id', classIdsToUpdate);
      
      if (updateError) {
        console.error('❌ [classService] Error updating class statuses:', updateError);
        return { success: false, error: updateError.message };
      }
      

      classesToComplete.forEach(cls => {

      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ [classService] Error in updateCompletedClassStatus:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update class statuses'
      };
    }
  }

  // 🚀 OPTIMIZATION 1: Single query with enrollment counts and date filtering
  async getClasses(filters?: ClassFilters): Promise<ApiResponse<BackendClass[]>> {
    try {

      
      // Debug: Check current user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ [ClassService] Auth error:', authError);
      } else if (user) {

        
        // Check user role in database
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('role, status')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('❌ [ClassService] Profile error:', profileError);
        } else {

        }
      } else {

      }
      
      // 🚀 OPTIMIZATION 2: Build efficient query with proper filtering
      let baseQuery = supabase
        .from('classes')
        .select(`
          id,
          name,
          date,
          time,
          duration,
          category,
          capacity,
          equipment_type,
          room,
          status,
          instructor_id,
          users!classes_instructor_id_fkey (name, email)
        `);
        
      // 🚀 OPTIMIZATION 3: Server-side filtering
      if (filters?.status) {
        baseQuery = baseQuery.eq('status', filters.status);
        //console.log('🔍 [ClassService] Filtering by status:', filters.status);
      } else {
        // Include active, full, and completed classes (clients can see all classes including past ones)
        baseQuery = baseQuery.in('status', ['active', 'full', 'completed']);

      }
      
      if (filters?.date) {
        baseQuery = baseQuery.eq('date', filters.date);
      }
      
      if (filters?.date_from) {
        baseQuery = baseQuery.gte('date', filters.date_from);
      }
      
      if (filters?.date_to) {
        baseQuery = baseQuery.lte('date', filters.date_to);
      }
      
      if (filters?.instructor) {
        baseQuery = baseQuery.eq('instructor_id', filters.instructor);
      }
   
      if (filters?.level) {
        baseQuery = baseQuery.eq('level', filters.level);
      }
      
      if (filters?.equipmentType) {
        baseQuery = baseQuery.eq('equipment_type', filters.equipmentType);
      }
      
      if (filters?.upcoming) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        baseQuery = baseQuery.gte('date', todayStr);
      }
      
      // 🚀 OPTIMIZATION 4: Efficient ordering and limiting
      baseQuery = baseQuery
        .order('date')
        .order('time')
        .limit(filters?.limit || 50); // Reasonable default limit
      

      const { data, error } = await baseQuery;
   
      if (error) {
        console.error('❌ ClassService: Supabase error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message };
      }
      

      if (data && data.length > 0) {
        //console.log('📋 [ClassService] Sample class:', data[0]);
      } else {
        //console.log('🔍 [ClassService] No classes returned - debugging...');
        
        // Debug: Try a simpler query to see if it's a filtering issue
        const { data: allClasses, error: allError } = await supabase
          .from('classes')
          .select('id, name, status, date, instructor_id')
          .limit(5);
          
        if (allError) {
          console.error('❌ [ClassService] Debug query failed:', allError);
        } else {
          //console.log('🔍 [ClassService] All classes in DB (limit 5):', allClasses);
          
          // Debug: Check just active classes
          const { data: activeClasses, error: activeError } = await supabase
            .from('classes')
            .select('id, name, status, date')
            .eq('status', 'active')
            .limit(5);
            
          if (activeError) {
            console.error('❌ [ClassService] Active classes query failed:', activeError);
          } else {
            //console.log('🔍 [ClassService] Active classes in DB:', activeClasses);
          }
        }
      }
      
      // 🚀 OPTIMIZATION 5: Simplified enrollment counting
      const classesWithEnrollment = await this.addEnrollmentCounts(data || []);
      
      //console.log('✅ [ClassService] Final result:', classesWithEnrollment.length, 'classes with enrollment data');
      return { success: true, data: classesWithEnrollment };
    } catch (error) {
      console.error('❌ Error in getClasses:', error);
      return { success: false, error: 'Failed to get classes' };
    }
  }

  async getClassById(id: number | string): Promise<ApiResponse<BackendClass>> {
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

  async updateClass(id: number | string, updates: UpdateClassRequest): Promise<ApiResponse<BackendClass>> {
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

  async deleteClass(id: number | string): Promise<ApiResponse<void>> {
    try {
      // 1. First, get class details to check if it has already started/passed
      const { data: classDetails, error: classError } = await supabase
        .from('classes')
        .select('id, name, date, time, duration')
        .eq('id', id)
        .single();
      
      if (classError || !classDetails) {
        return { success: false, error: 'Class not found' };
      }

      // 2. Check if the class has already started (passed its start time)
      const classStartDateTime = new Date(`${classDetails.date}T${classDetails.time}`);
      const now = new Date();
      const classHasPassed = classStartDateTime <= now;
      
      //console.log(`🕐 Class "${classDetails.name}" start time: ${classStartDateTime.toISOString()}`);
      //console.log(`🕐 Current time: ${now.toISOString()}`);
      //console.log(`🕐 Class has ${classHasPassed ? 'started/passed' : 'not started yet'}`);

      // 3. Get all confirmed bookings for this class
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          status,
          users!inner(name, email)
        `)
        .eq('class_id', id)
        .eq('status', 'confirmed');
      
      if (bookingsError) {
        console.warn('⚠️ Could not fetch bookings for refund:', bookingsError);
        // Continue with deletion even if we can't fetch bookings
      }

      // 4. Only refund credits for classes that haven't started yet
      let refundCount = 0;
      if (bookings && bookings.length > 0) {
        if (classHasPassed) {
          //console.log(`⏰ Class has already started/passed - no refunds will be processed`);
          //console.log(`📋 ${bookings.length} users had bookings but will not receive refunds`);
        } else {
          //console.log(`💰 Class hasn't started yet - refunding ${bookings.length} users...`);
          
          for (const booking of bookings) {
            try {
              await this.refundUserCredits(booking.user_id, booking.users?.name || 'Unknown User');
              refundCount++;
            } catch (refundError) {
              console.warn(`⚠️ Failed to refund user ${booking.user_id}:`, refundError);
              // Continue with other refunds even if one fails
            }
          }
          
          //console.log(`✅ Refund process completed for ${refundCount} users`);
        }
      }

      // 3. Delete all bookings for this class
      const { error: deleteBookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('class_id', id);
      
      if (deleteBookingsError) {
        console.warn('⚠️ Could not delete bookings:', deleteBookingsError);
        // Continue with class deletion
      }

      // 4. Finally, delete the class record from the database
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Generate appropriate message based on timing and refunds
      let refundMessage = '';
      if (bookings && bookings.length > 0) {
        if (classHasPassed) {
          refundMessage = ` Class had already started, so no refunds were processed for ${bookings.length} booking${bookings.length === 1 ? '' : 's'}.`;
        } else if (refundCount > 0) {
          refundMessage = ` Credits have been refunded to ${refundCount} user${refundCount === 1 ? '' : 's'}.`;
        }
      }
      
      return { 
        success: true, 
        message: `Class deleted successfully.${refundMessage}`
      };
    } catch (error) {
      return { success: false, error: 'Failed to delete class' };
    }
  }

  // Helper method to refund credits to a user
  private async refundUserCredits(userId: string, userName: string): Promise<void> {
    try {
      // Get the user's active subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          id, 
          remaining_classes,
          subscription_plans!inner(
            name, 
            monthly_classes
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subError || !subscription) {
        console.warn(`⚠️ No active subscription found for user ${userId} (${userName})`);
        return;
      }

      // Check if it's an unlimited plan (999+ classes)
      const monthlyClasses = subscription.subscription_plans.monthly_classes || 0;
      const isUnlimited = monthlyClasses >= 999;
      
      if (isUnlimited) {
        //console.log(`✅ User ${userName} has unlimited plan - no credit refund needed`);
        return;
      }

      // Add one class back to their remaining_classes
      const newRemainingClasses = (subscription.remaining_classes || 0) + 1;
      
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          remaining_classes: newRemainingClasses,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
      
      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }
      
      const planName = subscription.subscription_plans.name || 'Unknown Plan';
      //console.log(`✅ Refunded 1 class to ${userName} (${planName}): ${subscription.remaining_classes} → ${newRemainingClasses}`);
      
    } catch (error) {
      console.error(`❌ Failed to refund credits for user ${userId} (${userName}):`, error);
      throw error;
    }
  }

  async cancelClass(id: number | string): Promise<ApiResponse<BackendClass>> {
    try {
      // 1. First, get class details to check if it has already started/passed
      const { data: classDetails, error: classError } = await supabase
        .from('classes')
        .select('id, name, date, time, duration')
        .eq('id', id)
        .single();
      
      if (classError || !classDetails) {
        return { success: false, error: 'Class not found' };
      }

      // 2. Check if the class has already started (passed its start time)
      const classStartDateTime = new Date(`${classDetails.date}T${classDetails.time}`);
      const now = new Date();
      const classHasPassed = classStartDateTime <= now;
      
      //console.log(`🕐 Cancelling class "${classDetails.name}" start time: ${classStartDateTime.toISOString()}`);
      //console.log(`🕐 Current time: ${now.toISOString()}`);
      //console.log(`🕐 Class has ${classHasPassed ? 'started/passed' : 'not started yet'}`);

      // 3. Get all confirmed bookings for this specific class
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          status,
          users!inner(name, email)
        `)
        .eq('class_id', id)
        .eq('status', 'confirmed');
      
      if (bookingsError) {
        console.warn('⚠️ Could not fetch bookings for refund:', bookingsError);
        // Continue with cancellation even if we can't fetch bookings
      }

      // 4. Only refund credits for classes that haven't started yet
      let refundCount = 0;
      let refundMessage = '';
      
      if (bookings && bookings.length > 0) {
        if (classHasPassed) {
          //console.log(`⏰ Class has already started/passed - no refunds will be processed`);
          //console.log(`📋 ${bookings.length} users had bookings but will not receive refunds`);
          refundMessage = ` Class had already started, so no refunds were processed for ${bookings.length} booking${bookings.length === 1 ? '' : 's'}.`;
        } else {
          //console.log(`💰 Class hasn't started yet - refunding ${bookings.length} users who had bookings...`);
          
          for (const booking of bookings) {
            try {
              await this.refundUserCredits(booking.user_id, booking.users?.name || 'Unknown User');
              refundCount++;
              //console.log(`✅ Refunded credits to ${booking.users?.name || 'Unknown User'} for cancelled class`);
            } catch (refundError) {
              console.warn(`⚠️ Failed to refund user ${booking.user_id}:`, refundError);
              // Continue with other refunds even if one fails
            }
          }
          
          //console.log(`✅ Refund process completed for ${refundCount} users with bookings`);
          
          if (refundCount > 0) {
            refundMessage = ` Credits have been refunded to ${refundCount} user${refundCount === 1 ? '' : 's'} who had bookings.`;
          }
        }
      } else {
        //console.log(`📭 No confirmed bookings found for this class - no refunds needed`);
      }

      // 5. Update class status to cancelled
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
      
      return { 
        success: true, 
        data: transformedData,
        message: `Class cancelled successfully.${refundMessage}`
      };
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
    excludeClassId?: number | string
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

  // 🚀 OPTIMIZATION 6: Efficient enrollment counting
  private async addEnrollmentCounts(classes: any[]): Promise<BackendClass[]> {
    if (classes.length === 0) return [];
    
    try {
      const classIds = classes.map(cls => cls.id);
      
      // Try to use the SQL function for efficient counting
      // Ensure class IDs are proper UUID strings for the function
      const uuidClassIds = classIds.map(id => id.toString());
      
      const { data: enrollmentData, error } = await supabase
        .rpc('get_class_enrollment_counts', {
          class_ids: uuidClassIds
        });
      
      if (error) {
        console.warn('📊 Could not get enrollment counts via RPC, using fallback:', error.message);
        // Fallback to the original method if RPC fails
        return this.addEnrollmentCountsFallback(classes);
      }
      
      // Create enrollment map using string IDs
      const enrollmentMap = new Map();
      enrollmentData?.forEach((item: any) => {
        enrollmentMap.set(item.class_id.toString(), item.enrollment_count);
      });
      
      // Add enrollment counts to classes
      return classes.map(cls => ({
        ...cls,
        enrolled: enrollmentMap.get(cls.id.toString()) || 0,
        instructor_name: cls.users?.name || 'TBD'
      }));
      
    } catch (error) {
      console.warn('Enrollment counting failed, using fallback:', error);
      return this.addEnrollmentCountsFallback(classes);
    }
  }

  // Fallback method for enrollment counting
  private async addEnrollmentCountsFallback(classes: any[]): Promise<BackendClass[]> {
    const classIds = classes.map(cls => cls.id);
    let enrollmentCounts: { [key: string]: number } = {};
    
    if (classIds.length > 0) {
      //console.log('📊 Calculating enrollment counts for classes:', classIds);
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('class_id, user_id, status')
        .in('class_id', classIds)
        .eq('status', 'confirmed');
        
      //console.log('📊 Booking data for enrollment count:', bookingsData);
      //console.log('📊 Booking error:', bookingsError);
        
      if (!bookingsError && bookingsData) {
        bookingsData.forEach(booking => {
          const classId = booking.class_id;
          enrollmentCounts[classId] = (enrollmentCounts[classId] || 0) + 1;
        });
        //console.log('📊 Final enrollment counts:', enrollmentCounts);
      } else {
        console.error('❌ Error fetching bookings for enrollment count:', bookingsError);
      }
    }
    
    return classes.map(cls => ({
      ...cls,
      enrolled: enrollmentCounts[cls.id] || 0,
      instructor_name: cls.users?.name || 'TBD'
    }));
  }

  // 🚀 OPTIMIZATION 7: Cached upcoming classes for dashboard
  private upcomingClassesCache: {
    data: BackendClass[];
    timestamp: number;
    expiry: number;
  } | null = null;

  async getUpcomingClassesForDashboard(): Promise<ApiResponse<BackendClass[]>> {
    const now = Date.now();
    const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
    
    // Return cached data if still valid
    if (this.upcomingClassesCache && 
        now < this.upcomingClassesCache.expiry) {
      return { success: true, data: this.upcomingClassesCache.data };
    }
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14); // Next 2 weeks
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const response = await this.getClasses({
        status: 'active',
        date_from: today,
        date_to: futureDateStr,
        limit: 20
      });
      
      if (response.success) {
        // Cache the results
        this.upcomingClassesCache = {
          data: response.data!,
          timestamp: now,
          expiry: now + CACHE_DURATION
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error getting upcoming classes for dashboard:', error);
      return { success: false, error: 'Failed to get upcoming classes' };
    }
  }

  // 🚀 OPTIMIZATION 8: Clear cache when classes are modified
  invalidateUpcomingClassesCache(): void {
    this.upcomingClassesCache = null;
  }
}

export const classService = new ClassService(); 