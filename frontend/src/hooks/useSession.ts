import { useCallback } from 'react';
import { useAppDispatch, useAuth } from '@/hooks';
import { setCredentials } from '@/store/authSlice';
import { setLocations } from '@/store/locationSlice';
import { setOrganization, setPermissions } from '@/store/organizationSlice';
import { api, AUTH, LOCATION } from '@/services/api';
import { configureFormat } from '@/lib/format';

/** Loads session user, organization configuration, permissions and locations into the store. */
export function useSessionLoader() {
  const dispatch = useAppDispatch();
  const { token } = useAuth();
  return useCallback(async (overrideToken?: string) => {
    const t = overrideToken || token;
    if (!t) return;
    const [sessionRes, locRes] = await Promise.all([
      api.query(AUTH.SESSION, {}, t),
      api.query(LOCATION.LIST, {}, t),
    ]);
    const { user, organization, permissions } = sessionRes.session;
    dispatch(setCredentials({ user, token: t }));
    dispatch(setOrganization(organization));
    dispatch(setPermissions(permissions));
    dispatch(setLocations(locRes.locations));
    configureFormat(organization.currency, organization.locale, organization.timezone);
  }, [dispatch, token]);
}
