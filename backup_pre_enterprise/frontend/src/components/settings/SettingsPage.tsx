import React, { useState } from 'react';
import {
  IconPalette,
  IconBell,
  IconLock,
  IconLanguage,
  IconAccessible,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconCheck,
} from '@tabler/icons-react';
import { useAppearance } from '@/hooks';
import type { Theme, SidebarVariant, Density } from '@/hooks';

/* ── types ─────────────────────────────────────── */
type Tab = 'notifications' | 'appearance' | 'privacy' | 'language' | 'accessibility';

/* ── sidebar-variant preview cards ─────────────── */
const VARIANTS: { key: SidebarVariant; label: string; desc: string; bg: string; accent: string }[] = [
  {
    key: 'aurora',
    label: 'Aurora',
    desc: 'Deep indigo · enterprise default',
    bg: 'linear-gradient(180deg, #0a0f1e 0%, #070b14 100%)',
    accent: '#7c3aed',
  },
  {
    key: 'onyx',
    label: 'Onyx',
    desc: 'Neutral charcoal · minimal contrast',
    bg: 'linear-gradient(180deg, #1a1a2e 0%, #12121a 100%)',
    accent: '#64748b',
  },
  {
    key: 'frost',
    label: 'Frost',
    desc: 'Light · daytime / high-readability',
    bg: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    accent: '#6366f1',
  },
];

/* ── theme options ──────────────────────────────── */
const THEMES: { key: Theme; label: string; icon: React.ReactNode }[] = [
  { key: 'light', label: 'Light', icon: <IconSun size={28} /> },
  { key: 'dark', label: 'Dark', icon: <IconMoon size={28} /> },
  { key: 'system', label: 'System', icon: <IconDeviceDesktop size={28} /> },
];

/* ── left nav tabs ──────────────────────────────── */
const TABS: { key: Tab; label: string; sub: string; icon: React.ReactNode }[] = [
  { key: 'notifications', label: 'Notifications', sub: 'Manage your notification preferences', icon: <IconBell size={18} /> },
  { key: 'appearance', label: 'Appearance', sub: 'Customise the look and feel', icon: <IconPalette size={18} /> },
  { key: 'privacy', label: 'Privacy & Security', sub: 'Control your privacy settings', icon: <IconLock size={18} /> },
  { key: 'language', label: 'Language & Region', sub: 'Set your preferred language and timezone', icon: <IconLanguage size={18} /> },
  { key: 'accessibility', label: 'Accessibility', sub: 'Accessibility options and preferences', icon: <IconAccessible size={18} /> },
];

/* ── mini sidebar preview ───────────────────────── */
function SidebarPreview({ bg, accent }: { bg: string; accent: string }) {
  return (
    <div style={{ background: bg, borderRadius: 6, padding: '8px 6px', height: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ width: 20, height: 4, borderRadius: 2, background: accent, opacity: 0.9 }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
      ))}
      <div style={{ marginTop: 4 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ width: '80%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 3 }} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const { settings, update } = useAppearance();

  const [draft, setDraft] = useState({ ...settings });

  const handleSave = () => {
    update(draft);
  };

  const handleReset = () => {
    setDraft({ ...settings });
  };

  return (
    <div className="page-container settings-page">
      {/* Header */}
      <div className="settings-topbar">
        <div>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your account preferences</p>
        </div>
        <div className="settings-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            Reset
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>

      <div className="settings-layout">
        {/* Left nav */}
        <aside className="settings-nav">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`settings-nav-item${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="settings-nav-icon">{tab.icon}</span>
              <span>
                <div className="settings-nav-label">{tab.label}</div>
                <div className="settings-nav-sub">{tab.sub}</div>
              </span>
            </button>
          ))}
        </aside>

        {/* Right panel */}
        <div className="settings-panel">
          {activeTab === 'appearance' && (
            <div className="settings-sections">

              {/* ── Theme ── */}
              <section className="settings-section">
                <h2 className="settings-section-title">Theme</h2>
                <div className="theme-grid">
                  {THEMES.map(t => (
                    <button
                      key={t.key}
                      className={`theme-card${draft.theme === t.key ? ' selected' : ''}`}
                      onClick={() => setDraft(d => ({ ...d, theme: t.key }))}
                    >
                      <span className="theme-card-icon">{t.icon}</span>
                      <span className="theme-card-label">{t.label}</span>
                      {draft.theme === t.key && (
                        <span className="theme-card-check"><IconCheck size={12} /></span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Sidebar Variant ── */}
              <section className="settings-section">
                <div className="settings-section-header">
                  <h2 className="settings-section-title">Sidebar variant</h2>
                  <span className="badge badge-neutral" style={{ fontSize: 10 }}>Tenant admins only</span>
                </div>
                <p className="settings-section-desc">
                  Pick the palette for the navigation sidebar.
                </p>
                <div className="variant-grid">
                  {VARIANTS.map(v => (
                    <button
                      key={v.key}
                      className={`variant-card${draft.sidebarVariant === v.key ? ' selected' : ''}`}
                      onClick={() => setDraft(d => ({ ...d, sidebarVariant: v.key }))}
                    >
                      <div className="variant-preview" style={{ background: v.bg }}>
                        <SidebarPreview bg={v.bg} accent={v.accent} />
                      </div>
                      <div className="variant-info">
                        <div className="variant-name">{v.label}</div>
                        <div className="variant-desc">{v.desc}</div>
                      </div>
                      {draft.sidebarVariant === v.key && (
                        <span className="variant-badge">ACTIVE</span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Display Density ── */}
              <section className="settings-section">
                <h2 className="settings-section-title">Display Options</h2>
                <div className="density-section">
                  <div>
                    <div className="density-label">Display Density</div>
                    <div className="density-hint">
                      Compact fits more on screen. Comfortable matches the original sizing.
                    </div>
                  </div>
                  <div className="density-toggle">
                    {(['compact', 'comfortable'] as Density[]).map(d => (
                      <button
                        key={d}
                        className={`density-btn${draft.density === d ? ' active' : ''}`}
                        onClick={() => setDraft(prev => ({ ...prev, density: d }))}
                      >
                        {d === 'compact' ? 'Compact (default)' : 'Comfortable'}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* ── Animations ── */}
              <section className="settings-section">
                <h2 className="settings-section-title">Animations</h2>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Enable animations &amp; transitions</div>
                    <div className="toggle-hint">
                      Disable for a faster, more accessible experience.
                    </div>
                  </div>
                  <button
                    className={`toggle-switch${draft.animations ? ' on' : ''}`}
                    onClick={() => setDraft(d => ({ ...d, animations: !d.animations }))}
                    aria-label="Toggle animations"
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              </section>

            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-placeholder">
              <IconBell size={48} opacity={0.3} />
              <h3>Notification Preferences</h3>
              <p>Configure alerts, sounds, and digest emails — coming soon.</p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="settings-placeholder">
              <IconLock size={48} opacity={0.3} />
              <h3>Privacy &amp; Security</h3>
              <p>2FA, session management, and audit logs — coming soon.</p>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="settings-placeholder">
              <IconLanguage size={48} opacity={0.3} />
              <h3>Language &amp; Region</h3>
              <p>Locale, timezone, currency format — coming soon.</p>
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="settings-placeholder">
              <IconAccessible size={48} opacity={0.3} />
              <h3>Accessibility</h3>
              <p>High contrast, font size, motion reduction — coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
