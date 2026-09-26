import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppDispatch, useAuth, useCan, useOrg } from '@/hooks';
import { logout } from '@/store/authSlice';
import { clearOrganization } from '@/store/organizationSlice';
import { useSessionLoader } from '@/hooks/useSession';
import { visibleNav } from '@/lib/nav';

import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
const OnboardingWizard = lazy(() => import('./components/onboarding/OnboardingWizard'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const POSTerminal = lazy(() => import('./components/pos/POSTerminal'));
const OrdersPage = lazy(() => import('./components/orders/OrdersPage'));
const TableManagementPage = lazy(() => import('./components/tables/TableManagement'));
const ReservationsPage = lazy(() => import('./components/tables/Reservations'));
const KitchenDisplay = lazy(() => import('./components/kds/KitchenDisplay'));
const CashPage = lazy(() => import('./components/cash/CashPage'));
const MenuPage = lazy(() => import('./components/menu/MenuPage'));
const PromotionsPage = lazy(() => import('./components/promotions/PromotionsPage'));
const InventoryPage = lazy(() => import('./components/inventory/InventoryPage'));
const CustomersPage = lazy(() => import('./components/customers/CustomersPage'));
const StaffPage = lazy(() => import('./components/staff/StaffPage'));
const ReportsPage = lazy(() => import('./components/reports/ReportsPage'));
const LocationsPage = lazy(() => import('./components/locations/LocationsPage'));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'));
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoadingSpinner from './components/shared/LoadingSpinner';

const PAGES: Record<string, React.ReactNode> = {
  '/dashboard': <Dashboard />,
  '/pos': <POSTerminal />,
  '/orders': <OrdersPage />,
  '/tables': <TableManagementPage />,
  '/reservations': <ReservationsPage />,
  '/kds': <KitchenDisplay />,
  '/cash': <CashPage />,
  '/menu': <MenuPage />,
  '/promotions': <PromotionsPage />,
  '/inventory': <InventoryPage />,
  '/customers': <CustomersPage />,
  '/staff': <StaffPage />,
  '/reports': <ReportsPage />,
  '/locations': <LocationsPage />,
  '/settings': <SettingsPage />,
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { org, settings } = useOrg();
  const can = useCan();
  const allowed = visibleNav(can, settings?.modules);
  const home = allowed[0]?.path || '/settings';
  const needsOnboarding = isAuthenticated && org && !org.onboardingCompleted && can('settings.manage');

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={home} replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/onboarding" replace /> : <Register />} />
      <Route
        path="/onboarding"
        element={<ProtectedRoute>{can('settings.manage') ? <OnboardingWizard /> : <Navigate to={home} replace />}</ProtectedRoute>}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            {needsOnboarding ? <Navigate to="/onboarding" replace /> : (
              <Layout>
                <Suspense fallback={<div className="page-container"><LoadingSpinner text="Loading module..." /></div>}>
                  <Routes>
                    {allowed.map((n) => <Route key={n.path} path={n.path} element={PAGES[n.path]} />)}
                    <Route path="*" element={<Navigate to={user ? home : '/login'} replace />} />
                  </Routes>
                </Suspense>
              </Layout>
            )}
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { token } = useAuth();
  const loadSession = useSessionLoader();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (token) {
        try {
          await loadSession();
        } catch {
          dispatch(logout());
          dispatch(clearOrganization());
        }
      }
      setInitializing(false);
    };
    init();
    // Only on first mount; later token changes load the session explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onExpired = () => { dispatch(logout()); dispatch(clearOrganization()); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [dispatch]);

  if (initializing) return <LoadingSpinner fullPage text="Re-establishing secure session..." />;

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--color-border)',
            fontFamily: 'var(--font-family)',
            fontSize: 12,
          },
        }}
      />
      <Suspense fallback={<LoadingSpinner fullPage text="Loading module..." />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
