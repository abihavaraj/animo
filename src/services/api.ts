import { getApiUrl } from '../config/api.config';

// API Configuration and Base Service
const API_BASE_URL = getApiUrl();

if (__DEV__) {
  console.log('API Service initialized with:', API_BASE_URL);
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    if (__DEV__ && Math.random() < 0.1) {
      console.log(`📡 ${options.method || 'GET'} ${endpoint}`);
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        if (__DEV__) {
          console.error(`❌ API Error (${response.status}):`, data.message || response.statusText);
        }
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
      // Handle backend response format: {success: true, data: [...]}
      if (data.success !== undefined && 'data' in data) {
        return {
          success: true,
          data: data.data,
        };
      }
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      if (__DEV__) {
        console.error(`🚫 Network Error for ${endpoint}:`, error instanceof Error ? error.message : 'Unknown error');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService(API_BASE_URL);
export type { ApiResponse };

