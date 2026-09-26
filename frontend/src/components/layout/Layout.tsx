import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AppearanceContext, useAppearanceState } from '@/hooks/useAppearance';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const appearanceCtx = useAppearanceState();

  // Keep a CSS var in sync so topbar (position: fixed) can use it
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-current-width',
      collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
    );
  }, [collapsed]);

  return (
    <AppearanceContext.Provider value={appearanceCtx}>
      <div className="app-layout">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <div className={`main-content${collapsed ? ' main-content-collapsed' : ''}`}>
          <TopBar />
          {children}
        </div>
      </div>
    </AppearanceContext.Provider>
  );
};

export default Layout;
