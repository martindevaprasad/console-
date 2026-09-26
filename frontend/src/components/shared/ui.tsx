import React, { useEffect, useState } from 'react';
import { IconX, IconSearch, IconShieldLock, IconBackspace } from '@tabler/icons-react';
import Modal from './Modal';

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
  <div className="page-header">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="row row-wrap">{actions}</div>}
  </div>
);

export interface TabDef<K extends string = string> { key: K; label: string; icon?: React.ReactNode; count?: number; hidden?: boolean }

export function Tabs<K extends string>({ tabs, active, onChange }: { tabs: TabDef<K>[]; active: K; onChange: (k: any) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.filter((t) => !t.hidden).map((t) => (
        <button key={t.key} role="tab" className={`tab${active === t.key ? ' active' : ''}`} onClick={() => onChange(t.key)}>
          {t.icon}{t.label}{t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { value: K; label: React.ReactNode }[]; value: K; onChange: (v: any) => void }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export const Drawer: React.FC<{ open: boolean; title: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({ open, title, onClose, children, footer, wide }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className={`drawer${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div className="drawer-title">{title}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><IconX size={14} /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </div>
  );
};

export const Kpi: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'accent'; trend?: 'up' | 'down'; icon?: React.ReactNode }> = ({ label, value, sub, tone, trend, icon }) => (
  <div className={`kpi${tone ? ` ${tone}` : ''}`}>
    <div className="kpi-label">{icon}{label}</div>
    <div className="kpi-value">{value}</div>
    {sub !== undefined && <div className={`kpi-sub${trend ? ` ${trend}` : ''}`}>{sub}</div>}
  </div>
);

export const Empty: React.FC<{ icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }> = ({ icon, title, hint, action }) => (
  <div className="empty-state">
    {icon && <div className="empty-state-icon">{icon}</div>}
    <div className="empty-state-title">{title}</div>
    {hint && <p className="small muted" style={{ marginBottom: action ? 12 : 0 }}>{hint}</p>}
    {action}
  </div>
);

export const Field: React.FC<{ label: string; hint?: string; full?: boolean; children: React.ReactNode }> = ({ label, hint, full, children }) => (
  <div className={`form-group${full ? ' full' : ''}`}>
    <label className="form-label">{label}</label>
    {children}
    {hint && <span className="form-hint">{hint}</span>}
  </div>
);

export const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; disabled?: boolean; size?: 'sm' }> = ({ on, onChange, disabled, size }) => (
  <button type="button" className={`toggle-switch${size ? ` ${size}` : ''}${on ? ' on' : ''}`} onClick={() => !disabled && onChange(!on)} disabled={disabled} aria-pressed={on}>
    <span className="toggle-knob" />
  </button>
);

export const SettingRow: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="setting-row">
    <div>
      <div className="setting-row-label">{label}</div>
      {hint && <div className="setting-row-hint">{hint}</div>}
    </div>
    <div>{children}</div>
  </div>
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }> = ({ value, onChange, placeholder, autoFocus }) => (
  <div className="search-input-wrapper">
    <span className="search-icon" style={{ display: 'flex' }}><IconSearch size={14} /></span>
    <input className="form-input search-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'Search…'} autoFocus={autoFocus} />
  </div>
);

export const StatusBadge: React.FC<{ value: string; map: Record<string, string> }> = ({ value, map }) => (
  <span className={`badge ${map[value] || 'badge-neutral'}`}>{value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>
);

export const PinPad: React.FC<{ value: string; onChange: (v: string) => void; onSubmit?: () => void; length?: number }> = ({ value, onChange, onSubmit, length = 6 }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key) && value.length < length) onChange(value + e.key);
      else if (e.key === 'Backspace') onChange(value.slice(0, -1));
      else if (e.key === 'Enter' && onSubmit) onSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onChange, onSubmit, length]);
  return (
    <div>
      <div className="pin-display">
        {Array.from({ length: Math.max(4, value.length) }, (_, i) => <span key={i} className={i < value.length ? 'filled' : ''} />)}
      </div>
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => value.length < length && onChange(value + d)}>{d}</button>
        ))}
        <button type="button" onClick={() => onChange('')} style={{ fontSize: 12 }}>Clear</button>
        <button type="button" onClick={() => value.length < length && onChange(value + '0')}>0</button>
        <button type="button" onClick={() => onChange(value.slice(0, -1))} aria-label="Backspace"><IconBackspace size={18} /></button>
      </div>
    </div>
  );
};

/**
 * Manager approval prompt. Resolves with the approver's PIN.
 * Use via `const approve = useApproval(); const pin = await approve('Void item');`
 */
export const ApprovalModal: React.FC<{ open: boolean; reason: string; onDone: (pin: string | null) => void }> = ({ open, reason, onDone }) => {
  const [pin, setPin] = useState('');
  useEffect(() => { if (open) setPin(''); }, [open]);
  return (
    <Modal
      isOpen={open}
      onClose={() => onDone(null)}
      title="Manager approval"
      footer={<>
        <button className="btn btn-secondary" onClick={() => onDone(null)}>Cancel</button>
        <button className="btn btn-primary" disabled={pin.length < 4} onClick={() => onDone(pin)}><IconShieldLock size={14} /> Approve</button>
      </>}
    >
      <p className="small muted" style={{ textAlign: 'center' }}>{reason}</p>
      <PinPad value={pin} onChange={setPin} onSubmit={() => pin.length >= 4 && onDone(pin)} />
    </Modal>
  );
};

export function useApproval() {
  const [state, setState] = useState<{ reason: string; resolve: (pin: string | null) => void } | null>(null);
  const request = (reason: string) => new Promise<string | null>((resolve) => setState({ reason, resolve }));
  const element = (
    <ApprovalModal
      open={!!state}
      reason={state?.reason || ''}
      onDone={(pin) => { state?.resolve(pin); setState(null); }}
    />
  );
  return { request, element };
}

/**
 * Runs an action; if the server answers APPROVAL_REQUIRED, prompts for a
 * manager PIN and retries with `approverPin`.
 */
export async function withApproval<T>(run: (pin?: string) => Promise<T>, ask: (reason: string) => Promise<string | null>): Promise<T | null> {
  try {
    return await run();
  } catch (e: any) {
    if (e?.code !== 'APPROVAL_REQUIRED') throw e;
    const pin = await ask(e.message);
    if (!pin) return null;
    return run(pin);
  }
}
