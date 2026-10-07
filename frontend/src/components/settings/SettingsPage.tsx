import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  IconPalette, IconLock, IconLanguage, IconSun, IconMoon, IconDeviceDesktop, IconCheck, IconBuildingStore,
  IconToolsKitchen2, IconPuzzle, IconShieldCheck, IconStar, IconUserCircle, IconHistory, IconWand,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useApi, useAppearance, useCan, useMutate, useOrg } from '@/hooks';
import type { Theme, Palette, SidebarVariant, Density } from '@/hooks';
import { useSessionLoader } from '@/hooks/useSession';
import { AUTH, ORG_API } from '@/services/api';
import { MODULE_INFO, ORDER_TYPE_LABELS, ALL_ORDER_TYPES } from '@/lib/constants';
import { dateTime, label } from '@/lib/format';
import { Field, Toggle, SettingRow, Segmented, Empty } from '../shared/ui';

type Tab = 'business' | 'region' | 'service' | 'modules' | 'security' | 'loyalty' | 'account' | 'appearance' | 'audit';

const VARIANTS: { key: SidebarVariant; label: string; desc: string; bg: string; accent: string }[] = [
  { key: 'aurora', label: 'Aurora', desc: 'Midnight navy · brand-color highlights (default)', bg: 'linear-gradient(180deg, #0d1120 0%, #080a12 100%)', accent: 'var(--color-primary)' },
  { key: 'onyx', label: 'Onyx', desc: 'Charcoal · fully monochrome', bg: 'linear-gradient(180deg, #1c1c1c 0%, #141414 100%)', accent: '#a3a3a3' },
  { key: 'frost', label: 'Frost', desc: 'White · daytime / high-readability', bg: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)', accent: 'var(--color-primary)' },
];

// Single-color system — swatches: [sidebar, brand color, background dark, background light]
const PALETTES: { key: Palette; label: string; desc: string; swatches: string[] }[] = [
  { key: 'default', label: 'MaGe Brand', desc: 'Brand blue & mint on midnight navy · default', swatches: ['#0b0e17', '#5e84ff', '#67ffcc', '#ffffff'] },
  { key: 'fintech', label: 'Modern Fintech', desc: 'Sky blue on navy · SaaS & cafe chains', swatches: ['#0f172a', '#0ea5e9', '#1e293b', '#f8fafc'] },
  { key: 'hospitality', label: 'Hospitality Warmth', desc: 'Sage green on charcoal · upscale & bakeries', swatches: ['#1c1917', '#059669', '#292524', '#fafaf9'] },
  { key: 'minimal', label: 'Ultra-Minimalist', desc: 'Indigo on OLED black · bars & nightclubs', swatches: ['#000000', '#6366f1', '#09090b', '#ffffff'] },
  { key: 'oceanic', label: 'Oceanic Efficiency', desc: 'Ocean blue on deep navy · high-stress floors', swatches: ['#1e3a8a', '#2563eb', '#0f172a', '#f0f9ff'] },
];

const THEMES: { key: Theme; label: string; icon: React.ReactNode }[] = [
  { key: 'light', label: 'Light', icon: <IconSun size={22} /> },
  { key: 'dark', label: 'Dark', icon: <IconMoon size={22} /> },
  { key: 'system', label: 'System', icon: <IconDeviceDesktop size={22} /> },
];

function SidebarPreview({ bg, accent }: { bg: string; accent: string }) {
  return (
    <div style={{ background: bg, borderRadius: 6, padding: '8px 6px', height: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ width: 20, height: 4, borderRadius: 2, background: accent, opacity: 0.9 }} />
      {[1, 2, 3].map((i) => <div key={i} style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />)}
    </div>
  );
}

