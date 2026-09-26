import React from 'react';
import { useLocation as useRouterLocation } from 'react-router-dom';
import { useCurrentLocation, useAuth } from '@/hooks';
import { IconMapPin, IconCalendar, IconUser } from '@tabler/icons-react';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview & analytics' },
  '/pos': { title: 'POS Terminal', subtitle: 'Point of sale' },
  '/orders': { title: 'Order History', subtitle: 'Transaction records' },
  '/products': { title: 'Products', subtitle: 'Catalog management' },
  '/inventory': { title: 'Inventory', subtitle: 'Stock management' },
  '/users': { title: 'Users', subtitle: 'Team management' },
  '/locations': { title: 'Locations', subtitle: 'Store locations' },
  '/settings': { title: 'Settings', subtitle: 'Account preferences' },
};

export const TopBar: React.FC = () => {
  const routerLocation = useRouterLocation();
  const currentLocation = useCurrentLocation();
  const { user } = useAuth();
  const page = pageTitles[routerLocation.pathname] || { title: 'NexusPOS', subtitle: '' };
  const now = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {page.title}
          </h1>
          {page.subtitle && (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{page.subtitle}</p>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {currentLocation && (
          <div className="topbar-location" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconMapPin size={16} />
            <span>{currentLocation.name}</span>
          </div>
        )}
        <div className="topbar-location" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconCalendar size={16} />
          <span>{now}</span>
        </div>
        <div className="topbar-location" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconUser size={16} />
          <span>{user?.name?.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
