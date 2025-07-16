import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Booking, BookingFilters, BookingRequest, bookingService, WaitlistEntry, WaitlistRequest } from '../services/bookingService';

interface BookingState {
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  isLoading: boolean;
  isWaitlistLoading: boolean;
  error: string | null;
  filters: BookingFilters;
}

const initialState: BookingState = {
  bookings: [],
  waitlist: [],
  isLoading: false,
  isWaitlistLoading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchBookings = createAsyncThunk(
  'bookings/fetchBookings',
  async (filters: BookingFilters = {}, { rejectWithValue }) => {
    const response = await bookingService.getBookings(filters);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch bookings');
    }
    return response.data!;
  }
);

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (bookingData: BookingRequest, { rejectWithValue }) => {
    const response = await bookingService.createBooking(bookingData);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to create booking');
    }
    return response.data!;
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async (id: number, { rejectWithValue }) => {
    const response = await bookingService.cancelBooking(id);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to cancel booking');
    }
    return response.data!;
  }
);

export const checkInBooking = createAsyncThunk(
  'bookings/checkIn',
  async (id: number, { rejectWithValue }) => {
    const response = await bookingService.checkIn(id);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to check in');
    }
    return response.data!;
  }
);

export const markBookingCompleted = createAsyncThunk(
  'bookings/markCompleted',
  async (id: number, { rejectWithValue }) => {
    const response = await bookingService.markCompleted(id);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to mark as completed');
    }
    return response.data!;
  }
);

// Waitlist thunks
export const joinWaitlist = createAsyncThunk(
  'bookings/joinWaitlist',
  async (waitlistData: WaitlistRequest, { rejectWithValue }) => {
    const response = await bookingService.joinWaitlist(waitlistData);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to join waitlist');
    }
    return response.data!;
  }
);

export const leaveWaitlist = createAsyncThunk(
  'bookings/leaveWaitlist',
  async (waitlistId: number, { rejectWithValue }) => {
    const response = await bookingService.leaveWaitlist(waitlistId);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to leave waitlist');
    }
    return waitlistId;
  }
);

export const fetchUserWaitlist = createAsyncThunk(
  'bookings/fetchUserWaitlist',
  async (_, { rejectWithValue }) => {
    const response = await bookingService.getUserWaitlist();
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch waitlist');
    }
    return response.data!;
  }
);

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Bookings
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings = action.payload;
        state.error = null;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Booking
    builder
      .addCase(createBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings.push(action.payload);
        state.error = null;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel Booking
    builder
      .addCase(cancelBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.bookings.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Check In
    builder
      .addCase(checkInBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkInBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.bookings.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(checkInBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Mark Completed
    builder
      .addCase(markBookingCompleted.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(markBookingCompleted.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.bookings.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(markBookingCompleted.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Join Waitlist
    builder
      .addCase(joinWaitlist.pending, (state) => {
        state.isWaitlistLoading = true;
        state.error = null;
      })
      .addCase(joinWaitlist.fulfilled, (state, action) => {
        state.isWaitlistLoading = false;
        state.waitlist.push(action.payload);
        state.error = null;
      })
      .addCase(joinWaitlist.rejected, (state, action) => {
        state.isWaitlistLoading = false;
        state.error = action.payload as string;
      });

    // Leave Waitlist
    builder
      .addCase(leaveWaitlist.pending, (state) => {
        state.isWaitlistLoading = true;
        state.error = null;
      })
      .addCase(leaveWaitlist.fulfilled, (state, action) => {
        state.isWaitlistLoading = false;
        state.waitlist = state.waitlist.filter(w => w.id !== action.payload);
        state.error = null;
      })
      .addCase(leaveWaitlist.rejected, (state, action) => {
        state.isWaitlistLoading = false;
        state.error = action.payload as string;
      });

    // Fetch User Waitlist
    builder
      .addCase(fetchUserWaitlist.pending, (state) => {
        state.isWaitlistLoading = true;
        state.error = null;
      })
      .addCase(fetchUserWaitlist.fulfilled, (state, action) => {
        state.isWaitlistLoading = false;
        state.waitlist = action.payload;
        state.error = null;
      })
      .addCase(fetchUserWaitlist.rejected, (state, action) => {
        state.isWaitlistLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearError } = bookingSlice.actions;
export default bookingSlice.reducer; 