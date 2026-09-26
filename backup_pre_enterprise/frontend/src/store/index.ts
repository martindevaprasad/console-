import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import organizationReducer from './organizationSlice';
import locationReducer from './locationSlice';
import departmentReducer from './departmentSlice';
import productReducer from './productSlice';
import orderReducer from './orderSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    organization: organizationReducer,
    location: locationReducer,
    department: departmentReducer,
    product: productReducer,
    order: orderReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
