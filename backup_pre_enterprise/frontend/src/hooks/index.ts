import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Auth hooks
export const useAuth = () => {
  const auth = useAppSelector(state => state.auth);
  return auth;
};

// Organization hooks
export const useOrganization = () => useAppSelector(state => state.organization);

// Location hooks
export const useLocation = () => useAppSelector(state => state.location);
export const useCurrentLocation = () => useAppSelector(state => state.location.current);

// Department hooks
export const useDepartment = () => useAppSelector(state => state.department);
export const useCurrentDepartment = () => useAppSelector(state => state.department.current);

// Product hooks
export const useProduct = () => useAppSelector(state => state.product);
export const useCart = () => {
  const cart = useAppSelector(state => state.product.cart);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { cart, subtotal };
};

// Order hooks
export const useOrder = () => useAppSelector(state => state.order);

// UI hooks
export const useUI = () => useAppSelector(state => state.ui);

// Composite hooks
export const useMultiTenantContext = () => {
  const auth = useAppSelector(state => state.auth);
  const location = useAppSelector(state => state.location.current);
  const department = useAppSelector(state => state.department.current);
  return {
    organizationId: auth.user?.organizationId || '',
    locationId: location?.id || '',
    departmentId: department?.id || '',
    userId: auth.user?.id || '',
    role: auth.user?.role || 'STAFF',
    token: auth.token || '',
  };
};

// Appearance
export { useAppearance, AppearanceContext } from './useAppearance';
export type { AppearanceSettings, Theme, SidebarVariant, Density } from './useAppearance';

