import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrgSettings {
  serviceModel: 'TABLE_SERVICE' | 'COUNTER' | 'HYBRID' | 'DELIVERY_ONLY';
  orderTypes: string[];
  modules: Record<string, boolean>;
  pos: {
    courses: boolean;
    seats: boolean;
    tipping: boolean;
    tipPresets: number[];
    serviceChargePct: number;
    serviceChargeMinGuests: number;
    cashRounding: number;
    autoFire: boolean;
    requireGuestCount: boolean;
  };
  security: {
    voidRequiresManager: boolean;
    refundRequiresManager: boolean;
    maxDiscountPctWithoutApproval: number;
    pinSwitchUser: boolean;
  };
  loyalty: { pointsPerUnit: number; pointValue: number; minRedeemPoints: number };
  receipt: { header: string; footer: string; showTaxBreakdown: boolean };
  taxLabel: string;
}

export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  type: string;
  size: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  taxRate: number;
  taxInclusive: boolean;
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  settings: OrgSettings;
  onboardingCompleted: boolean;
  plan: string;
}

interface OrgState {
  current: Organization | null;
  permissions: string[];
  isLoading: boolean;
  error: string | null;
}

const orgSlice = createSlice({
  name: 'organization',
  initialState: { current: null, permissions: [], isLoading: false, error: null } as OrgState,
  reducers: {
    setOrganization(state, action: PayloadAction<Organization>) {
      state.current = action.payload;
    },
    setPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
    },
    clearOrganization(state) {
      state.current = null;
      state.permissions = [];
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setOrganization, setPermissions, clearOrganization } = orgSlice.actions;
export default orgSlice.reducer;
