import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import bookingReducer from './bookingSlice';
import classReducer from './classSlice';
import subscriptionReducer from './subscriptionSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    classes: classReducer,
    bookings: bookingReducer,
    subscriptions: subscriptionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 