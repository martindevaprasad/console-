import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: { name: string; id: string };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  notes?: string;
  organizationId: string;
  locationId: string;
  createdAt: string;
  items: OrderItem[];
  user?: { name: string; id: string };
  location?: { name: string; id: string };
}

interface OrderState {
  list: Order[];
  current: Order | null;
  isLoading: boolean;
  error: string | null;
}

const orderSlice = createSlice({
  name: 'order',
  initialState: { list: [], current: null, isLoading: false, error: null } as OrderState,
  reducers: {
    setOrders(state, action: PayloadAction<Order[]>) {
      state.list = action.payload;
    },
    addOrder(state, action: PayloadAction<Order>) {
      state.list.unshift(action.payload);
    },
    updateOrder(state, action: PayloadAction<Order>) {
      const idx = state.list.findIndex(o => o.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
      if (state.current?.id === action.payload.id) state.current = action.payload;
    },
    setCurrentOrder(state, action: PayloadAction<Order | null>) {
      state.current = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) { state.isLoading = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});

export const { setOrders, addOrder, updateOrder, setCurrentOrder, setLoading, setError } = orderSlice.actions;
export default orderSlice.reducer;
