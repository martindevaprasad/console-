import React, { useEffect, useRef, useState } from 'react';
import {
  IconCashRegister, IconChefHat, IconLayoutGrid, IconPackage, IconUsers, IconChartBar,
} from '@tabler/icons-react';
import { MageWordmark } from '../layout/AppSvgs';
import { FoodLineArt } from './FoodLineArt';
import { MarkReveal } from './MarkReveal';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const FEATURES = [
  { icon: IconCashRegister, label: 'POS' },
  { icon: IconChefHat, label: 'Kitchen display' },
  { icon: IconLayoutGrid, label: 'Floor & tables' },
  { icon: IconPackage, label: 'Inventory' },
  { icon: IconUsers, label: 'People' },
  { icon: IconChartBar, label: 'Analytics' },
];

const TICKER = [
  { where: 'Downtown', what: 'Table 7 seated · 4 guests' },
  { where: 'Uptown', what: 'Order #1284 bumped in 6m 12s' },
  { where: 'Westside', what: 'Mozzarella reorder queued' },
  { where: 'Downtown', what: 'Table 12 settled · split 3 ways' },
  { where: 'Food truck', what: 'Lunch rush · 42 covers in 30m' },
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % TICKER.length), 3200);
    return () => { window.clearInterval(id); cancelAnimationFrame(frame.current); };
  }, []);

  // Pointer position drives the spotlight (px) and parallax (-1…1) via CSS variables, no re-render.
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--px', `${x}px`);
      el.style.setProperty('--py', `${y}px`);
      el.style.setProperty('--mx', ((x / r.width) * 2 - 1).toFixed(3));
      el.style.setProperty('--my', ((y / r.height) * 2 - 1).toFixed(3));
    });
  };

  const onPointerLeave = () => {
    const el = panelRef.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    ['--px', '--py', '--mx', '--my'].forEach((v) => el.style.removeProperty(v));
  };

  const event = TICKER[tick];

  return (
    <div className="auth-split-layout">
      {/* Left panel: marketing hero */}
      <div className="auth-left-panel" ref={panelRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
        <FoodLineArt />
        <div className="auth-spotlight" aria-hidden />

        <div className="auth-hero">
          <div className="auth-left-branding">
            <MageWordmark height={36} className="brand-wordmark" />
            <div className="auth-left-branding-text"><span>/ Workspace</span></div>
            <div className="auth-left-status">All systems nominal</div>
          </div>

          <div className="auth-hero-main">
            <div className="auth-eyebrow">The restaurant operating system</div>
            <h1 className="auth-left-heading">
              Where restaurant operations <span className="auth-heading-accent">actually run.</span>
            </h1>
            <p className="auth-left-subtext">
              One configurable platform for every format, from a single food truck to a global chain.
            </p>

            <div className="auth-features">
              {FEATURES.map(({ icon: Icon, label }) => (
                <span key={label} className="auth-feature"><Icon size={14} stroke={1.75} /> {label}</span>
              ))}
            </div>

            <MarkReveal />
          </div>

          <div className="auth-left-glass-panel">
            <div className="auth-left-stats-grid">
              <div><div className="auth-stat-value">1,284</div><div className="auth-stat-label">Orders today</div></div>
              <div><div className="auth-stat-value">98.7%</div><div className="auth-stat-label">Uptime</div></div>
              <div><div className="auth-stat-value">1.2s</div><div className="auth-stat-label">Avg response</div></div>
            </div>
            <div className="auth-ticker" aria-live="polite">
              <span className="auth-ticker-dot" />
              <span key={tick} className="auth-ticker-item">
                <span className="auth-ticker-where">{event.where}</span>{event.what}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: form */}
      <div className="auth-right-panel">
        <div className="auth-form-container">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
