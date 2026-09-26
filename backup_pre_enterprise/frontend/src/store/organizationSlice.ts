import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Organization {
  id: string;
  name: string;
  type: string;
  taxRate: number;
  domain?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

interface OrgState {
  current: Organization | null;
  isLoading: boolean;
  error: string | null;
}

const orgSlice = createSlice({
  name: 'organization',
  initialState: { current: null, isLoading: false, error: null } as OrgState,
  reducers: {
    setOrganization(state, action: PayloadAction<Organization>) {
      state.current = action.payload;
    },
    clearOrganization(state) {
      state.current = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setOrganization, clearOrganization } = orgSlice.actions;
export default orgSlice.reducer;
