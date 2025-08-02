import { supabase } from '../config/supabase.config';

// Define ApiResponse interface
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProgressNote {
  id: number;
  student_id: string;
  instructor_id: string;
  class_id?: number;
  note: string;
  category: 'improvement' | 'concern' | 'achievement' | 'general';
  private: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data
  student_name?: string;
  student_email?: string;
  class_name?: string;
  class_date?: string;
  class_time?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  emergency_contact?: string;
  medical_conditions?: string;
  profile_image?: string;
  created_at: string;
  total_classes?: number;
  attendance_rate?: number;
  last_class_date?: string;
  progress_notes?: ProgressNote[];
}

export interface CreateProgressNoteRequest {
  studentId: string;
  instructorId: string;
  classId?: number;
  note: string;
  category: 'improvement' | 'concern' | 'achievement' | 'general';
  isPrivate: boolean;
}

class ProgressNotesService {
  async getInstructorStudents(instructorId: string): Promise<ApiResponse<Student[]>> {
    try {
      // Get students who have attended this instructor's classes
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          user_id,
          users!bookings_user_id_fkey (
            id,
            name,
            email,
            phone,
            emergency_contact,
            medical_conditions,
            profile_image,
            created_at
          ),
          classes!bookings_class_id_fkey (
            instructor_id,
            date,
            time
          )
        `)
        .eq('classes.instructor_id', instructorId)
        .eq('status', 'confirmed');

      if (bookingsError) {
        return { success: false, error: bookingsError.message };
      }

      if (!bookings || bookings.length === 0) {
        return { success: true, data: [] };
      }

      // Group by student and calculate stats
      const studentMap = new Map<string, any>();
      
      bookings.forEach((booking: any) => {
        const userId = booking.user_id;
        const user = booking.users;
        const classInfo = booking.classes;
        
        if (!user || !classInfo) return;

        if (!studentMap.has(userId)) {
          studentMap.set(userId, {
            ...user,
            total_classes: 0,
            class_dates: [],
          });
        }

        const student = studentMap.get(userId);
        student.total_classes++;
        if (classInfo.date) {
          student.class_dates.push(classInfo.date);
        }
      });

      // Convert to array and calculate final stats
      const students: Student[] = Array.from(studentMap.values()).map(student => {
        const sortedDates = student.class_dates.sort().reverse();
        const lastClassDate = sortedDates[0] || null;
        
        // Simple attendance rate calculation (could be enhanced)
        const attendanceRate = Math.min(100, Math.round((student.total_classes / Math.max(1, student.total_classes)) * 100));

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          emergency_contact: student.emergency_contact,
          medical_conditions: student.medical_conditions,
          profile_image: student.profile_image,
          created_at: student.created_at,
          total_classes: student.total_classes,
          attendance_rate: attendanceRate,
          last_class_date: lastClassDate,
        };
      });

      // Load progress notes for each student
      const studentsWithNotes = await Promise.all(
        students.map(async (student) => {
          const notesResponse = await this.getStudentNotes(student.id, instructorId);
          return {
            ...student,
            progress_notes: notesResponse.success ? notesResponse.data : []
          };
        })
      );

      return { success: true, data: studentsWithNotes };
    } catch (error) {
      return { success: false, error: 'Failed to get instructor students' };
    }
  }

  async getStudentNotes(studentId: string, instructorId?: string): Promise<ApiResponse<ProgressNote[]>> {
    try {
      let query = supabase
        .from('progress_notes')
        .select(`
          *,
          users!progress_notes_student_id_fkey (name, email),
          classes (name, date, time)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (instructorId) {
        query = query.eq('instructor_id', instructorId);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      const notes = (data || []).map((note: any) => ({
        ...note,
        student_name: note.users?.name,
        student_email: note.users?.email,
        class_name: note.classes?.name,
        class_date: note.classes?.date,
        class_time: note.classes?.time,
      }));

      return { success: true, data: notes };
    } catch (error) {
      return { success: false, error: 'Failed to get student notes' };
    }
  }

  async createProgressNote(noteData: CreateProgressNoteRequest): Promise<ApiResponse<ProgressNote>> {
    try {
      const { data, error } = await supabase
        .from('progress_notes')
        .insert({
          student_id: noteData.studentId,
          instructor_id: noteData.instructorId,
          class_id: noteData.classId,
          note: noteData.note,
          category: noteData.category,
          private: noteData.isPrivate,
        })
        .select(`
          *,
          users!progress_notes_student_id_fkey (name, email),
          classes (name, date, time)
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const note = {
        ...data,
        student_name: data.users?.name,
        student_email: data.users?.email,
        class_name: data.classes?.name,
        class_date: data.classes?.date,
        class_time: data.classes?.time,
      };

      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: 'Failed to create progress note' };
    }
  }

  async updateProgressNote(noteId: number, updates: Partial<CreateProgressNoteRequest>): Promise<ApiResponse<ProgressNote>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.note) updateData.note = updates.note;
      if (updates.category) updateData.category = updates.category;
      if (updates.isPrivate !== undefined) updateData.private = updates.isPrivate;
      if (updates.classId) updateData.class_id = updates.classId;

      const { data, error } = await supabase
        .from('progress_notes')
        .update(updateData)
        .eq('id', noteId)
        .select(`
          *,
          users!progress_notes_student_id_fkey (name, email),
          classes (name, date, time)
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const note = {
        ...data,
        student_name: data.users?.name,
        student_email: data.users?.email,
        class_name: data.classes?.name,
        class_date: data.classes?.date,
        class_time: data.classes?.time,
      };

      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: 'Failed to update progress note' };
    }
  }

  async deleteProgressNote(noteId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('progress_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete progress note' };
    }
  }

  async getProgressNoteStats(instructorId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('progress_notes')
        .select('category, private, created_at')
        .eq('instructor_id', instructorId);

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: {
            totalNotes: 0,
            categoryBreakdown: { improvement: 0, concern: 0, achievement: 0, general: 0 },
            privateNotes: 0,
            publicNotes: 0,
            thisWeekNotes: 0
          }
        };
      }

      const totalNotes = data.length;
      const privateNotes = data.filter(note => note.private).length;
      const publicNotes = totalNotes - privateNotes;

      const categoryBreakdown = data.reduce((acc, note) => {
        acc[note.category] = (acc[note.category] || 0) + 1;
        return acc;
      }, {} as any);

      // Calculate this week's notes
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekNotes = data.filter(note => 
        new Date(note.created_at) >= oneWeekAgo
      ).length;

      return {
        success: true,
        data: {
          totalNotes,
          categoryBreakdown,
          privateNotes,
          publicNotes,
          thisWeekNotes
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to get progress note stats' };
    }
  }
}

export const progressNotesService = new ProgressNotesService();