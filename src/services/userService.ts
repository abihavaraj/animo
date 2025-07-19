import { ApiResponse, apiService } from './api';

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'instructor' | 'admin' | 'reception';
  emergency_contact?: string;
  medical_conditions?: string;
  referral_source?: string;
  join_date: string;
  status: 'active' | 'inactive' | 'suspended' | 'archived';
  created_at: string;
  currentSubscription?: any;
  credit_balance?: number;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'client' | 'instructor' | 'admin' | 'reception';
  emergencyContact?: string;
  medicalConditions?: string;
  initialCreditBalance?: number;
  referralSource?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'client' | 'instructor' | 'admin' | 'reception';
  status?: 'active' | 'inactive' | 'suspended' | 'archived';
  emergencyContact?: string;
  medicalConditions?: string;
}

export interface UpdatePasswordRequest {
  newPassword: string;
}

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
}

class UserService {
  async getUsers(filters?: UserFilters): Promise<ApiResponse<BackendUser[]>> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<BackendUser[]>(endpoint);
  }

  async getUser(userId: number): Promise<ApiResponse<BackendUser>> {
    return apiService.get<BackendUser>(`/users/${userId}`);
  }

  async getInstructors(): Promise<ApiResponse<BackendUser[]>> {
    return this.getUsers({ role: 'instructor' });
  }

  async createUser(userData: CreateUserRequest): Promise<ApiResponse<BackendUser>> {
    return apiService.post<BackendUser>('/users', userData);
  }

  async updateUser(id: number, userData: UpdateUserRequest): Promise<ApiResponse<BackendUser>> {
    return apiService.put<BackendUser>(`/users/${id}`, userData);
  }

  async updatePassword(id: number, passwordData: UpdatePasswordRequest): Promise<ApiResponse<void>> {
    return apiService.put<void>(`/users/${id}/password`, passwordData);
  }

  async deleteUser(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/users/${id}`);
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/users/stats');
  }
}

export const userService = new UserService();