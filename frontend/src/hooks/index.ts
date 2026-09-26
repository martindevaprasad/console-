import { useCallback, useEffect, useRef, useState } from 'react';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { api } from '@/services/api';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Auth hooks
export const useAuth = () => useAppSelector((state) => state.auth);

// Organization / session
export const useOrganization = () => useAppSelector((state) => state.organization);
export const useOrg = () => {
  const { current, permissions } = useAppSelector((state) => state.organization);
  return { org: current, settings: current?.settings, permissions };
};

/** Permission check: `can('pos.void')`. Owners get every permission from the server. */
export const useCan = () => {
  const permissions = useAppSelector((state) => state.organization.permissions);
  return useCallback((...perms: string[]) => perms.some((p) => permissions.includes(p)), [permissions]);
};

/** Feature-module flag from the organization's configuration. */
export const useModule = (key: string) => useAppSelector((state) => !!state.organization.current?.settings?.modules?.[key]);

// Location hooks
export const useLocation = () => useAppSelector((state) => state.location);
export const useCurrentLocation = () => useAppSelector((state) => state.location.current);

// Department hooks
export const useDepartment = () => useAppSelector((state) => state.department);
export const useCurrentDepartment = () => useAppSelector((state) => state.department.current);

// Product hooks
export const useProduct = () => useAppSelector((state) => state.product);

// Order hooks
export const useOrder = () => useAppSelector((state) => state.order);

// UI hooks
export const useUI = () => useAppSelector((state) => state.ui);

// Composite hooks
export const useMultiTenantContext = () => {
  const auth = useAppSelector((state) => state.auth);
  const location = useAppSelector((state) => state.location.current);
  const department = useAppSelector((state) => state.department.current);
  return {
    organizationId: auth.user?.organizationId || '',
    locationId: location?.id || '',
    departmentId: department?.id || '',
    userId: auth.user?.id || '',
    role: auth.user?.role || 'STAFF',
    token: auth.token || '',
  };
};

/**
 * Declarative data loader: `const { data, loading, reload } = useApi(QUERY, vars)`.
 * Re-runs when the serialized variables change; `skip` defers loading.
 */
export function useApi<T = any>(query: string, variables: Record<string, any> = {}, opts: { skip?: boolean; pollMs?: number } = {}) {
  const token = useAppSelector((state) => state.auth.token);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!opts.skip);
  const [error, setError] = useState<string | null>(null);
  const varsKey = JSON.stringify(variables);
  const alive = useRef(true);

  const reload = useCallback(async (silent = false) => {
    if (opts.skip) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.query(query, JSON.parse(varsKey), token);
      if (alive.current) { setData(res); setError(null); }
    } catch (e: any) {
      if (alive.current) setError(e.message || 'Request failed');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [query, varsKey, token, opts.skip]);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => { alive.current = false; };
  }, [reload]);

  useEffect(() => {
    if (!opts.pollMs || opts.skip) return;
    const id = setInterval(() => reload(true), opts.pollMs);
    return () => clearInterval(id);
  }, [opts.pollMs, opts.skip, reload]);

  return { data, loading, error, reload, setData };
}

/** Imperative mutation helper bound to the current token. */
export function useMutate() {
  const token = useAppSelector((state) => state.auth.token);
  return useCallback((mutation: string, variables?: Record<string, any>) => api.mutation(mutation, variables, token), [token]);
}

// Appearance
export { useAppearance, AppearanceContext } from './useAppearance';
export type { AppearanceSettings, Theme, SidebarVariant, Density } from './useAppearance';
