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
  // Subscription data
  user_subscriptions?: Array<{
    id: string;
    remaining_classes: number;
    start_date: string;
    end_date: string;
    status: string;
    subscription_plans?: {
      name: string;
      monthly_classes: number;
    };
  }>;
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
  // Get all clients assigned to an instructor (manual assignments only - auto-assignment disabled)
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

      devLog('📋 [instructorClientService] Found all assignments:', manualAssignments?.length || 0);
      
      // Debug: Log assignment details to identify auto-assigned vs manual
      if (manualAssignments && manualAssignments.length > 0) {
        manualAssignments.forEach(assignment => {
          devLog('📝 Assignment details:', {
            id: assignment.id,
            client_id: assignment.client_id,
            assigned_by: assignment.assigned_by,
            assignment_type: assignment.assignment_type,
            notes: assignment.notes
          });
        });
      }

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
          
          // Fetch subscription data separately - only active subscriptions
          if (manualAssignmentUsers.length > 0) {
            const { data: subscriptionData, error: subscriptionError } = await supabase
              .from('user_subscriptions')
              .select(`
                user_id,
                id,
                remaining_classes,
                start_date,
                end_date,
                status,
                subscription_plans (
                  name,
                  monthly_classes
                )
              `)
              .in('user_id', manualClientIds)
              .eq('status', 'active'); // Only active subscriptions
            
            if (!subscriptionError && subscriptionData) {
              // Map subscription data to users
              manualAssignmentUsers = manualAssignmentUsers.map(user => {
                const userSubs = subscriptionData.filter(sub => sub.user_id === user.id);
                
                // Debug log for specific user
                if (user.name?.toLowerCase().includes('argjend')) {
                  devLog('🔍 [DEBUG] Subscriptions found for', user.name, userSubs);
                }
                
                return {
                  ...user,
                  user_subscriptions: userSubs
                };
              });
            }
          }
        }
      }

      // AUTO-ASSIGNMENT COMPLETELY DISABLED
      // The following auto-assignment logic has been permanently disabled.
      // Clients will ONLY show if manually assigned by reception via instructor_client_assignments table.
      // 
      // Previously, this code would auto-create virtual assignments for clients who booked
      // personal classes, but this caused confusion and is no longer needed.
      
      /*
      // OLD AUTO-ASSIGNMENT LOGIC (DISABLED):
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
              // Fetch subscription data for auto-assigned clients - only active subscriptions
              const { data: autoSubscriptionData, error: autoSubscriptionError } = await supabase
                .from('user_subscriptions')
                .select(`
                  user_id,
                  id,
                  remaining_classes,
                  start_date,
                  end_date,
                  status,
                  subscription_plans (
                    name,
                    monthly_classes
                  )
                `)
                .in('user_id', autoOnlyClientIds)
                .eq('status', 'active'); // Only active subscriptions
              
              // Map subscription data to users
              const autoUsersWithSubscriptions = autoUsers.map(user => ({
                ...user,
                user_subscriptions: autoSubscriptionData?.filter(sub => sub.user_id === user.id) || []
              }));
              
              autoAssignedClients = autoUsersWithSubscriptions.map(user => {
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
                  user_subscriptions: user.user_subscriptions || [],
                };
              });
            }
          }
        }
      }
      */

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
          user_subscriptions: userInfo?.user_subscriptions || [],
        };
      }) || [];

      // Since auto-assignment is disabled, autoAssignedClients is always empty
      // Only return real database assignments (formattedManualAssignments)
      const allClients = formattedManualAssignments;

      devLog('✅ [instructorClientService] Total clients fetched:', allClients.length);
      devLog('📋 Manual assignments (all from database):', allClients.length);
      devLog('🤖 Auto assignments: DISABLED');
      
      // Log each client for debugging
      allClients.forEach(client => {
        devLog(`   - ${client.client_name} (assignment_id: ${client.id}, assigned_by: ${client.assigned_by}, type: ${client.assignment_type})`);
      });
      
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
    file: File | { uri: string; name: string; type: string; size?: number },
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
      // Upload the file to Supabase storage
      let uploadFile: any = file;
      if ('uri' in file) {
        // For React Native files, convert to proper format
        uploadFile = {
          uri: file.uri,
          name: file.name,
          type: file.type
        };
      }
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(fileName, uploadFile);
      
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
          file_size: ('size' in file ? file.size : 0) || 0,
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

  // Auto-assignment has been disabled - clients must be manually assigned by reception

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
      
      // Check if any assignment already exists (active or inactive)
      const { data: existingAssignments, error: checkError } = await supabase
        .from('instructor_client_assignments')
        .select('id, status')
        .eq('client_id', clientId)
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false }); // Get the most recent

      if (checkError) {
        devError('❌ [instructorClientService] Error checking existing assignment:', checkError);
        return { success: false, error: checkError.message };
      }

      if (existingAssignments && existingAssignments.length > 0) {
        const latestAssignment = existingAssignments[0];
        
        if (latestAssignment.status === 'active') {
          return { success: false, error: 'Client is already assigned to this instructor' };
        } else if (latestAssignment.status === 'inactive') {
          // Reactivate the existing assignment instead of creating a new one
          devLog('🔄 [instructorClientService] Reactivating existing inactive assignment');
          const { data, error } = await supabase
            .from('instructor_client_assignments')
            .update({
              status: 'active',
              start_date: new Date().toISOString().split('T')[0],
              end_date: null,
              assigned_by: assignedBy,
              assignment_type: assignmentType,
              notes: notes || 'Manually reassigned'
            })
            .eq('id', latestAssignment.id)
            .select()
            .single();

          if (error) {
            devError('❌ [instructorClientService] Error reactivating assignment:', error);
            return { success: false, error: error.message };
          }

          devLog('✅ [instructorClientService] Assignment reactivated successfully');
          return { success: true, data };
        }
      }

      // Create new assignment if none exists
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

  // Get current instructor assignment for a client
  async getClientCurrentInstructor(clientId: string): Promise<ApiResponse<{id: string, name: string, assignment_id: string} | null>> {
    try {
      devLog('🔍 [instructorClientService] Getting current instructor for client:', clientId);
      
      // First get the assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('instructor_client_assignments')
        .select('id, instructor_id')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (assignmentError) {
        devError('❌ [instructorClientService] Error getting assignment:', assignmentError);
        return { success: false, error: assignmentError.message };
      }
      
      if (!assignment) {
        devLog('ℹ️ [instructorClientService] No active instructor assignment found');
        return { success: true, data: null };
      }
      
      // Then get the instructor name
      const { data: instructor, error: instructorError } = await supabase
        .from('users')
        .select('name')
        .eq('id', assignment.instructor_id)
        .single();
      
      if (instructorError) {
        devError('❌ [instructorClientService] Error getting instructor name:', instructorError);
        // Still return the assignment but with unknown name
        const result = {
          id: assignment.instructor_id,
          name: 'Unknown Instructor',
          assignment_id: assignment.id
        };
        return { success: true, data: result };
      }
      
      const result = {
        id: assignment.instructor_id,
        name: instructor?.name || 'Unknown Instructor',
        assignment_id: assignment.id
      };
      
      devLog('✅ [instructorClientService] Current instructor found:', result);
      return { success: true, data: result };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getClientCurrentInstructor:', error);
      return { success: false, error: 'Failed to get current instructor' };
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

  // Get only instructor's assigned clients for assignment
  async getInstructorClientsForAssignment(instructorId: string): Promise<ApiResponse<{id: string, name: string, email: string}[]>> {
    try {
      devLog('🔍 [instructorClientService] Fetching instructor assigned clients for assignment');
      
      // First get the assignment records
      const { data: assignments, error: assignmentError } = await supabase
        .from('instructor_client_assignments')
        .select('client_id')
        .eq('instructor_id', instructorId)
        .eq('status', 'active');
      
      if (assignmentError) {
        devError('❌ [instructorClientService] Error fetching assignments:', assignmentError);
        return { success: false, error: 'Failed to fetch instructor client assignments' };
      }
      
      if (!assignments || assignments.length === 0) {
        devLog('ℹ️ [instructorClientService] No client assignments found for instructor');
        return { success: true, data: [] };
      }
      
      // Extract client IDs
      const clientIds = assignments.map(assignment => assignment.client_id);
      
      // Now get the user details for these clients
      const { data: clients, error: clientError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', clientIds)
        .eq('status', 'active')
        .eq('role', 'client')
        .order('name', { ascending: true });
      
      if (clientError) {
        devError('❌ [instructorClientService] Error fetching client details:', clientError);
        return { success: false, error: 'Failed to fetch client details' };
      }
      
      devLog('✅ [instructorClientService] Instructor clients fetched for assignment:', clients?.length || 0);
      return { success: true, data: clients || [] };
      
    } catch (error) {
      devError('❌ [instructorClientService] Exception in getInstructorClientsForAssignment:', error);
      return { success: false, error: 'Failed to fetch instructor clients for assignment' };
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

  // Check if client is already booked for a class
  async isClientBookedForClass(clientId: string, classId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', clientId)
        .eq('class_id', classId)
        .in('status', ['confirmed', 'waitlist']);

      if (error) {
        devError('❌ [instructorClientService] Error checking booking status:', error);
        return { success: false, error: 'Failed to check booking status' };
      }

      return { success: true, data: bookings && bookings.length > 0 };
    } catch (error) {
      devError('❌ [instructorClientService] Exception in isClientBookedForClass:', error);
      return { success: false, error: 'Failed to check booking status' };
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

      // Get class details to check the class date
      const { data: classDetails, error: classError } = await supabase
        .from('classes')
        .select('id, date')
        .eq('id', classId)
        .single();

      if (classError || !classDetails) {
        devError('❌ [instructorClientService] Error fetching class:', classError);
        return { success: false, error: 'Class not found' };
      }

      // First check if client has remaining classes in their active subscription
      const { data: subscriptionsData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('id, remaining_classes, end_date')
        .eq('user_id', clientId)
        .eq('status', 'active')
        .order('end_date', { ascending: false }); // Get the latest subscription first

      if (subscriptionError) {
        devError('❌ [instructorClientService] Error fetching subscription data:', subscriptionError);
        return { success: false, error: 'Failed to check client subscription. Client may not have an active subscription.' };
      }

      if (!subscriptionsData || subscriptionsData.length === 0) {
        return { success: false, error: 'Client has no active subscription' };
      }

      // Get the subscription with the latest end date that hasn't expired
      const activeSubscription = subscriptionsData.find(sub => {
        const endDate = new Date(sub.end_date);
        const now = new Date();
        const timeDiff = endDate.getTime() - now.getTime();
        const daysUntilEnd = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        return daysUntilEnd >= 0; // Not expired
      });

      if (!activeSubscription) {
        return { success: false, error: 'Client has no valid active subscription' };
      }

      if (activeSubscription.remaining_classes <= 0) {
        return { success: false, error: 'Client has no remaining classes in their subscription' };
      }

      // Check if class date is within subscription period
      if (activeSubscription.end_date && classDetails.date) {
        const subscriptionEndDate = activeSubscription.end_date; // Format: "2025-10-06"
        const classDate = classDetails.date; // Format: "2025-10-07"
        
        // Class date must be on or before subscription end date
        if (classDate > subscriptionEndDate) {
          return { 
            success: false, 
            error: `This class is scheduled for ${classDate}, but the client's subscription expires on ${subscriptionEndDate}. Please renew the subscription first.` 
          };
        }
      }

      // Check if client is already booked for this class
      const { data: existingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', clientId)
        .eq('class_id', classId)
        .in('status', ['confirmed', 'waitlist']);

      if (checkError) {
        devError('❌ [instructorClientService] Error checking existing booking:', checkError);
        return { success: false, error: 'Failed to check existing booking' };
      }

      if (existingBookings && existingBookings.length > 0) {
        return { success: false, error: 'Client is already booked for this class' };
      }

      // Create the booking with subscription_id to track it was a normal assignment
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: clientId,
          class_id: classId,
          status: 'confirmed',
          booking_date: new Date().toISOString(),
          subscription_id: activeSubscription.id  // Track which subscription was used
        });

      if (bookingError) {
        devError('❌ [instructorClientService] Booking error:', bookingError);
        return { success: false, error: bookingError.message };
      }

      // Decrease remaining classes in the specific active subscription
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          remaining_classes: activeSubscription.remaining_classes - 1
        })
        .eq('id', activeSubscription.id);

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
  ): Promise<ApiResponse<{ waitlistPromoted?: boolean }>> {
    try {
      devLog('📅 [instructorClientService] Unassigning client from class');

      // Get the booking to make sure it exists
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, subscription_id')
        .eq('user_id', clientId)
        .eq('class_id', classId)
        .in('status', ['confirmed', 'waitlist']);

      if (bookingError) {
        devError('❌ [instructorClientService] Error fetching booking:', bookingError);
        return { success: false, error: 'Failed to check booking status' };
      }

      if (!bookings || bookings.length === 0) {
        return { success: false, error: 'Client is not booked for this class' };
      }

      const booking = bookings[0]; // Get the first booking

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

      // Check if this was an override assignment (don't restore credits)
      // Normal assignments have subscription_id (used subscription credits)
      // Override assignments have subscription_id = null (no subscription used)
      const wasOverrideAssignment = !booking.subscription_id;
      
      devLog('🔍 [instructorClientService] Assignment type check:', {
        subscriptionId: booking.subscription_id,
        wasOverrideAssignment,
        willRestoreCredits: !wasOverrideAssignment
      });
      
      if (!wasOverrideAssignment) {
        devLog('🔄 [instructorClientService] Normal assignment detected - restoring credits');
        // Find the active subscription to restore credits
        const { data: subscriptionsData, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('id, remaining_classes, end_date')
          .eq('user_id', clientId)
          .eq('status', 'active')
          .order('end_date', { ascending: false });

        if (!subscriptionError && subscriptionsData && subscriptionsData.length > 0) {
          // Get the subscription with the latest end date that hasn't expired
          const activeSubscription = subscriptionsData.find(sub => {
            const endDate = new Date(sub.end_date);
            const now = new Date();
            const timeDiff = endDate.getTime() - now.getTime();
            const daysUntilEnd = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            return daysUntilEnd >= 0;
          });

          if (activeSubscription) {
            const { error: updateError } = await supabase
              .from('user_subscriptions')
              .update({
                remaining_classes: activeSubscription.remaining_classes + 1
              })
              .eq('id', activeSubscription.id);

            if (updateError) {
              devError('❌ [instructorClientService] Error restoring remaining classes:', updateError);
            } else {
              devLog('✅ [instructorClientService] Package credits restored (+1)');
            }
          }
        }
      } else {
        devLog('ℹ️ [instructorClientService] Override assignment - no credits restored');
      }

      // 🚨 CRITICAL FIX: Handle waitlist promotion for instructor cancellations
      devLog('🎯 [INSTRUCTOR_CANCEL] Starting waitlist promotion check for class', classId);
      
      // Try to promote from waitlist (if available)
      let waitlistPromoted = false;
      try {
        const { bookingService } = await import('./bookingService');
        // Instead of accessing private method, we'll handle waitlist promotion differently
        // For now, we'll just indicate that the unassignment was successful
        waitlistPromoted = false; // Placeholder - would need public waitlist promotion method
      } catch (error) {
        devLog('⚠️ [INSTRUCTOR_CANCEL] Could not attempt waitlist promotion:', error);
      }
      
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