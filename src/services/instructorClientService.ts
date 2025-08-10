import { supabase } from '../config/supabase.config';
import { devError, devLog } from '../utils/devUtils';
import { ApiResponse } from './api';

// Instructor-Client Assignment interface
export interface InstructorClientAssignment {
  id: number;
  instructor_id: string;
  client_id: string;
  assigned_by: string;
  assignment_type: 'primary' | 'secondary' | 'temporary' | 'consultation';
  start_date: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'completed' | 'transferred';
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  instructor_name?: string;
}

// Progress Photo interface
export interface ClientProgressPhoto {
  id: number;
  client_id: string;
  instructor_id: string;
  photo_type: 'before' | 'after' | 'progress' | 'assessment';
  file_name: string;
  original_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  description?: string;
  body_area?: string;
  measurement_data?: Record<string, any>;
  taken_date: string;
  session_notes?: string;
  is_before_after_pair: boolean;
  pair_id?: number;
  created_at: string;
  updated_at: string;
  // Joined data
  client_name?: string;
}

// Medical Update interface
export interface ClientMedicalUpdate {
  id: number;
  client_id: string;
  instructor_id: string;
  previous_conditions?: string;
  updated_conditions: string;
  update_reason: string;
  severity_level: 'minor' | 'moderate' | 'significant' | 'major';
  requires_clearance: boolean;
  clearance_notes?: string;
  effective_date: string;
  verified_by_admin?: string;
  verification_date?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  client_name?: string;
  admin_name?: string;
}

// Progress Assessment interface
export interface ClientProgressAssessment {
  id: number;
  client_id: string;
  instructor_id: string;
  assessment_date: string;
  assessment_type: 'initial' | 'monthly' | 'quarterly' | 'annual' | 'injury_recovery' | 'goal_review';
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  flexibility_score?: number;
  strength_score?: number;
  balance_score?: number;
  endurance_score?: number;
  technique_score?: number;
  goals_achieved?: string[];
  new_goals?: string[];
  areas_of_improvement?: string;
  recommended_classes?: string[];
  restrictions_notes?: string;
  next_assessment_date?: string;
  overall_notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  client_name?: string;
}

