import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppDispatch, useAuth } from '@/hooks';
import { setCredentials } from '@/store/authSlice';
import { setLocations } from '@/store/locationSlice';
import { api, AUTH, LOCATION } from '@/services/api';

// Layout
import Layout from './components/layout/Layout';

// Pages / Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import POSTerminal from './components/pos/POSTerminal';
import ProductManager from './components/management/ProductManager';
import UserManager from './components/management/UserManager';
import InventoryDashboard from './components/management/InventoryDashboard';
import OrderHistory from './components/management/OrderHistory';
import LocationManager from './components/management/LocationManager';
import ProtectedRoute from './components/shared/ProtectedRoute';
import SettingsPage from './components/settings/SettingsPage';
import LoadingSpinner from './components/shared/LoadingSpinner';
import TableManagementPage from './components/tables/TableManagement';

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { token, isAuthenticated } = useAuth();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      if (token) {
        try {
          const userRes = await api.query(AUTH.ME, {}, token);
          dispatch(setCredentials({ user: userRes.me, token }));

          const locRes = await api.query(LOCATION.LIST, { organizationId: userRes.me.organizationId }, token);
          dispatch(setLocations(locRes.locations));
        } catch {
          // Token expired or invalid
          localStorage.removeItem('auth');
        }
      }
      setInitializing(false);
    };

    initApp();
  }, [token, dispatch]);

  if (initializing) {
    return <LoadingSpinner fullPage text="Re-establishing secure session..." />;
  }

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
          },
        }}
      />
      <Routes>
        {/* Auth routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
        />

        {/* Protected app routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pos" element={<POSTerminal />} />
                  <Route path="/orders" element={<OrderHistory />} />
                  <Route path="/products" element={<ProductManager />} />
                  <Route path="/inventory" element={<InventoryDashboard />} />
                  <Route path="/users" element={<UserManager />} />
                  <Route path="/locations" element={<LocationManager />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/tables" element={<TableManagementPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
