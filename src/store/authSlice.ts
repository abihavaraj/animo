import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authService, LoginRequest, RegisterRequest, UpdateProfileRequest, User } from '../services/authService';
import { devError, devLog } from '../utils/devUtils';

export type UserRole = 'client' | 'instructor' | 'admin' | 'reception';

interface AuthState {
  isLoading: boolean;
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
  error: string | null;
}

const initialState: AuthState = {
  isLoading: false,
  isLoggedIn: false,
  user: null,
  token: null,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    const response = await authService.login(credentials);
    
    if (!response.success) {
      return rejectWithValue(response.error || 'Login failed');
    }
    
    // Set token for future requests - only set it once here
    authService.setToken(response.data!.token);
    
    return response.data!;
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    const response = await authService.register(userData);
    if (!response.success) {
      return rejectWithValue(response.error || 'Registration failed');
    }
    
    // Set token for future requests - only set it once here
    authService.setToken(response.data!.token);
    
    return response.data!;
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: UpdateProfileRequest, { rejectWithValue }) => {
    const response = await authService.updateProfile(userData);
    if (!response.success) {
      return rejectWithValue(response.error || 'Profile update failed');
    }
    
    return response.data!;
  }
);

export const loadUserProfile = createAsyncThunk(
  'auth/loadProfile',
  async (_, { rejectWithValue }) => {
    const response = await authService.getProfile();
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to load profile');
    }
    
    return response.data!;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      devLog('🚪 Logging out user');
      
      // Use a more direct approach to reset state
      state.isLoggedIn = false;
      state.user = null;
      state.token = null;
      state.error = null;
      state.isLoading = false;
      
      // Clear tokens from services - wrap in try-catch to prevent errors
      try {
        authService.setToken(null);
      } catch (error) {
        devError('Error clearing auth token:', error);
      }
    },
    // Action to reset all app state when logging out
    resetAppState: () => {
      // This will be handled by extraReducers in other slices
      return initialState;
    },
    clearError: (state) => {
      state.error = null;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      // Only sync with services if not already set
      authService.setToken(action.payload);
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoggedIn = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
        // Token is already set in the async thunk, no need to set again
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoggedIn = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
        // Token is already set in the async thunk, no need to set again
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Load Profile
    builder
      .addCase(loadUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loadUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, resetAppState, clearError, setToken } = authSlice.actions;
export default authSlice.reducer; 