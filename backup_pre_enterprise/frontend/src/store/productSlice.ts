import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  cost?: number;
  imageUrl?: string;
  isActive: boolean;
  organizationId: string;
  categoryId?: string;
  category?: Category;
  inventory?: Array<{ quantity: number; minStock: number; locationId: string }>;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface ProductState {
  list: Product[];
  categories: Category[];
  cart: CartItem[];
  isLoading: boolean;
  error: string | null;
}

const productSlice = createSlice({
  name: 'product',
  initialState: { list: [], categories: [], cart: [], isLoading: false, error: null } as ProductState,
  reducers: {
    setProducts(state, action: PayloadAction<Product[]>) {
      state.list = action.payload;
    },
    addProduct(state, action: PayloadAction<Product>) {
      state.list.push(action.payload);
    },
    updateProduct(state, action: PayloadAction<Product>) {
      const idx = state.list.findIndex(p => p.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    },
    removeProduct(state, action: PayloadAction<string>) {
      state.list = state.list.filter(p => p.id !== action.payload);
    },
    setCategories(state, action: PayloadAction<Category[]>) {
      state.categories = action.payload;
    },
    addToCart(state, action: PayloadAction<{ product: Product; quantity?: number }>) {
      const { product, quantity = 1 } = action.payload;
      const existing = state.cart.find(c => c.productId === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.cart.push({ productId: product.id, name: product.name, price: product.price, quantity });
      }
    },
    updateCartQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.cart.find(c => c.productId === action.payload.productId);
      if (item) {
        if (action.payload.quantity <= 0) {
          state.cart = state.cart.filter(c => c.productId !== action.payload.productId);
        } else {
          item.quantity = action.payload.quantity;
        }
      }
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.cart = state.cart.filter(c => c.productId !== action.payload);
    },
    clearCart(state) {
      state.cart = [];
    },
    setLoading(state, action: PayloadAction<boolean>) { state.isLoading = action.payload; },
    setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
  },
});

export const {
  setProducts, addProduct, updateProduct, removeProduct,
  setCategories,
  addToCart, updateCartQuantity, removeFromCart, clearCart,
  setLoading, setError,
} = productSlice.actions;
export default productSlice.reducer;
