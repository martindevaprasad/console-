import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth, useCan, useOrg } from '@/hooks';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { MageMark, MageWordmark } from './AppSvgs';
import { visibleNav } from '@/lib/nav';
import { ROLE_LABELS } from '@/lib/constants';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const SECTIONS = ['Operate', 'Catalog', 'People', 'Insights', 'Admin'] as const;

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const { org, settings } = useOrg();
  const can = useCan();
  const items = visibleNav(can, settings?.modules);

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="sidebar-logo">
        {collapsed ? <MageMark size={30} /> : (
          <div className="sidebar-logo-texts">
            <MageWordmark height={30} className="brand-wordmark" />
            <div className="sidebar-logo-sub truncate">{org?.name || 'Enterprise POS'}</div>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {SECTIONS.map((section) => {
          const list = items.filter((i) => i.section === section);
          if (!list.length) return null;
          return (
            <div className="sidebar-section" key={section}>
              {!collapsed && <div className="sidebar-section-label">{section}</div>}
              {list.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" title={user?.name}>
          <div className="sidebar-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-role">{ROLE_LABELS[user?.role || 'STAFF'] || user?.role} · {org?.plan?.toLowerCase()}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
