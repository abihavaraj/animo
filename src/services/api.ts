import { getApiUrl } from '../config/api.config';
import { createTimeoutSignal, devLog } from '../utils/devUtils';
import { handleNetworkError } from '../utils/errorHandler';

// API Configuration and Base Service
const API_BASE_URL = getApiUrl();

devLog('API Service initialized with:', API_BASE_URL);

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
    
    if (Math.random() < 0.1) {
      devLog(`📡 ${options.method || 'GET'} ${endpoint}`);
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      // Add timeout and better error handling for iOS
      signal: createTimeoutSignal(30000), // 30 second timeout
    };

    try {
      const response = await fetch(url, config);
      
      // Safely check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorMessage = `Server returned non-JSON response: ${response.status} ${response.statusText}`;
        console.error(`❌ Non-JSON response from ${endpoint}:`, response.status, response.statusText);
        handleNetworkError(new Error(errorMessage), endpoint);
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      // Safely parse JSON response
      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        const errorMessage = 'Failed to parse server response as JSON';
        console.error(`❌ JSON parse error for ${endpoint}:`, parseError);
        handleNetworkError(parseError as Error, endpoint);
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      if (!response.ok) {
        const errorMessage = data.message || data.error || response.statusText;
        console.error(`❌ API Error (${response.status}) for ${endpoint}:`, errorMessage);
        
        // Handle specific error cases
        if (response.status === 401) {
          console.warn('🔑 Authentication failed - token may be expired');
          // Could trigger logout here if needed
        } else if (response.status >= 500) {
          console.error('🔥 Server error detected');
        }
        
        // Use network error handler for non-success responses
        handleNetworkError(new Error(`HTTP ${response.status}: ${errorMessage}`), endpoint);
        
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      // Handle backend response format: {success: true, data: [...]}
      if (data.success !== undefined && 'data' in data) {
        return data as ApiResponse<T>;
      }
      
      // Handle direct data response
      return {
        success: true,
        data: data as T,
      };
      
    } catch (error: any) {
      console.error(`❌ Network error for ${endpoint}:`, error);
      
      // Enhanced error handling for different error types
      let errorMessage = 'Network request failed';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - please check your connection';
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'No internet connection - please check your network';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Use network error handler
      handleNetworkError(error, endpoint);
      
      return {
        success: false,
        error: errorMessage,
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

