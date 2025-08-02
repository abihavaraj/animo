import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { BackendClass, ClassFilters, classService, CreateClassRequest, UpdateClassRequest } from '../services/classService';

interface ClassState {
  classes: BackendClass[];
  currentClass: BackendClass | null;
  isLoading: boolean;
  error: string | null;
  filters: ClassFilters;
}

const initialState: ClassState = {
  classes: [],
  currentClass: null,
  isLoading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchClasses = createAsyncThunk(
  'classes/fetchClasses',
  async (filters: ClassFilters = {}, { rejectWithValue }) => {
    const response = await classService.getClasses(filters);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch classes');
    }
    return response.data!;
  }
);

export const fetchClass = createAsyncThunk(
  'classes/fetchClass',
  async (id: number, { rejectWithValue }) => {
    const response = await classService.getClassById(id);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch class');
    }
    return response.data!;
  }
);

export const createClass = createAsyncThunk(
  'classes/createClass',
  async (classData: CreateClassRequest, { rejectWithValue }) => {
    const response = await classService.createClass(classData);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to create class');
    }
    return response.data!;
  }
);

export const updateClass = createAsyncThunk(
  'classes/updateClass',
  async ({ id, classData }: { id: number; classData: UpdateClassRequest }, { rejectWithValue }) => {
    const response = await classService.updateClass(id, classData);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to update class');
    }
    return response.data!;
  }
);

export const deleteClass = createAsyncThunk(
  'classes/deleteClass',
  async (id: number, { rejectWithValue }) => {
    const response = await classService.deleteClass(id);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to delete class');
    }
    return id;
  }
);

export const cancelClass = createAsyncThunk(
  'classes/cancelClass',
  async (id: number, { rejectWithValue }) => {
    const response = await classService.cancelClass(id);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to cancel class');
    }
    return response.data!;
  }
);

const classSlice = createSlice({
  name: 'classes',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentClass: (state) => {
      state.currentClass = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Classes
    builder
      .addCase(fetchClasses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClasses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.classes = action.payload;
        state.error = null;
      })
      .addCase(fetchClasses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Single Class
    builder
      .addCase(fetchClass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentClass = action.payload;
        state.error = null;
      })
      .addCase(fetchClass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Class
    builder
      .addCase(createClass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createClass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.classes.push(action.payload);
        state.error = null;
      })
      .addCase(createClass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Class
    builder
      .addCase(updateClass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateClass.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.classes.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.classes[index] = action.payload;
        }
        if (state.currentClass && state.currentClass.id === action.payload.id) {
          state.currentClass = action.payload;
        }
        state.error = null;
      })
      .addCase(updateClass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Class
    builder
      .addCase(deleteClass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteClass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.classes = state.classes.filter(c => c.id !== action.payload);
        if (state.currentClass && state.currentClass.id === action.payload) {
          state.currentClass = null;
        }
        state.error = null;
      })
      .addCase(deleteClass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel Class
    builder
      .addCase(cancelClass.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelClass.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.classes.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.classes[index] = action.payload;
        }
        if (state.currentClass && state.currentClass.id === action.payload.id) {
          state.currentClass = action.payload;
        }
        state.error = null;
      })
      .addCase(cancelClass.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearError, clearCurrentClass } = classSlice.actions;
export default classSlice.reducer; 