const AppearanceTab: React.FC = () => {
  const { settings, update } = useAppearance();
  const [draft, setDraft] = useState({ ...settings });
  return (
    <div className="settings-sections">
      <section className="settings-section">
        <h2 className="settings-section-title">Theme</h2>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button key={t.key} className={`theme-card${draft.theme === t.key ? ' selected' : ''}`} onClick={() => setDraft((d) => ({ ...d, theme: t.key }))}>
              <span className="theme-card-icon">{t.icon}</span><span className="theme-card-label">{t.label}</span>
              {draft.theme === t.key && <span className="theme-card-check"><IconCheck size={12} /></span>}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <h2 className="settings-section-title">Color palette</h2>
        <p className="settings-section-desc">Brand colors for buttons, selections and backgrounds. Works with light and dark themes.</p>
        <div className="palette-grid">
          {PALETTES.map((p) => (
            <button key={p.key} className={`variant-card${draft.palette === p.key ? ' selected' : ''}`} onClick={() => setDraft((d) => ({ ...d, palette: p.key }))}>
              <div className="palette-swatches">{p.swatches.map((c, i) => <span key={i} style={{ background: c }} />)}</div>
              <div className="variant-info"><div className="variant-name">{p.label}</div><div className="variant-desc">{p.desc}</div></div>
              {draft.palette === p.key && <span className="variant-badge">ACTIVE</span>}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <h2 className="settings-section-title">Sidebar variant</h2>
        <div className="variant-grid">
          {VARIANTS.map((v) => (
            <button key={v.key} className={`variant-card${draft.sidebarVariant === v.key ? ' selected' : ''}`} onClick={() => setDraft((d) => ({ ...d, sidebarVariant: v.key }))}>
              <div className="variant-preview" style={{ background: v.bg }}><SidebarPreview bg={v.bg} accent={v.accent} /></div>
              <div className="variant-info"><div className="variant-name">{v.label}</div><div className="variant-desc">{v.desc}</div></div>
              {draft.sidebarVariant === v.key && <span className="variant-badge">ACTIVE</span>}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <SettingRow label="Display density" hint="Compact fits more on screen; comfortable enlarges text and touch targets.">
          <div className="density-toggle">
            {(['compact', 'comfortable'] as Density[]).map((d) => (
              <button key={d} className={`density-btn${draft.density === d ? ' active' : ''}`} onClick={() => setDraft((p) => ({ ...p, density: d }))}>{d === 'compact' ? 'Compact' : 'Comfortable'}</button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Animations & transitions" hint="Disable for a faster, more accessible experience.">
          <Toggle on={draft.animations} onChange={(v) => setDraft((d) => ({ ...d, animations: v }))} />
        </SettingRow>
      </section>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setDraft({ ...settings })}>Reset</button>
        <button className="btn btn-primary btn-sm" onClick={() => { update(draft); toast.success('Appearance saved on this device'); }}>Save appearance</button>
      </div>
    </div>
  );
};

const AccountTab: React.FC = () => {
  const mutate = useMutate();
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pin, setPin] = useState('');
  return (
    <div className="settings-sections">
      <section className="settings-section">
        <h2 className="settings-section-title">Change password</h2>
        <div className="form-grid">
          <Field label="Current password"><input className="form-input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="New password" hint="Min 8 characters"><input className="form-input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        </div>
        <button className="btn btn-primary btn-sm" disabled={!pw.current || pw.next.length < 8} onClick={async () => {
          try { await mutate(AUTH.CHANGE_PASSWORD, { currentPassword: pw.current, newPassword: pw.next }); toast.success('Password changed'); setPw({ current: '', next: '' }); } catch (e: any) { toast.error(e.message); }
        }}>Update password</button>
      </section>
      <section className="settings-section">
        <h2 className="settings-section-title">POS PIN</h2>
        <p className="settings-section-desc">Used for fast user switching and manager approvals on shared terminals.</p>
        <div className="row">
          <input className="form-input" style={{ width: 140 }} inputMode="numeric" maxLength={6} placeholder="4–6 digits" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          <button className="btn btn-primary btn-sm" disabled={pin.length < 4} onClick={async () => {
            try { await mutate(AUTH.SET_PIN, { pin }); toast.success('PIN updated'); setPin(''); } catch (e: any) { toast.error(e.message); }
          }}>Set PIN</button>
        </div>
      </section>
    </div>
  );
};

const AuditTab: React.FC = () => {
  const [entity, setEntity] = useState('');
  const { data } = useApi(ORG_API.AUDIT, { entity: entity || null, limit: 200 });
  return (
    <div className="settings-section">
      <div className="toolbar">
        <select className="form-select" style={{ width: 180 }} value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All entities</option>
          {['Order', 'Product', 'User', 'Role', 'Organization', 'Location', 'Shift', 'Discount', 'TaxRate', 'StockItem', 'PurchaseOrder', 'Customer'].map((e) => <option key={e}>{e}</option>)}
        </select>
        <span className="small muted">Immutable record of sensitive actions: voids, refunds, discounts, price changes, permission edits.</span>
      </div>
      {!data?.auditLogs.length ? <Empty title="No audit events" /> : (
        <div className="table-container" style={{ maxHeight: 520, overflowY: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>{data.auditLogs.map((a: any) => (
              <tr key={a.id}>
                <td>{dateTime(a.createdAt)}</td><td>{a.userName || '—'}</td>
                <td><span className={`badge ${/VOID|REFUND|CANCEL|DEACTIVATE|DELETE/.test(a.action) ? 'badge-danger' : /DISCOUNT|PRICE/.test(a.action) ? 'badge-warning' : 'badge-neutral'}`}>{label(a.action)}</span></td>
                <td>{a.entity}</td>
                <td className="small mono truncate" style={{ maxWidth: 320 }} title={JSON.stringify(a.meta)}>{a.meta ? JSON.stringify(a.meta) : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const can = useCan();
  const navigate = useNavigate();
  const { org } = useOrg();
  const mutate = useMutate();
  const loadSession = useSessionLoader();
  const admin = can('settings.manage');
  const [tab, setTab] = useState<Tab>(admin ? 'business' : 'appearance');
  const [profile, setProfile] = useState<any>({});
  const [cfg, setCfg] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org) return;
    setProfile({
      name: org.name, legalName: org.legalName || '', phone: org.phone || '', email: org.email || '', address: org.address || '', taxId: org.taxId || '',
      country: org.country, currency: org.currency, locale: org.locale, timezone: org.timezone, taxRate: org.taxRate, taxInclusive: org.taxInclusive, type: org.type, size: org.size,
    });
    setCfg(JSON.parse(JSON.stringify(org.settings)));
  }, [org]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await mutate(ORG_API.UPDATE, { input: { ...profile, taxRate: parseFloat(profile.taxRate) || 0, legalName: profile.legalName || null, taxId: profile.taxId || null } });
      if (cfg.taxLabel !== org?.settings.taxLabel) await mutate(ORG_API.UPDATE_SETTINGS, { patch: { taxLabel: cfg.taxLabel } });
      await loadSession(); toast.success('Business profile saved');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const saveConfig = async (patch: any) => {
    setSaving(true);
    try { await mutate(ORG_API.UPDATE_SETTINGS, { patch }); await loadSession(); toast.success('Settings saved'); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const setPos = (p: any) => setCfg({ ...cfg, pos: { ...cfg.pos, ...p } });
  const setSec = (p: any) => setCfg({ ...cfg, security: { ...cfg.security, ...p } });

  const TABS: { key: Tab; label: string; sub: string; icon: React.ReactNode; admin?: boolean }[] = [
    { key: 'business', label: 'Business profile', sub: 'Brand, legal entity, format', icon: <IconBuildingStore size={16} />, admin: true },
    { key: 'region', label: 'Localization & tax', sub: 'Currency, timezone, tax mode', icon: <IconLanguage size={16} />, admin: true },
    { key: 'service', label: 'Service & POS', sub: 'Order types, courses, tips, charges', icon: <IconToolsKitchen2 size={16} />, admin: true },
    { key: 'modules', label: 'Modules', sub: 'Turn features on or off', icon: <IconPuzzle size={16} />, admin: true },
    { key: 'security', label: 'Security & approvals', sub: 'Voids, refunds, discount limits', icon: <IconShieldCheck size={16} />, admin: true },
    { key: 'loyalty', label: 'Loyalty & receipts', sub: 'Points, receipt text', icon: <IconStar size={16} />, admin: true },
    { key: 'audit', label: 'Audit log', sub: 'Who did what, when', icon: <IconHistory size={16} />, admin: true },
    { key: 'account', label: 'My account', sub: 'Password & PIN', icon: <IconUserCircle size={16} /> },
    { key: 'appearance', label: 'Appearance', sub: 'Theme, palette, sidebar, density', icon: <IconPalette size={16} /> },
  ];

  return (
    <div className="page-container settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Everything about how {org?.name} operates is configured here — no code changes needed.</p>
        </div>
        {admin && <button className="btn btn-secondary btn-sm" onClick={() => navigate('/onboarding')}><IconWand size={13} /> Re-run setup wizard</button>}
      </div>

      <div className="settings-layout">
        <aside className="settings-nav">
          {TABS.filter((t) => !t.admin || (t.key === 'audit' ? can('audit.view') : admin)).map((t) => (
            <button key={t.key} className={`settings-nav-item${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              <span className="settings-nav-icon">{t.icon}</span>
              <span><div className="settings-nav-label">{t.label}</div><div className="settings-nav-sub">{t.sub}</div></span>
            </button>
          ))}
        </aside>

        <div className="settings-panel">
          {tab === 'business' && cfg && (
            <section className="settings-section">
              <h2 className="settings-section-title">Business profile</h2>
              <div className="form-grid">
                <Field label="Brand / trading name"><input className="form-input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
                <Field label="Legal entity"><input className="form-input" value={profile.legalName} onChange={(e) => setProfile({ ...profile, legalName: e.target.value })} /></Field>
                <Field label="Tax / VAT / GST registration no."><input className="form-input" value={profile.taxId} onChange={(e) => setProfile({ ...profile, taxId: e.target.value })} /></Field>
                <Field label="Phone"><input className="form-input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
                <Field label="Email"><input className="form-input" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
                <Field label="Business format">
                  <select className="form-select" value={profile.type} onChange={(e) => setProfile({ ...profile, type: e.target.value })}>
                    {['RESTAURANT', 'FINE_DINING', 'CASUAL_DINING', 'QUICK_SERVICE', 'CAFE', 'BAKERY', 'BAR_PUB', 'FOOD_TRUCK', 'CLOUD_KITCHEN', 'FOOD_COURT', 'CATERING', 'HOTEL_RESTAURANT'].map((t) => <option key={t} value={t}>{label(t)}</option>)}
                  </select>
                </Field>
                <Field label="Head office address" full><input className="form-input" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></Field>
              </div>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={saveProfile}>Save profile</button>
            </section>
          )}

          {tab === 'region' && cfg && (
            <section className="settings-section">
              <h2 className="settings-section-title">Localization & tax</h2>
              <div className="form-grid">
                <Field label="Country (ISO)"><input className="form-input" maxLength={2} value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value.toUpperCase() })} /></Field>
                <Field label="Currency (ISO 4217)"><input className="form-input" maxLength={3} value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value.toUpperCase() })} /></Field>
                <Field label="Locale" hint="e.g. en-GB, fr-FR, ar-AE, ja-JP"><input className="form-input" value={profile.locale} onChange={(e) => setProfile({ ...profile, locale: e.target.value })} /></Field>
                <Field label="Timezone" hint="IANA name, e.g. Europe/London"><input className="form-input" value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} /></Field>
                <Field label="Tax label on receipts"><input className="form-input" value={cfg.taxLabel} onChange={(e) => setCfg({ ...cfg, taxLabel: e.target.value })} /></Field>
                <Field label="Fallback tax rate (%)" hint="Per-item rates live in Menu → Tax rates"><input className="form-input" type="number" step="0.001" value={profile.taxRate} onChange={(e) => setProfile({ ...profile, taxRate: e.target.value })} /></Field>
                <div className="full">
                  <SettingRow label="Prices include tax" hint="VAT/GST style. Turn off for US/Canada sales-tax style (tax added at checkout).">
                    <Toggle on={!!profile.taxInclusive} onChange={(v) => setProfile({ ...profile, taxInclusive: v })} />
                  </SettingRow>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={saveProfile}>Save localization</button>
            </section>
          )}

          {tab === 'service' && cfg && (
            <section className="settings-section">
              <h2 className="settings-section-title">Service & POS</h2>
              <SettingRow label="Service model" hint="Table service shows floor & courses first; counter optimises for speed.">
                <Segmented value={cfg.serviceModel} onChange={(v) => setCfg({ ...cfg, serviceModel: v })} options={[{ value: 'TABLE_SERVICE', label: 'Table' }, { value: 'COUNTER', label: 'Counter' }, { value: 'HYBRID', label: 'Hybrid' }, { value: 'DELIVERY_ONLY', label: 'Delivery' }]} />
              </SettingRow>
              <div className="setting-row" style={{ display: 'block' }}>
                <div className="setting-row-label" style={{ marginBottom: 6 }}>Enabled order types</div>
                <div className="row row-wrap">
                  {ALL_ORDER_TYPES.map((t) => (
                    <label key={t} className="check"><input type="checkbox" checked={cfg.orderTypes.includes(t)} onChange={(e) => setCfg({ ...cfg, orderTypes: e.target.checked ? [...cfg.orderTypes, t] : cfg.orderTypes.filter((x: string) => x !== t) })} />{ORDER_TYPE_LABELS[t]}</label>
                  ))}
                </div>
              </div>
              <SettingRow label="Coursing" hint="Group items by course and fire courses separately"><Toggle size="sm" on={cfg.pos.courses} onChange={(v) => setPos({ courses: v })} /></SettingRow>
              <SettingRow label="Seat numbers" hint="Assign items to seats for split-by-seat"><Toggle size="sm" on={cfg.pos.seats} onChange={(v) => setPos({ seats: v })} /></SettingRow>
              <SettingRow label="Auto-send to kitchen on payment" hint="Counter/QSR flow: pay first, then cook"><Toggle size="sm" on={cfg.pos.autoFire} onChange={(v) => setPos({ autoFire: v })} /></SettingRow>
              <SettingRow label="Tipping"><Toggle size="sm" on={cfg.pos.tipping} onChange={(v) => setPos({ tipping: v })} /></SettingRow>
              {cfg.pos.tipping && (
                <SettingRow label="Tip presets (%)"><input className="form-input" style={{ width: 140 }} value={cfg.pos.tipPresets.join(', ')} onChange={(e) => setPos({ tipPresets: e.target.value.split(',').map((x) => parseFloat(x)).filter((x) => !isNaN(x)) })} /></SettingRow>
              )}
              <SettingRow label="Service charge (%)" hint="Dine-in only"><input className="form-input" style={{ width: 90 }} type="number" step="0.5" value={cfg.pos.serviceChargePct} onChange={(e) => setPos({ serviceChargePct: parseFloat(e.target.value) || 0 })} /></SettingRow>
              <SettingRow label="…only for parties of at least" hint="0 = every dine-in check"><input className="form-input" style={{ width: 90 }} type="number" value={cfg.pos.serviceChargeMinGuests} onChange={(e) => setPos({ serviceChargeMinGuests: parseInt(e.target.value) || 0 })} /></SettingRow>
              <SettingRow label="Cash rounding increment" hint="e.g. 0.05 (CA/AU/NL), 1 (IN), 0 = none"><input className="form-input" style={{ width: 90 }} type="number" step="0.01" value={cfg.pos.cashRounding} onChange={(e) => setPos({ cashRounding: parseFloat(e.target.value) || 0 })} /></SettingRow>
              <div style={{ marginTop: 12 }}><button className="btn btn-primary btn-sm" disabled={saving || !cfg.orderTypes.length} onClick={() => saveConfig({ serviceModel: cfg.serviceModel, orderTypes: cfg.orderTypes, pos: cfg.pos })}>Save service settings</button></div>
            </section>
          )}

          {tab === 'modules' && cfg && (
            <section className="settings-section">
              <h2 className="settings-section-title">Modules</h2>
              <p className="settings-section-desc">Switch capabilities on as you grow. Navigation, POS and permissions adapt instantly for everyone.</p>
              {MODULE_INFO.map((m) => (
                <SettingRow key={m.key} label={m.label} hint={m.desc}>
                  <Toggle size="sm" on={!!cfg.modules[m.key]} onChange={(v) => setCfg({ ...cfg, modules: { ...cfg.modules, [m.key]: v } })} />
                </SettingRow>
              ))}
              <div style={{ marginTop: 12 }}><button className="btn btn-primary btn-sm" disabled={saving} onClick={() => saveConfig({ modules: cfg.modules })}>Save modules</button></div>
            </section>
          )}

          {tab === 'security' && cfg && (
            <section className="settings-section">
              <h2 className="settings-section-title">Security & approvals</h2>
              <SettingRow label="Voids of sent items need a manager" hint="Unsent items can always be removed"><Toggle size="sm" on={cfg.security.voidRequiresManager} onChange={(v) => setSec({ voidRequiresManager: v })} /></SettingRow>
              <SettingRow label="Refunds need a manager"><Toggle size="sm" on={cfg.security.refundRequiresManager} onChange={(v) => setSec({ refundRequiresManager: v })} /></SettingRow>
              <SettingRow label="Max discount without approval (%)" hint="Fixed-amount discounts always need approval"><input className="form-input" style={{ width: 90 }} type="number" value={cfg.security.maxDiscountPctWithoutApproval} onChange={(e) => setSec({ maxDiscountPctWithoutApproval: parseFloat(e.target.value) || 0 })} /></SettingRow>
              <SettingRow label="PIN user switching on terminals"><Toggle size="sm" on={cfg.security.pinSwitchUser} onChange={(v) => setSec({ pinSwitchUser: v })} /></SettingRow>
              <div style={{ marginTop: 12 }}><button className="btn btn-primary btn-sm" disabled={saving} onClick={() => saveConfig({ security: cfg.security })}>Save security</button></div>
            </section>
          )}

          {tab === 'loyalty' && cfg && (
            <div className="settings-sections">
              <section className="settings-section">
                <h2 className="settings-section-title">Loyalty programme</h2>
                {!cfg.modules.loyalty && <p className="small text-warning" style={{ marginBottom: 8 }}>Loyalty module is off — enable it under Modules.</p>}
                <SettingRow label="Points earned per 1 unit of currency"><input className="form-input" style={{ width: 90 }} type="number" step="0.1" value={cfg.loyalty.pointsPerUnit} onChange={(e) => setCfg({ ...cfg, loyalty: { ...cfg.loyalty, pointsPerUnit: parseFloat(e.target.value) || 0 } })} /></SettingRow>
                <SettingRow label="Value of 1 point (currency)"><input className="form-input" style={{ width: 90 }} type="number" step="0.001" value={cfg.loyalty.pointValue} onChange={(e) => setCfg({ ...cfg, loyalty: { ...cfg.loyalty, pointValue: parseFloat(e.target.value) || 0 } })} /></SettingRow>
                <SettingRow label="Minimum points to redeem"><input className="form-input" style={{ width: 90 }} type="number" value={cfg.loyalty.minRedeemPoints} onChange={(e) => setCfg({ ...cfg, loyalty: { ...cfg.loyalty, minRedeemPoints: parseInt(e.target.value) || 0 } })} /></SettingRow>
              </section>
              <section className="settings-section">
                <h2 className="settings-section-title">Receipts</h2>
                <Field label="Header line"><input className="form-input" value={cfg.receipt.header} onChange={(e) => setCfg({ ...cfg, receipt: { ...cfg.receipt, header: e.target.value } })} /></Field>
                <Field label="Footer line"><input className="form-input" value={cfg.receipt.footer} onChange={(e) => setCfg({ ...cfg, receipt: { ...cfg.receipt, footer: e.target.value } })} /></Field>
                <SettingRow label="Show tax breakdown" hint="Required on VAT/GST invoices in many countries"><Toggle size="sm" on={cfg.receipt.showTaxBreakdown} onChange={(v) => setCfg({ ...cfg, receipt: { ...cfg.receipt, showTaxBreakdown: v } })} /></SettingRow>
              </section>
              <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary btn-sm" disabled={saving} onClick={() => saveConfig({ loyalty: cfg.loyalty, receipt: cfg.receipt })}>Save</button></div>
            </div>
          )}

          {tab === 'audit' && <AuditTab />}
          {tab === 'account' && <AccountTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {!cfg && admin && tab !== 'appearance' && tab !== 'account' && <div className="settings-placeholder"><IconLock size={32} opacity={0.3} /><p>Loading…</p></div>}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
