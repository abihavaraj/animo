import { ApiResponse, apiService } from './api';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'client' | 'instructor' | 'admin' | 'reception';
  phone?: string;
  emergency_contact?: string;
  medical_conditions?: string;
  referral_source?: string;
  join_date?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  
  // Legacy fields for backward compatibility
  emergencyContact?: string;
  medicalConditions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  emergencyContact?: string;
  medicalConditions?: string;
  referralSource?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  emergencyContact?: string;
  medicalConditions?: string;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiService.post<any>('/auth/login', credentials);
    
    // Check if the response has nested data structure from backend
    if (response.success && response.data) {
      // Handle case where backend returns { data: { user, token } } directly
      if (response.data.user && response.data.token) {
        return {
          success: true,
          data: {
            user: response.data.user,
            token: response.data.token
          }
        };
      }
      
      // Handle case where backend returns { data: { data: { user, token } } }
      if (response.data.data && response.data.data.user && response.data.data.token) {
        return {
          success: true,
          data: {
            user: response.data.data.user,
            token: response.data.data.token
          }
        };
      }
    }
    
    return response;
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<LoginResponse>('/auth/register', userData);
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/auth/me');
  }

  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<User>> {
    const response = await apiService.put<any>('/auth/profile', data);
    
    // Handle nested response structure from backend
    if (response.success && response.data) {
      // Backend returns { data: { user: updatedUser } }
      if (response.data.user) {
        return {
          success: true,
          data: response.data.user
        };
      }
    }
    
    return response;
  }

  setToken(token: string | null) {
    apiService.setToken(token);
  }
}

export const authService = new AuthService(); 