class InstructorClientService {
  // Get all clients assigned to an instructor (both manual assignments and auto-assigned from personal class bookings)
  async getInstructorClients(instructorId: string): Promise<ApiResponse<InstructorClientAssignment[]>> {
    try {
      devLog('🔍 [instructorClientService] Fetching clients for instructor:', instructorId);
      
      // Get manually assigned clients from instructor_client_assignments table
      const { data: manualAssignments, error: assignmentsError } = await supabase
        .from('instructor_client_assignments')
        .select(`
          id,
          instructor_id,
          client_id,
          assigned_by,
          assignment_type,
          start_date,
          status,
          notes,
          created_at,
          updated_at
        `)
        .eq('instructor_id', instructorId)
        .eq('status', 'active');

      if (assignmentsError) {
        devError('❌ [instructorClientService] Manual assignments fetch error:', assignmentsError);
        return { success: false, error: assignmentsError.message };
      }

      devLog('📋 [instructorClientService] Found manual assignments:', manualAssignments?.length || 0);

      // Get user details for manually assigned clients
      let manualAssignmentUsers: any[] = [];
      if (manualAssignments && manualAssignments.length > 0) {
        const manualClientIds = manualAssignments.map(assignment => assignment.client_id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, phone, medical_conditions, emergency_contact')
          .in('id', manualClientIds);

        if (userError) {
          devError('❌ [instructorClientService] Manual assignment users fetch error:', userError);
        } else {
          manualAssignmentUsers = userData || [];
        }
      }

      // Get personal classes taught by this instructor for auto-assignments
      const { data: instructorClasses, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('instructor_id', instructorId)
        .eq('category', 'personal');

      if (classesError) {
        devError('❌ [instructorClientService] Classes fetch error:', classesError);
        return { success: false, error: classesError.message };
      }

      let autoAssignedClients: any[] = [];
      
      if (instructorClasses && instructorClasses.length > 0) {
        const classIds = instructorClasses.map(cls => cls.id);

        // Get clients who have booked these classes
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('user_id, status, created_at, class_id')
          .in('class_id', classIds)
          .in('status', ['confirmed', 'attended', 'completed'])
          .order('created_at', { ascending: false });

        if (!bookingsError && bookings && bookings.length > 0) {
          // Get unique client IDs and their most recent booking info
          const clientBookingMap = new Map();
          bookings.forEach(booking => {
            const clientId = booking.user_id;
            if (!clientBookingMap.has(clientId) || 
                new Date(booking.created_at) > new Date(clientBookingMap.get(clientId).created_at)) {
              clientBookingMap.set(clientId, booking);
            }
          });

          const uniqueClientIds = Array.from(clientBookingMap.keys());
          
          // Exclude clients who are already manually assigned
          const manuallyAssignedClientIds = manualAssignments?.map(assignment => assignment.client_id) || [];
          const autoOnlyClientIds = uniqueClientIds.filter(clientId => !manuallyAssignedClientIds.includes(clientId));

          if (autoOnlyClientIds.length > 0) {
            // Get client details for auto-assigned clients
            const { data: autoUsers, error: autoUsersError } = await supabase
              .from('users')
              .select('id, name, email, phone, medical_conditions, emergency_contact')
              .in('id', autoOnlyClientIds);

            if (!autoUsersError && autoUsers) {
              autoAssignedClients = autoUsers.map(user => {
                const recentBooking = clientBookingMap.get(user.id);
                return {
                  id: 0, // Auto-generated, not from actual assignment table
                  instructor_id: instructorId,
                  client_id: user.id,
                  assigned_by: 'system',
                  assignment_type: 'primary',
                  start_date: recentBooking.created_at,
                  status: 'active',
                  notes: `Auto-assigned based on personal class bookings`,
                  created_at: recentBooking.created_at,
                  updated_at: recentBooking.created_at,
                  client_name: user.name,
                  client_email: user.email,
                  client_phone: user.phone,
                };
              });
            }
          }
        }
      }

      // Format manual assignments data
      const formattedManualAssignments: InstructorClientAssignment[] = manualAssignments?.map(assignment => {
        const userInfo = manualAssignmentUsers.find(user => user.id === assignment.client_id);
        return {
          id: assignment.id,
          instructor_id: assignment.instructor_id,
          client_id: assignment.client_id,
          assigned_by: assignment.assigned_by,
          assignment_type: assignment.assignment_type,
          start_date: assignment.start_date,
          status: assignment.status,
          notes: assignment.notes,
          created_at: assignment.created_at,
          updated_at: assignment.updated_at,
          client_name: userInfo?.name,
          client_email: userInfo?.email,
          client_phone: userInfo?.phone,
        };
      }) || [];

      // Combine manual and auto assignments
      const allClients = [...formattedManualAssignments, ...autoAssignedClients];

      devLog('✅ [instructorClientService] Total clients fetched:', allClients.length);
      devLog('📋 Manual assignments:', formattedManualAssignments.length);
      devLog('🤖 Auto assignments:', autoAssignedClients.length);
      
      return { success: true, data: allClients };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getInstructorClients:', error);
      return { success: false, error: 'Failed to fetch instructor clients' };
    }
  }

  // Get progress photos for a client
  async getClientProgressPhotos(clientId: string, instructorId?: string): Promise<ApiResponse<ClientProgressPhoto[]>> {
    try {
      devLog('🔍 [instructorClientService] Fetching progress photos for client:', clientId);
      
      let query = supabase
        .from('client_progress_photos')
        .select('*')
        .eq('client_id', clientId);

      if (instructorId) {
        query = query.eq('instructor_id', instructorId);
      }

      const { data, error } = await query.order('taken_date', { ascending: false });

      if (error) {
        devError('❌ [instructorClientService] Supabase error:', error);
        return { success: false, error: error.message };
      }

      // Get client name if photos exist
      let clientName = '';
      if (data && data.length > 0) {
        const { data: user } = await supabase
          .from('users')
          .select('name')
          .eq('id', clientId)
          .single();
        clientName = user?.name || '';
      }

      const formattedData = data?.map(photo => ({
        ...photo,
        client_name: clientName,
      })) || [];

      devLog('✅ [instructorClientService] Progress photos fetched successfully:', formattedData.length);
      return { success: true, data: formattedData };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getClientProgressPhotos:', error);
      return { success: false, error: 'Failed to fetch progress photos' };
    }
  }

  // Upload progress photo
  async uploadProgressPhoto(
    file: File | { uri: string; name: string; type: string },
    clientId: string,
    instructorId: string,
    photoType: 'before' | 'after' | 'progress' | 'assessment',
    metadata: {
      description?: string;
      bodyArea?: string;
      sessionNotes?: string;
      measurementData?: Record<string, any>;
      pairId?: number;
    }
  ): Promise<ApiResponse<ClientProgressPhoto>> {
    try {
      devLog('📸 [instructorClientService] Uploading progress photo for client:', clientId);

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name?.split('.').pop() || 'jpg';
      const fileName = `progress/${clientId}/${timestamp}_${photoType}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(fileName, file);
      
      if (uploadError) {
        devError('❌ [instructorClientService] Upload error:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('client-photos')
        .getPublicUrl(fileName);
      const fileUrl = publicUrl;

      // Save photo metadata to database
      const { data, error } = await supabase
        .from('client_progress_photos')
        .insert({
          client_id: clientId,
          instructor_id: instructorId,
          photo_type: photoType,
          file_name: fileName,
          original_name: file.name,
          file_url: fileUrl,
          file_size: file.size || 0,
          mime_type: file.type || 'image/jpeg',
          description: metadata.description,
          body_area: metadata.bodyArea,
          session_notes: metadata.sessionNotes,
          measurement_data: metadata.measurementData,
          pair_id: metadata.pairId,
          is_before_after_pair: !!metadata.pairId,
          taken_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        devError('❌ [instructorClientService] Database error:', error);
        return { success: false, error: error.message };
      }

      devLog('✅ [instructorClientService] Progress photo uploaded successfully to cloud storage');
      return { success: true, data };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in uploadProgressPhoto:', error);
      return { success: false, error: 'Failed to upload progress photo' };
    }
  }

  // Delete progress photo
  async deleteProgressPhoto(photoId: number, instructorId?: string): Promise<ApiResponse<void>> {
    try {
      devLog('🗑️ [instructorClientService] Deleting progress photo:', photoId);

      // First get the photo metadata to get the file name
      let query = supabase
        .from('client_progress_photos')
        .select('file_name, instructor_id')
        .eq('id', photoId);

      // If instructorId is provided, ensure they can only delete their own photos
      if (instructorId) {
        query = query.eq('instructor_id', instructorId);
      }

      const { data: photoData, error: fetchError } = await query.single();

      if (fetchError || !photoData) {
        devError('❌ [instructorClientService] Photo not found or access denied:', fetchError);
        return { success: false, error: 'Photo not found or access denied' };
      }

      // Delete the file from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('client-photos')
        .remove([photoData.file_name]);

      if (storageError) {
        devError('❌ [instructorClientService] Storage delete error:', storageError);
        // Continue with database deletion even if storage fails
        console.warn('Failed to delete file from storage but continuing with database cleanup');
      }

      // Delete the photo metadata from database
      const { error: dbError } = await supabase
        .from('client_progress_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        devError('❌ [instructorClientService] Database delete error:', dbError);
        return { success: false, error: dbError.message };
      }

      devLog('✅ [instructorClientService] Progress photo deleted successfully');
      return { success: true };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in deleteProgressPhoto:', error);
      return { success: false, error: 'Failed to delete progress photo' };
    }
  }

  // Update client medical conditions
  async updateClientMedicalConditions(
    clientId: string,
    instructorId: string,
    updatedConditions: string,
    updateReason: string,
    severityLevel: 'minor' | 'moderate' | 'significant' | 'major' = 'minor',
    requiresClearance: boolean = false
  ): Promise<ApiResponse<ClientMedicalUpdate>> {
    try {
      devLog('🏥 [instructorClientService] Updating medical conditions for client:', clientId);

      // Get current medical conditions
      const { data: currentUser } = await supabase
        .from('users')
        .select('medical_conditions')
        .eq('id', clientId)
        .single();

      // Create medical update record
      const { data, error } = await supabase
        .from('client_medical_updates')
        .insert({
          client_id: clientId,
          instructor_id: instructorId,
          previous_conditions: currentUser?.medical_conditions,
          updated_conditions: updatedConditions,
          update_reason: updateReason,
          severity_level: severityLevel,
          requires_clearance: requiresClearance,
        })
        .select()
        .single();

      if (error) {
        devError('❌ [instructorClientService] Database error:', error);
        return { success: false, error: error.message };
      }

      // Update user's medical conditions if not requiring clearance
      if (!requiresClearance) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            medical_conditions: updatedConditions,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);

        if (updateError) {
          devError('❌ [instructorClientService] User update error:', updateError);
          // Don't fail the whole operation if user profile update fails
          console.warn('Medical update created but user profile sync failed:', updateError);
        } else {
          devLog('✅ [instructorClientService] User profile medical conditions updated successfully');
        }
      } else {
        devLog('⏳ [instructorClientService] Medical update requires clearance - user profile not updated yet');
      }

      devLog('✅ [instructorClientService] Medical conditions updated successfully');
      return { success: true, data };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in updateClientMedicalConditions:', error);
      return { success: false, error: 'Failed to update medical conditions' };
    }
  }

  // Create progress assessment
  async createProgressAssessment(
    assessment: Omit<ClientProgressAssessment, 'id' | 'created_at' | 'updated_at' | 'client_name'>
  ): Promise<ApiResponse<ClientProgressAssessment>> {
    try {
      devLog('📊 [instructorClientService] Creating progress assessment for client:', assessment.client_id);

      const { data, error } = await supabase
        .from('client_progress_assessments')
        .insert(assessment)
        .select()
        .single();

      if (error) {
        devError('❌ [instructorClientService] Database error:', error);
        return { success: false, error: error.message };
      }

      devLog('✅ [instructorClientService] Progress assessment created successfully');
      return { success: true, data };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in createProgressAssessment:', error);
      return { success: false, error: 'Failed to create progress assessment' };
    }
  }

  // Get progress assessments for a client
  async getClientProgressAssessments(clientId: string, instructorId?: string): Promise<ApiResponse<ClientProgressAssessment[]>> {
    try {
      devLog('🔍 [instructorClientService] Fetching progress assessments for client:', clientId);
      
      let query = supabase
        .from('client_progress_assessments')
        .select('*')
        .eq('client_id', clientId);

      if (instructorId) {
        query = query.eq('instructor_id', instructorId);
      }

      const { data, error } = await query.order('assessment_date', { ascending: false });

      if (error) {
        devError('❌ [instructorClientService] Supabase error:', error);
        return { success: false, error: error.message };
      }

      // Get client name if assessments exist
      let clientName = '';
      if (data && data.length > 0) {
        const { data: user } = await supabase
          .from('users')
          .select('name')
          .eq('id', clientId)
          .single();
        clientName = user?.name || '';
      }

      const formattedData = data?.map(assessment => ({
        ...assessment,
        client_name: clientName,
      })) || [];

      devLog('✅ [instructorClientService] Progress assessments fetched successfully:', formattedData.length);
      return { success: true, data: formattedData };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getClientProgressAssessments:', error);
      return { success: false, error: 'Failed to fetch progress assessments' };
    }
  }

  // Get medical updates for a client
  async getClientMedicalUpdates(clientId: string, instructorId?: string): Promise<ApiResponse<ClientMedicalUpdate[]>> {
    try {
      devLog('🔍 [instructorClientService] Fetching medical updates for client:', clientId);
      
      let query = supabase
        .from('client_medical_updates')
        .select('*')
        .eq('client_id', clientId);

      if (instructorId) {
        query = query.eq('instructor_id', instructorId);
      }

      const { data, error } = await query.order('effective_date', { ascending: false });

      if (error) {
        devError('❌ [instructorClientService] Supabase error:', error);
        return { success: false, error: error.message };
      }

      // Get client name and admin name if updates exist
      let clientName = '';
      let adminNames = new Map();
      
      if (data && data.length > 0) {
        // Get client name
        const { data: user } = await supabase
          .from('users')
          .select('name')
          .eq('id', clientId)
          .single();
        clientName = user?.name || '';

        // Get admin names if any updates were verified
        const adminIds = data
          .filter(update => update.verified_by_admin)
          .map(update => update.verified_by_admin);
        
        if (adminIds.length > 0) {
          const { data: admins } = await supabase
            .from('users')
            .select('id, name')
            .in('id', adminIds);
          
          admins?.forEach(admin => {
            adminNames.set(admin.id, admin.name);
          });
        }
      }

      const formattedData = data?.map(update => ({
        ...update,
        client_name: clientName,
        admin_name: update.verified_by_admin ? adminNames.get(update.verified_by_admin) : undefined,
      })) || [];

      devLog('✅ [instructorClientService] Medical updates fetched successfully:', formattedData.length);
      return { success: true, data: formattedData };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getClientMedicalUpdates:', error);
      return { success: false, error: 'Failed to fetch medical updates' };
    }
  }

  // Auto-assign client to instructor when they book a class (called by booking service)
  async autoAssignClientToInstructor(
    clientId: string, 
    instructorId: string, 
    classId: number | string
  ): Promise<ApiResponse<InstructorClientAssignment>> {
    try {
      devLog('🔗 [instructorClientService] Auto-assigning client to instructor');
      
      // Check if assignment already exists
      const { data: existingAssignment } = await supabase
        .from('instructor_client_assignments')
        .select('id')
        .eq('client_id', clientId)
        .eq('instructor_id', instructorId)
        .eq('status', 'active')
        .single();

      if (existingAssignment) {
        devLog('✅ [instructorClientService] Assignment already exists');
        return { success: true, data: existingAssignment as InstructorClientAssignment };
      }

      // Create new assignment
      const { data, error } = await supabase
        .from('instructor_client_assignments')
        .insert({
          client_id: clientId,
          instructor_id: instructorId,
          assigned_by: 'system',
          assignment_type: 'primary',
          start_date: new Date().toISOString().split('T')[0],
          status: 'active',
          notes: `Auto-assigned from class booking (Class ID: ${classId})`
        })
        .select()
        .single();

      if (error) {
        devError('❌ [instructorClientService] Auto-assignment error:', error);
        return { success: false, error: error.message };
      }

      devLog('✅ [instructorClientService] Client auto-assigned successfully');
      return { success: true, data };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in autoAssignClientToInstructor:', error);
      return { success: false, error: 'Failed to auto-assign client' };
    }
  }

  // Manual assignment by reception/admin
  async assignClientToInstructor(
    clientId: string,
    instructorId: string,
    assignedBy: string, // Should be a UUID
    assignmentType: 'primary' | 'secondary' | 'temporary' | 'consultation' = 'primary',
    notes?: string
  ): Promise<ApiResponse<InstructorClientAssignment>> {
    try {
      devLog('👥 [instructorClientService] Manually assigning client to instructor');
      devLog('📋 Assignment details:', { clientId, instructorId, assignedBy, assignmentType });
      
      // Check if assignment already exists - use maybeSingle() to avoid 406 error
      const { data: existingAssignment, error: checkError } = await supabase
        .from('instructor_client_assignments')
        .select('id')
        .eq('client_id', clientId)
        .eq('instructor_id', instructorId)
        .eq('status', 'active')
        .maybeSingle(); // Use maybeSingle() instead of single()

      if (checkError) {
        devError('❌ [instructorClientService] Error checking existing assignment:', checkError);
        return { success: false, error: checkError.message };
      }

      if (existingAssignment) {
        return { success: false, error: 'Client is already assigned to this instructor' };
      }

      // Create new assignment
      const { data, error } = await supabase
        .from('instructor_client_assignments')
        .insert({
          client_id: clientId,
          instructor_id: instructorId,
          assigned_by: assignedBy, // Must be a valid UUID
          assignment_type: assignmentType,
          start_date: new Date().toISOString().split('T')[0],
          status: 'active',
          notes: notes || 'Manually assigned'
        })
        .select()
        .single();

      if (error) {
        devError('❌ [instructorClientService] Manual assignment error:', error);
        devError('❌ Error details:', { code: error.code, message: error.message, details: error.details });
        return { success: false, error: error.message };
      }

      devLog('✅ [instructorClientService] Client manually assigned successfully');
      return { success: true, data };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in assignClientToInstructor:', error);
      return { success: false, error: 'Failed to assign client' };
    }
  }

  // Get all clients for reception to assign to instructors
  async getAllClientsForAssignment(): Promise<ApiResponse<{id: string, name: string, email: string}[]>> {
    try {
      devLog('🔍 [instructorClientService] Fetching all clients for assignment');
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'client')
        .order('name');

      if (error) {
        devError('❌ [instructorClientService] Fetch clients error:', error);
        return { success: false, error: error.message };
      }

      devLog('✅ [instructorClientService] Clients fetched for assignment:', data?.length);
      return { success: true, data: data || [] };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getAllClientsForAssignment:', error);
      return { success: false, error: 'Failed to fetch clients' };
    }
  }

  // Get client's user profile information (medical conditions, emergency contact, etc.)
  async getClientUserProfile(clientId: string): Promise<ApiResponse<{medical_conditions?: string, emergency_contact?: string}>> {
    try {
      devLog('👤 [instructorClientService] Fetching user profile for client:', clientId);
      
      const { data, error } = await supabase
        .from('users')
        .select('medical_conditions, emergency_contact')
        .eq('id', clientId)
        .single();

      if (error) {
        devError('❌ [instructorClientService] User profile fetch error:', error);
        return { success: false, error: error.message };
      }

      devLog('✅ [instructorClientService] User profile fetched successfully');
      return { success: true, data: data || {} };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getClientUserProfile:', error);
      return { success: false, error: 'Failed to fetch user profile' };
    }
  }

  // Admin/Reception: Approve medical update and sync to user profile
  async approveMedicalUpdate(
    updateId: number, 
    approvedBy: string,
    clearanceNotes?: string
  ): Promise<ApiResponse<ClientMedicalUpdate>> {
    try {
      devLog('✅ [instructorClientService] Approving medical update:', updateId);
      
      // Get the medical update details
      const { data: medicalUpdate, error: fetchError } = await supabase
        .from('client_medical_updates')
        .select('*')
        .eq('id', updateId)
        .single();

      if (fetchError || !medicalUpdate) {
        devError('❌ [instructorClientService] Medical update not found:', fetchError);
        return { success: false, error: 'Medical update not found' };
      }

      // Update the medical update record with verification
      const { data: updatedRecord, error: updateError } = await supabase
        .from('client_medical_updates')
        .update({
          verified_by_admin: approvedBy,
          verification_date: new Date().toISOString(),
          clearance_notes: clearanceNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', updateId)
        .select()
        .single();

      if (updateError) {
        devError('❌ [instructorClientService] Medical update approval error:', updateError);
        return { success: false, error: updateError.message };
      }

      // Update the user's main profile with the approved medical conditions
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ 
          medical_conditions: medicalUpdate.updated_conditions,
          updated_at: new Date().toISOString()
        })
        .eq('id', medicalUpdate.client_id);

      if (userUpdateError) {
        devError('❌ [instructorClientService] User profile sync error:', userUpdateError);
        // Log warning but don't fail - the approval is recorded even if sync fails
        console.warn('Medical update approved but user profile sync failed:', userUpdateError);
      } else {
        devLog('✅ [instructorClientService] User profile synced with approved medical conditions');
      }

      devLog('✅ [instructorClientService] Medical update approved successfully');
      return { success: true, data: updatedRecord };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in approveMedicalUpdate:', error);
      return { success: false, error: 'Failed to approve medical update' };
    }
  }

  // Get unified medical history for a client (combines profile conditions + updates)
  async getUnifiedMedicalHistory(clientId: string): Promise<ApiResponse<{
    current_conditions: string | null,
    medical_updates: ClientMedicalUpdate[],
    last_updated: string | null
  }>> {
    try {
      devLog('🔍 [instructorClientService] Fetching unified medical history for client:', clientId);
      
      // Get current medical conditions from user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('medical_conditions, updated_at')
        .eq('id', clientId)
        .single();

      if (profileError) {
        devError('❌ [instructorClientService] User profile fetch error:', profileError);
        return { success: false, error: profileError.message };
      }

      // Get all medical updates
      const medicalUpdatesResponse = await this.getClientMedicalUpdates(clientId);
      
      if (!medicalUpdatesResponse.success) {
        return { success: false, error: medicalUpdatesResponse.error };
      }

      const unifiedHistory = {
        current_conditions: userProfile?.medical_conditions || null,
        medical_updates: medicalUpdatesResponse.data || [],
        last_updated: userProfile?.updated_at || null
      };

      devLog('✅ [instructorClientService] Unified medical history fetched successfully');
      return { success: true, data: unifiedHistory };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getUnifiedMedicalHistory:', error);
      return { success: false, error: 'Failed to fetch unified medical history' };
    }
  }

  // Unassign client from instructor
  async unassignClientFromInstructor(
    clientId: string,
    instructorId: string,
    unassignedBy: string,
    reason?: string
  ): Promise<ApiResponse<void>> {
    try {
      devLog('🔗 [instructorClientService] Unassigning client from instructor');
      
      const { error } = await supabase
        .from('instructor_client_assignments')
        .update({
          status: 'inactive',
          end_date: new Date().toISOString().split('T')[0],
          notes: reason || 'Unassigned by ' + unassignedBy
        })
        .eq('client_id', clientId)
        .eq('instructor_id', instructorId)
        .eq('status', 'active');

      if (error) {
        devError('❌ [instructorClientService] Unassign error:', error);
        return { success: false, error: error.message };
      }

      devLog('✅ [instructorClientService] Client unassigned successfully');
      return { success: true };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in unassignClientFromInstructor:', error);
      return { success: false, error: 'Failed to unassign client' };
    }
  }

  // Assign client to a specific class (instructor function)
  async assignClientToClass(
    clientId: string,
    classId: string,
    instructorId: string
  ): Promise<ApiResponse<void>> {
    try {
      devLog('📅 [instructorClientService] Assigning client to class');

      // First check if client has remaining classes
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('remaining_classes')
        .eq('id', clientId)
        .single();

      if (userError) {
        devError('❌ [instructorClientService] Error fetching user data:', userError);
        return { success: false, error: 'Failed to check client remaining classes' };
      }

      if (userData.remaining_classes <= 0) {
        return { success: false, error: 'Client has no remaining classes' };
      }

      // Check if client is already booked for this class
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', clientId)
        .eq('class_id', classId)
        .eq('status', 'confirmed')
        .single();

      if (existingBooking) {
        return { success: false, error: 'Client is already booked for this class' };
      }

      // Create the booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: clientId,
          class_id: classId,
          status: 'confirmed',
          booking_date: new Date().toISOString()
        });

      if (bookingError) {
        devError('❌ [instructorClientService] Booking error:', bookingError);
        return { success: false, error: bookingError.message };
      }

      // Decrease remaining classes
      const { error: updateError } = await supabase
        .from('users')
        .update({
          remaining_classes: userData.remaining_classes - 1
        })
        .eq('id', clientId);

      if (updateError) {
        devError('❌ [instructorClientService] Error updating remaining classes:', updateError);
        return { success: false, error: 'Failed to update remaining classes' };
      }

      devLog('✅ [instructorClientService] Client assigned to class successfully');
      return { success: true };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in assignClientToClass:', error);
      return { success: false, error: 'Failed to assign client to class' };
    }
  }

  // Unassign client from a specific class (instructor function)
  async unassignClientFromClass(
    clientId: string,
    classId: string,
    instructorId: string
  ): Promise<ApiResponse<void>> {
    try {
      devLog('📅 [instructorClientService] Unassigning client from class');

      // Get the booking to make sure it exists
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', clientId)
        .eq('class_id', classId)
        .eq('status', 'confirmed')
        .single();

      if (bookingError || !booking) {
        return { success: false, error: 'Client is not booked for this class' };
      }

      // Cancel the booking
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled'
        })
        .eq('id', booking.id);

      if (cancelError) {
        devError('❌ [instructorClientService] Cancel booking error:', cancelError);
        return { success: false, error: cancelError.message };
      }

      // Restore remaining classes
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('remaining_classes')
        .eq('id', clientId)
        .single();

      if (userData && !userError) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            remaining_classes: userData.remaining_classes + 1
          })
          .eq('id', clientId);

        if (updateError) {
          devError('❌ [instructorClientService] Error restoring remaining classes:', updateError);
        }
      }

      // 🚨 CRITICAL FIX: Handle waitlist promotion for instructor cancellations
      devLog('🎯 [INSTRUCTOR_CANCEL] Starting waitlist promotion check for class', classId);
      
      // Import booking service to use waitlist promotion
      const { bookingService } = await import('./bookingService');
      const waitlistPromoted = await bookingService.promoteFromWaitlist(classId);
      
      devLog(`🎯 [INSTRUCTOR_CANCEL] Waitlist promotion result: ${waitlistPromoted ? 'SUCCESS' : 'NO_PROMOTION'}`);

      devLog('✅ [instructorClientService] Client unassigned from class successfully');
      return { success: true, data: { waitlistPromoted } };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in unassignClientFromClass:', error);
      return { success: false, error: 'Failed to unassign client from class' };
    }
  }

  // Get available classes for instructor to assign clients to
  async getInstructorClasses(instructorId: string): Promise<ApiResponse<any[]>> {
    try {
      devLog('📅 [instructorClientService] Fetching instructor classes');

      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          date,
          time,
          duration,
          capacity,
          status
        `)
        .eq('instructor_id', instructorId)
        .eq('status', 'active')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        devError('❌ [instructorClientService] Error fetching instructor classes:', error);
        return { success: false, error: error.message };
      }

      devLog('✅ [instructorClientService] Instructor classes fetched:', data?.length);
      return { success: true, data: data || [] };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getInstructorClasses:', error);
      return { success: false, error: 'Failed to fetch instructor classes' };
    }
  }
}

export const instructorClientService = new InstructorClientService();