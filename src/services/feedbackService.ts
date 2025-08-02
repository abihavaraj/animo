import { supabase } from '../config/supabase.config';

// Define ApiResponse interface
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ClassFeedback {
  id: number;
  class_id: number;
  instructor_id: number;
  overall_rating: number;
  energy_level: 'low' | 'medium' | 'high';
  difficulty_feedback: 'too_easy' | 'just_right' | 'too_hard';
  class_summary: string;
  achievements?: string;
  challenges?: string;
  improvements?: string;
  student_highlights: StudentHighlight[];
  private_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentHighlight {
  id?: number;
  student_id: number;
  student_name: string;
  type: 'improvement' | 'achievement' | 'concern' | 'milestone';
  note: string;
}

export interface CreateFeedbackRequest {
  classId: number;
  instructorId: number;
  overallRating: number;
  energyLevel: 'low' | 'medium' | 'high';
  difficultyFeedback: 'too_easy' | 'just_right' | 'too_hard';
  classSummary: string;
  achievements?: string;
  challenges?: string;
  improvements?: string;
  studentHighlights: StudentHighlight[];
  privateNotes?: string;
}

class FeedbackService {
  async getClassFeedback(classId: number): Promise<ApiResponse<ClassFeedback>> {
    try {
      const { data, error } = await supabase
        .from('class_feedback')
        .select('*')
        .eq('class_id', classId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No feedback found - this is okay
          return { success: true, data: undefined };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to get class feedback' };
    }
  }

  async getInstructorFeedback(instructorId: number): Promise<ApiResponse<ClassFeedback[]>> {
    try {
      const { data, error } = await supabase
        .from('class_feedback')
        .select(`
          *,
          classes (
            id,
            name,
            date,
            time
          )
        `)
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get instructor feedback' };
    }
  }

  async createFeedback(feedbackData: CreateFeedbackRequest): Promise<ApiResponse<ClassFeedback>> {
    try {
      // Insert the main feedback record
      const { data, error } = await supabase
        .from('class_feedback')
        .insert({
          class_id: feedbackData.classId,
          instructor_id: feedbackData.instructorId,
          overall_rating: feedbackData.overallRating,
          energy_level: feedbackData.energyLevel,
          difficulty_feedback: feedbackData.difficultyFeedback,
          class_summary: feedbackData.classSummary,
          achievements: feedbackData.achievements,
          challenges: feedbackData.challenges,
          improvements: feedbackData.improvements,
          student_highlights: feedbackData.studentHighlights,
          private_notes: feedbackData.privateNotes,
        })
        .select('*')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to create feedback' };
    }
  }

  async updateFeedback(feedbackId: number, feedbackData: Partial<CreateFeedbackRequest>): Promise<ApiResponse<ClassFeedback>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (feedbackData.overallRating !== undefined) updateData.overall_rating = feedbackData.overallRating;
      if (feedbackData.energyLevel) updateData.energy_level = feedbackData.energyLevel;
      if (feedbackData.difficultyFeedback) updateData.difficulty_feedback = feedbackData.difficultyFeedback;
      if (feedbackData.classSummary) updateData.class_summary = feedbackData.classSummary;
      if (feedbackData.achievements !== undefined) updateData.achievements = feedbackData.achievements;
      if (feedbackData.challenges !== undefined) updateData.challenges = feedbackData.challenges;
      if (feedbackData.improvements !== undefined) updateData.improvements = feedbackData.improvements;
      if (feedbackData.studentHighlights) updateData.student_highlights = feedbackData.studentHighlights;
      if (feedbackData.privateNotes !== undefined) updateData.private_notes = feedbackData.privateNotes;

      const { data, error } = await supabase
        .from('class_feedback')
        .update(updateData)
        .eq('id', feedbackId)
        .select('*')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to update feedback' };
    }
  }

  async deleteFeedback(feedbackId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('class_feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete feedback' };
    }
  }

  async getFeedbackStats(instructorId: number): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('class_feedback')
        .select('overall_rating, energy_level, difficulty_feedback')
        .eq('instructor_id', instructorId);

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { 
          success: true, 
          data: {
            totalFeedback: 0,
            averageRating: 0,
            energyLevelBreakdown: { low: 0, medium: 0, high: 0 },
            difficultyBreakdown: { too_easy: 0, just_right: 0, too_hard: 0 }
          }
        };
      }

      const totalFeedback = data.length;
      const averageRating = data.reduce((sum, f) => sum + f.overall_rating, 0) / totalFeedback;

      const energyLevelBreakdown = data.reduce((acc, f) => {
        acc[f.energy_level] = (acc[f.energy_level] || 0) + 1;
        return acc;
      }, {} as any);

      const difficultyBreakdown = data.reduce((acc, f) => {
        acc[f.difficulty_feedback] = (acc[f.difficulty_feedback] || 0) + 1;
        return acc;
      }, {} as any);

      return {
        success: true,
        data: {
          totalFeedback,
          averageRating: Math.round(averageRating * 10) / 10,
          energyLevelBreakdown,
          difficultyBreakdown
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to get feedback stats' };
    }
  }
}

export const feedbackService = new FeedbackService();