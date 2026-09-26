import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Department {
  id: string;
  name: string;
  description?: string;
  locationId: string;
  isActive: boolean;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  organizationId: string;
  isActive: boolean;
  departments: Department[];
}

interface LocationState {
  current: Location | null;
  list: Location[];
  isLoading: boolean;
  error: string | null;
}

const stored = localStorage.getItem('selectedLocationId');
const locationSlice = createSlice({
  name: 'location',
  initialState: { current: null, list: [], isLoading: false, error: null } as LocationState,
  reducers: {
    setLocations(state, action: PayloadAction<Location[]>) {
      state.list = action.payload;
      if (!state.current && action.payload.length > 0) {
        const saved = stored ? action.payload.find(l => l.id === stored) : null;
        state.current = saved || action.payload[0];
      }
    },
    setCurrentLocation(state, action: PayloadAction<Location>) {
      state.current = action.payload;
      localStorage.setItem('selectedLocationId', action.payload.id);
    },
    addLocation(state, action: PayloadAction<Location>) {
      state.list.push(action.payload);
    },
    updateLocation(state, action: PayloadAction<Location>) {
      const idx = state.list.findIndex(l => l.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
      if (state.current?.id === action.payload.id) state.current = action.payload;
    },
    removeLocation(state, action: PayloadAction<string>) {
      state.list = state.list.filter(l => l.id !== action.payload);
      if (state.current?.id === action.payload) state.current = state.list[0] || null;
    },
    setLoading(state, action: PayloadAction<boolean>) { state.isLoading = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});

export const { setLocations, setCurrentLocation, addLocation, updateLocation, removeLocation } = locationSlice.actions;
export default locationSlice.reducer;
