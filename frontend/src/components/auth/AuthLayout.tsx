import React from 'react';
import { MageOS } from '../layout/AppSvgs';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-split-layout">
      {/* Left Panel - Branding & POS Stats */}
      <div className="auth-left-panel">
        <div className="auth-left-branding">
          <div className="auth-left-branding-icon">
            <MageOS />
          </div>
          <div className="auth-left-branding-text">
            MageOS <span>/ Workspace</span>
          </div>
        </div>

        <div className="auth-left-status">
          ALL SYSTEMS NOMINAL
        </div>

        <h1 className="auth-left-heading">
          Where restaurant operations actually run.
        </h1>
        
        <p className="auth-left-subtext">
          One configurable platform for every format — from a single food truck to a global chain. POS, kitchen, floor, inventory, people and analytics.
        </p>

        <div className="auth-left-glass-panel">
          <div className="auth-left-stats-grid">
            <div>
              <div className="auth-stat-value">1,284</div>
              <div className="auth-stat-label">Orders Today</div>
            </div>
            <div>
              <div className="auth-stat-value">98.7%</div>
              <div className="auth-stat-label">System Uptime</div>
            </div>
            <div>
              <div className="auth-stat-value">1.2s</div>
              <div className="auth-stat-label">Avg Response</div>
            </div>
          </div>

          <div className="auth-left-locations">
            <div className="auth-location-item">
              <span className="auth-location-name">Downtown Store</span>
              <span className="auth-location-status">38ms</span>
            </div>
            <div className="auth-location-item">
              <span className="auth-location-name">Uptown Branch</span>
              <span className="auth-location-status">51ms</span>
            </div>
            <div className="auth-location-item">
              <span className="auth-location-name">Westside Cafe</span>
              <span className="auth-location-status">62ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="auth-right-panel">
        <div className="auth-form-container">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
