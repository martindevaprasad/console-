import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Department {
  id: string;
  name: string;
  description?: string;
  locationId: string;
  isActive: boolean;
}

interface DepartmentState {
  current: Department | null;
  list: Department[];
  isLoading: boolean;
  error: string | null;
}

const departmentSlice = createSlice({
  name: 'department',
  initialState: { current: null, list: [], isLoading: false, error: null } as DepartmentState,
  reducers: {
    setDepartments(state, action: PayloadAction<Department[]>) {
      state.list = action.payload;
    },
    setCurrentDepartment(state, action: PayloadAction<Department | null>) {
      state.current = action.payload;
    },
    addDepartment(state, action: PayloadAction<Department>) {
      state.list.push(action.payload);
    },
    updateDepartment(state, action: PayloadAction<Department>) {
      const idx = state.list.findIndex(d => d.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    },
    removeDepartment(state, action: PayloadAction<string>) {
      state.list = state.list.filter(d => d.id !== action.payload);
      if (state.current?.id === action.payload) state.current = null;
    },
    setLoading(state, action: PayloadAction<boolean>) { state.isLoading = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});

export const { setDepartments, setCurrentDepartment, addDepartment, updateDepartment, removeDepartment } = departmentSlice.actions;
export default departmentSlice.reducer;
