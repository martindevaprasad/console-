import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  isLoading: boolean;
  notifications: Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    activeModal: null,
    isLoading: false,
    notifications: [],
  } as UIState,
  reducers: {
    toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen(state, action: PayloadAction<boolean>) { state.sidebarOpen = action.payload; },
    openModal(state, action: PayloadAction<string>) { state.activeModal = action.payload; },
    closeModal(state) { state.activeModal = null; },
    setGlobalLoading(state, action: PayloadAction<boolean>) { state.isLoading = action.payload; },
    addNotification(state, action: PayloadAction<{ type: 'success' | 'error' | 'info' | 'warning'; message: string }>) {
      state.notifications.push({ id: Date.now().toString(), ...action.payload });
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
  },
});

export const { toggleSidebar, setSidebarOpen, openModal, closeModal, setGlobalLoading, addNotification, removeNotification } = uiSlice.actions;
export default uiSlice.reducer;
