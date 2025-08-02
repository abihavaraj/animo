import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  CreatePlanRequest,
  PurchaseSubscriptionRequest,
  SubscriptionPlan,
  subscriptionService,
  UpdatePlanRequest,
  UserSubscription
} from '../services/subscriptionService';

interface SubscriptionState {
  plans: SubscriptionPlan[];
  userSubscriptions: UserSubscription[];
  currentSubscription: UserSubscription | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  plans: [],
  userSubscriptions: [],
  currentSubscription: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchPlans = createAsyncThunk(
  'subscriptions/fetchPlans',
  async (_, { rejectWithValue }) => {
    const response = await subscriptionService.getPlans();
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch plans');
    }
    return response.data!;
  }
);

export const createPlan = createAsyncThunk(
  'subscriptions/createPlan',
  async (planData: CreatePlanRequest, { rejectWithValue }) => {
    const response = await subscriptionService.createPlan(planData);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to create plan');
    }
    return response.data!;
  }
);

export const updatePlan = createAsyncThunk(
  'subscriptions/updatePlan',
  async ({ id, planData }: { id: number; planData: UpdatePlanRequest }, { rejectWithValue }) => {
    const response = await subscriptionService.updatePlan(id, planData);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to update plan');
    }
    return response.data!;
  }
);

export const deletePlan = createAsyncThunk(
  'subscriptions/deletePlan',
  async (id: number, { rejectWithValue }) => {
    const response = await subscriptionService.deletePlan(id);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to delete plan');
    }
    return id;
  }
);

export const fetchUserSubscriptions = createAsyncThunk(
  'subscriptions/fetchUserSubscriptions',
  async (_, { rejectWithValue }) => {
    const response = await subscriptionService.getUserSubscriptions();
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch subscriptions');
    }
    return response.data!;
  }
);

export const fetchCurrentSubscription = createAsyncThunk(
  'subscriptions/fetchCurrentSubscription',
  async (_, { rejectWithValue }) => {
    const response = await subscriptionService.getCurrentSubscription();
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch current subscription');
    }
    // Return null if there's no subscription data (this is normal for new users)
    return response.data || null;
  }
);

export const purchaseSubscription = createAsyncThunk(
  'subscriptions/purchaseSubscription',
  async (data: PurchaseSubscriptionRequest, { rejectWithValue }) => {
    const response = await subscriptionService.purchaseSubscription(data);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to purchase subscription');
    }
    return response.data!;
  }
);

export const cancelSubscription = createAsyncThunk(
  'subscriptions/cancelSubscription',
  async (id: number, { rejectWithValue }) => {
    const response = await subscriptionService.cancelSubscription(id);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to cancel subscription');
    }
    return response.data!;
  }
);

export const renewSubscription = createAsyncThunk(
  'subscriptions/renewSubscription',
  async (id: number, { rejectWithValue }) => {
    const response = await subscriptionService.renewSubscription(id);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to renew subscription');
    }
    return response.data!;
  }
);

const subscriptionSlice = createSlice({
  name: 'subscriptions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Plans
    builder
      .addCase(fetchPlans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plans = action.payload;
        state.error = null;
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Plan
    builder
      .addCase(createPlan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPlan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plans.push(action.payload);
        state.error = null;
      })
      .addCase(createPlan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Plan
    builder
      .addCase(updatePlan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePlan.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.plans.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.plans[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updatePlan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Plan
    builder
      .addCase(deletePlan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plans = state.plans.filter(p => p.id !== action.payload);
        state.error = null;
      })
      .addCase(deletePlan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch User Subscriptions
    builder
      .addCase(fetchUserSubscriptions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserSubscriptions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userSubscriptions = action.payload;
        state.error = null;
      })
      .addCase(fetchUserSubscriptions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Current Subscription
    builder
      .addCase(fetchCurrentSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSubscription = action.payload;
        state.error = null;
      })
      .addCase(fetchCurrentSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Purchase Subscription
    builder
      .addCase(purchaseSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(purchaseSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userSubscriptions.push(action.payload);
        state.currentSubscription = action.payload;
        state.error = null;
      })
      .addCase(purchaseSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel Subscription
    builder
      .addCase(cancelSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.userSubscriptions.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.userSubscriptions[index] = action.payload;
        }
        if (state.currentSubscription && state.currentSubscription.id === action.payload.id) {
          state.currentSubscription = action.payload;
        }
        state.error = null;
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Renew Subscription
    builder
      .addCase(renewSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(renewSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.userSubscriptions.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.userSubscriptions[index] = action.payload;
        }
        if (state.currentSubscription && state.currentSubscription.id === action.payload.id) {
          state.currentSubscription = action.payload;
        }
        state.error = null;
      })
      .addCase(renewSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle logout by resetting state - MUST be after all addCase calls
    builder.addMatcher(
      (action) => action.type === 'auth/logout',
      () => {
        return initialState;
      }
    );
  },
});

export const { clearError } = subscriptionSlice.actions;
export default subscriptionSlice.reducer; 