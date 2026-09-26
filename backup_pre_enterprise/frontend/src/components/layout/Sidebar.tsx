import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useAppDispatch } from '@/hooks';
import { logout } from '@/store/authSlice';
import {
  IconDashboard,
  IconDeviceDesktop,
  IconClipboardList,
  IconBox,
  IconArchive,
  IconUsers,
  IconMapPin,
  IconBolt,
  IconLogout,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconLayoutGrid,
} from '@tabler/icons-react';
import { MageOS } from './AppSvgs';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const mainNav = (): NavItem[] => [
  { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard size={18} /> },
  { to: '/pos', label: 'POS Terminal', icon: <IconDeviceDesktop size={18} /> },
  { to: '/orders', label: 'Orders', icon: <IconClipboardList size={18} /> },
  { to: '/tables', label: 'Table Management', icon: <IconLayoutGrid size={18} /> },
];

const manageNav = (): NavItem[] => [
  { to: '/products', label: 'Products', icon: <IconBox size={18} /> },
  { to: '/inventory', label: 'Inventory', icon: <IconArchive size={18} /> },
  { to: '/users', label: 'Users', icon: <IconUsers size={18} /> },
  { to: '/locations', label: 'Locations', icon: <IconMapPin size={18} /> },
];

const configNav = (): NavItem[] => [
  { to: '/settings', label: 'Settings', icon: <IconSettings size={18} /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const initials =
    user?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const roleBadge: Record<string, string> = {
    OWNER: 'Owner',
    MANAGER: 'Manager',
    SHIFT_LEAD: 'Shift Lead',
    STAFF: 'Staff',
  };

  const renderNavItem = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <span className="sidebar-item-icon">{item.icon}</span>
      {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
    </NavLink>
  );

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Logo + Toggle */}
      <div className="sidebar-logo">
        <div className="">
          <MageOS />
        </div>
        {!collapsed && (
          <div className="sidebar-logo-texts">
            <div className="sidebar-logo-text">MageOS</div>
            <div className="sidebar-logo-sub">An Enterprise POS</div>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {/* MAIN */}
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-label">Main</div>}
          {mainNav().map(renderNavItem)}
        </div>

        {/* MANAGEMENT */}
        {(user?.role === 'OWNER' || user?.role === 'MANAGER') && (
          <div className="sidebar-section">
            {!collapsed && <div className="sidebar-section-label">Management</div>}
            {manageNav().map(renderNavItem)}
          </div>
        )}

        {/* CONFIGURATION */}
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-label">Configuration</div>}
          {configNav().map(renderNavItem)}
        </div>
      </nav>

      {/* Footer / User */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user"
          onClick={handleLogout}
          title={collapsed ? `${user?.name || 'User'} — Click to logout` : 'Click to logout'}
        >
          <div className="sidebar-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-role">
                {roleBadge[user?.role || 'STAFF'] || user?.role}
              </div>
            </div>
          )}
          {!collapsed && (
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <IconLogout size={16} />
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
