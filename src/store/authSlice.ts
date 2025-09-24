import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authService, LoginRequest, RegisterRequest, UpdateProfileRequest, UserProfile } from '../services/authService';
import { devLog } from '../utils/devUtils';

export interface User extends UserProfile {}

// Export UserRole type
export type UserRole = 'client' | 'instructor' | 'admin' | 'reception' | 'prospect';

interface AuthState {
  isLoading: boolean;
  isProfileLoading: boolean;
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
  error: string | null;
}

const initialState: AuthState = {
  isLoading: false,
  isProfileLoading: false,
  isLoggedIn: false,
  user: null,
  token: null,
  error: null,
};

// Login user
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    const response = await authService.login(credentials.emailOrPhone, credentials.password);
    
    if (!response.success) {
      return rejectWithValue(response.error || 'Login failed');
    }
    
    return response.data!;
  }
);

// Register user
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    const response = await authService.register(userData);
    
    if (!response.success) {
      return rejectWithValue(response.error || 'Registration failed');
    }
    
    return response.data!;
  }
);

// Restore session on app startup (automatic session restoration)
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    devLog('🔄 [authSlice] Attempting to restore session on app startup');
    
    const response = await authService.restoreSession();
    
    if (!response.success) {
      return rejectWithValue(response.error || 'Session restore failed');
    }
    
    // Return session data or null if no session
    return response.data;
  }
);

// Load user profile
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

// Logout user
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    const response = await authService.logout();
    
    if (!response.success) {
      return rejectWithValue(response.error || 'Logout failed');
    }
    
    return null;
  }
);

// Logout user with credential saving
export const logoutUserWithCredentialSave = createAsyncThunk(
  'auth/logoutWithCredentialSave',
  async (_, { rejectWithValue }) => {
    try {
      const { credentialsService } = await import('../services/credentialsService');
      
      // Get current session credentials
      const sessionCredentials = await credentialsService.getCurrentSessionCredentials();
      
      // Save credentials before logging out if user has opted to save passwords
      if (sessionCredentials) {
        const shouldSave = await credentialsService.getSavePasswordPreference();
        if (shouldSave) {
          await credentialsService.saveCredentials(sessionCredentials);
        }
      }
      
      // Clear current session credentials
      await credentialsService.clearCurrentSessionCredentials();
      
      // Proceed with normal logout
      const response = await authService.logout();
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Logout failed');
      }
      
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

// Update user profile
export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: UpdateProfileRequest, { rejectWithValue }) => {
    const response = await authService.updateProfile(profileData);
    
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to update profile');
    }
    
    return response.data!;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Mark app as ready (splash screen handling)
    authReady: (state) => {
      state.isLoading = false;
      state.isProfileLoading = false;
    },
    // Set profile loading state
    setProfileLoading: (state, action: PayloadAction<boolean>) => {
      state.isProfileLoading = action.payload;
    },
    // Set credentials (for manual login or session restore)
    setCredentials: (state, action: PayloadAction<{ user: UserProfile; token: string }>) => {
      const { user, token } = action.payload;
      state.isLoggedIn = true;
      state.user = user;
      state.token = token;
      state.error = null;
      state.isLoading = false;
      state.isProfileLoading = false;
      
      // Ensure authService has the token
      authService.setToken(token);
      
      // Send welcome notification if user is a client and this is first login after subscription
      if (user.role === 'client') {
        import('../services/notificationService').then(({ notificationService }) => {
          notificationService.sendWelcomeNotificationIfNeeded(user.id, user.name);
        }).catch(error => {
          console.error('Error checking welcome notification:', error);
        });
      }
    },
    // Clear error message
    clearError: (state) => {
      state.error = null;
    },
    // Clear all auth state (used for logout)
    clearAuth: (state) => {
      state.isLoggedIn = false;
      state.user = null;
      state.token = null;
      state.error = null;
      state.isLoading = false;
      state.isProfileLoading = false;
    },
  },
  extraReducers: (builder) => {
    // Session restoration
    builder
      .addCase(restoreSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (action.payload) {
          // Session restored successfully
          state.isLoggedIn = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          devLog('✅ [authSlice] Session restored successfully');
        } else {
          // No session found - show login screen
          state.isLoggedIn = false;
          state.user = null;
          state.token = null;
          devLog('ℹ️ [authSlice] No session to restore - showing login');
        }
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoggedIn = false;
        state.user = null;
        state.token = null;
        state.error = action.payload as string;
        devLog('❌ [authSlice] Session restore failed - showing login');
      });

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
        devLog('✅ [authSlice] Login successful');
        
        // Send welcome notification if user is a client and this is first login after subscription
        if (action.payload.user.role === 'client') {
          import('../services/notificationService').then(({ notificationService }) => {
            notificationService.sendWelcomeNotificationIfNeeded(action.payload.user.id, action.payload.user.name);
          }).catch(error => {
            console.error('Error checking welcome notification:', error);
          });
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        devLog('❌ [authSlice] Login failed:', action.payload);
      });

    // Profile loading
    builder
      .addCase(loadUserProfile.pending, (state) => {
        state.isProfileLoading = true;
      })
      .addCase(loadUserProfile.fulfilled, (state, action) => {
        state.isProfileLoading = false;
        state.user = action.payload;
      })
      .addCase(loadUserProfile.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.isLoggedIn = false;
        state.user = null;
        state.token = null;
        state.error = null;
        state.isProfileLoading = false;
        devLog('✅ [authSlice] Logout successful');
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        // Even if logout request fails, clear local auth state
        state.isLoggedIn = false;
        state.user = null;
        state.token = null;
        state.error = null;
        state.isProfileLoading = false;
        devLog('⚠️ [authSlice] Logout request failed but cleared local state');
      });

    // Logout with credential save
    builder
      .addCase(logoutUserWithCredentialSave.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUserWithCredentialSave.fulfilled, (state) => {
        state.isLoading = false;
        state.isLoggedIn = false;
        state.user = null;
        state.token = null;
        state.error = null;
        state.isProfileLoading = false;
        devLog('✅ [authSlice] Logout with credential save successful');
      })
      .addCase(logoutUserWithCredentialSave.rejected, (state, action) => {
        state.isLoading = false;
        // Even if logout request fails, clear local auth state
        state.isLoggedIn = false;
        state.user = null;
        state.token = null;
        state.error = null;
        state.isProfileLoading = false;
        devLog('⚠️ [authSlice] Logout with credential save failed but cleared local state');
      });

    // Update profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isProfileLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isProfileLoading = false;
        state.user = action.payload;
        state.error = null;
        devLog('✅ [authSlice] Profile updated successfully');
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.error = action.payload as string;
        devLog('❌ [authSlice] Profile update failed:', action.payload);
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
        devLog('✅ [authSlice] Registration successful');
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        devLog('❌ [authSlice] Registration failed:', action.payload);
      });
  },
});

export const {
  authReady,
  setProfileLoading,
  setCredentials,
  clearError,
  clearAuth,
} = authSlice.actions;

// Export logoutUser as logout for backwards compatibility
export const logout = logoutUser;

export default authSlice.reducer; 