import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconCheck, IconArrowLeft, IconArrowRight, IconPlus, IconTrash, IconRocket, IconToolsKitchen2,
  IconCoffee, IconBurger, IconGlassFull, IconTruck, IconBuildingSkyscraper, IconCake, IconBowl,
  IconBuildingStore, IconChefHat, IconConfetti, IconBed,
} from '@tabler/icons-react';
import { useApi, useAuth, useMutate, useOrg } from '@/hooks';
import { useSessionLoader } from '@/hooks/useSession';
import { ORG_API } from '@/services/api';
import { MODULE_INFO, ORDER_TYPE_LABELS, ALL_ORDER_TYPES } from '@/lib/constants';
import { Field, Segmented, Toggle, SettingRow } from '../shared/ui';
import LoadingSpinner from '../shared/LoadingSpinner';
import { MageOS } from '../layout/AppSvgs';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  FINE_DINING: <IconChefHat size={16} />, CASUAL_DINING: <IconToolsKitchen2 size={16} />, RESTAURANT: <IconBuildingStore size={16} />,
  QUICK_SERVICE: <IconBurger size={16} />, CAFE: <IconCoffee size={16} />, BAKERY: <IconCake size={16} />, BAR_PUB: <IconGlassFull size={16} />,
  FOOD_TRUCK: <IconTruck size={16} />, CLOUD_KITCHEN: <IconBowl size={16} />, FOOD_COURT: <IconBuildingStore size={16} />,
  CATERING: <IconConfetti size={16} />, HOTEL_RESTAURANT: <IconBed size={16} />,
};

const DEFAULT_MODULES: Record<string, boolean> = {
  tables: true, reservations: true, kds: true, inventory: true, recipes: false, purchasing: false,
  customers: true, loyalty: false, promotions: true, cashManagement: true, timeclock: true,
  onlineOrdering: false, multiLocation: false,
};

const STEPS = ['Business type', 'Scale', 'Region & tax', 'Locations', 'Service & modules', 'Menu & team', 'Review'];

interface TeamRow { name: string; email: string; password: string; role: string; pin: string }

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const mutate = useMutate();
  const loadSession = useSessionLoader();
  const { user } = useAuth();
  const { org } = useOrg();
  const { data, loading } = useApi(ORG_API.PRESETS);
  const presets = data?.platformPresets;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    type: org?.type || 'RESTAURANT',
    size: 'SMALL',
    businessName: org?.name || '',
    legalName: '',
    phone: '',
    email: user?.email || '',
    address: '',
    country: 'US',
    currency: 'USD',
    locale: 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    taxLabel: 'Sales Tax',
    taxRate: 8.875,
    taxInclusive: false,
    serviceModel: 'HYBRID',
    orderTypes: ['DINE_IN', 'TAKEAWAY'] as string[],
    modules: { ...DEFAULT_MODULES },
    loadSampleMenu: true,
    createFloorPlan: true,
    ownerPin: '',
  });
  const [locations, setLocations] = useState([{ name: 'Main Branch', address: '', city: '' }]);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));

  const typeDef = useMemo(() => presets?.businessTypes.find((t: any) => t.key === f.type), [presets, f.type]);

  // Re-derive service defaults whenever format or scale changes.
  useEffect(() => {
    if (!presets || !typeDef) return;
    const size = presets.sizes.find((s: any) => s.key === f.size);
    const modules = { ...DEFAULT_MODULES, ...typeDef.modules, ...(size?.modules || {}) };
    if (typeDef.modules.tables === false) modules.tables = false;
    if (typeDef.modules.reservations === false) modules.reservations = false;
    set({ serviceModel: typeDef.serviceModel, orderTypes: typeDef.orderTypes, modules, createFloorPlan: modules.tables });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presets, f.type, f.size]);

  useEffect(() => {
    if (locations.length > 1) set({ modules: { ...f.modules, multiLocation: true } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations.length]);

  const applyCountry = (code: string) => {
    const c = presets?.countries.find((x: any) => x.code === code);
    if (!c) return set({ country: code });
    set({ country: c.code, currency: c.currency, locale: c.locale, timezone: c.timezone, taxLabel: c.taxLabel, taxRate: c.taxRate, taxInclusive: c.taxInclusive });
  };

  const canNext = () => {
    if (step === 2) return !!f.businessName.trim() && f.taxRate >= 0;
    if (step === 3) return locations.every((l) => l.name.trim());
    if (step === 4) return f.orderTypes.length > 0;
    if (step === 5) return team.every((t) => t.name && t.email && t.password.length >= 8 && (!t.pin || /^\d{4,6}$/.test(t.pin))) && (!f.ownerPin || /^\d{4,6}$/.test(f.ownerPin));
    return true;
  };

  const submit = async () => {
    setSaving(true);
    try {
      await mutate(ORG_API.ONBOARD, {
        input: {
          businessName: f.businessName.trim(), legalName: f.legalName || null, type: f.type, size: f.size,
          country: f.country, currency: f.currency, locale: f.locale, timezone: f.timezone,
          taxLabel: f.taxLabel, taxRate: Number(f.taxRate), taxInclusive: f.taxInclusive,
          phone: f.phone || null, email: f.email || null, address: f.address || null,
          serviceModel: f.serviceModel, orderTypes: f.orderTypes, modules: f.modules,
          locations: locations.map((l) => ({ name: l.name.trim(), address: l.address || null, city: l.city || null })),
          loadSampleMenu: f.loadSampleMenu, createFloorPlan: f.createFloorPlan && f.modules.tables,
          team: team.map((t) => ({ ...t, pin: t.pin || null })), ownerPin: f.ownerPin || null,
        },
      });
      await loadSession();
      toast.success('Your business is configured and ready to trade!');
      navigate('/');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    try {
      await mutate(ORG_API.UPDATE, { input: { onboardingCompleted: true } });
      await loadSession();
      navigate('/');
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading || !presets) return <LoadingSpinner fullPage text="Loading business templates..." />;

  return (
    <div className="onb-shell">
      <aside className="onb-steps">
        <div className="row" style={{ marginBottom: 20 }}>
          <MageOS />
          <div>
            <div className="sidebar-logo-text">MageOS</div>
            <div className="small muted">Business setup</div>
          </div>
        </div>
        {STEPS.map((s, i) => (
          <div key={s} className={`onb-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
            <span className="onb-step-num">{i < step ? <IconCheck size={11} /> : i + 1}</span>{s}
          </div>
        ))}
        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={skip}>Skip setup for now</button>
      </aside>

      <main className="onb-main">
        {step === 0 && (
          <>
            <div className="onb-title">What kind of business are you running?</div>
            <div className="onb-sub">We pre-configure service flow, kitchen stations, order types and modules for your format. Everything stays editable later.</div>
            <div className="pick-grid">
              {presets.businessTypes.map((t: any) => (
                <button key={t.key} className={`pick-card${f.type === t.key ? ' selected' : ''}`} onClick={() => set({ type: t.key })}>
                  <div className="pick-card-title">{TYPE_ICONS[t.key]}{t.label}</div>
                  <div className="pick-card-desc">{t.description}</div>
                  <div className="small muted" style={{ marginTop: 4 }}>{t.orderTypes.map((o: string) => ORDER_TYPE_LABELS[o]).join(' · ')}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="onb-title">How big is your operation?</div>
            <div className="onb-sub">Scale unlocks multi-location control, purchasing, labour and enterprise reporting.</div>
            <div className="pick-grid">
              {presets.sizes.map((s: any) => (
                <button key={s.key} className={`pick-card${f.size === s.key ? ' selected' : ''}`} onClick={() => set({ size: s.key })}>
                  <div className="pick-card-title">{s.key === 'ENTERPRISE' ? <IconBuildingSkyscraper size={16} /> : <IconBuildingStore size={16} />}{s.label}</div>
                  <div className="pick-card-desc">{s.description}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="onb-title">Business profile, region & tax</div>
            <div className="onb-sub">Pick your country to load currency, timezone and tax rules. VAT/GST countries use tax-inclusive menu prices.</div>
            <div className="form-grid">
              <Field label="Business / brand name"><input className="form-input" value={f.businessName} onChange={(e) => set({ businessName: e.target.value })} /></Field>
              <Field label="Legal entity name"><input className="form-input" value={f.legalName} onChange={(e) => set({ legalName: e.target.value })} placeholder="Optional" /></Field>
              <Field label="Country">
                <select className="form-select" value={f.country} onChange={(e) => applyCountry(e.target.value)}>
                  {presets.countries.map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Currency"><input className="form-input" value={f.currency} maxLength={3} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} /></Field>
              <Field label="Locale" hint="Controls number & date formats"><input className="form-input" value={f.locale} onChange={(e) => set({ locale: e.target.value })} /></Field>
              <Field label="Timezone"><input className="form-input" value={f.timezone} onChange={(e) => set({ timezone: e.target.value })} /></Field>
              <Field label="Tax name"><input className="form-input" value={f.taxLabel} onChange={(e) => set({ taxLabel: e.target.value })} /></Field>
              <Field label="Default tax rate (%)"><input type="number" step="0.001" className="form-input" value={f.taxRate} onChange={(e) => set({ taxRate: parseFloat(e.target.value) || 0 })} /></Field>
              <div className="full">
                <SettingRow label="Menu prices include tax" hint="On for VAT/GST markets (UK, EU, AU, UAE…). Off for US/Canada-style tax added at checkout.">
                  <Toggle on={f.taxInclusive} onChange={(v) => set({ taxInclusive: v })} />
                </SettingRow>
              </div>
              <Field label="Phone"><input className="form-input" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
              <Field label="Email"><input className="form-input" value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
              <Field label="Head office address" full><input className="form-input" value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="onb-title">Your locations</div>
            <div className="onb-sub">Each location gets its own kitchen stations, floor plan, POS device and cash drawer. The first is your head office.</div>
            <div className="stack">
              {locations.map((l, i) => (
                <div key={i} className="card row" style={{ alignItems: 'flex-end' }}>
                  <Field label={i === 0 ? 'Name (head office)' : 'Name'}><input className="form-input" value={l.name} onChange={(e) => setLocations(locations.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></Field>
                  <Field label="Address"><input className="form-input" value={l.address} onChange={(e) => setLocations(locations.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} /></Field>
                  <Field label="City"><input className="form-input" value={l.city} onChange={(e) => setLocations(locations.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))} /></Field>
                  {locations.length > 1 && (
                    <button className="btn btn-danger btn-icon" style={{ marginBottom: 12 }} onClick={() => setLocations(locations.filter((_, j) => j !== i))}><IconTrash size={14} /></button>
                  )}
                </div>
              ))}
              <div><button className="btn btn-secondary" onClick={() => setLocations([...locations, { name: `Branch ${locations.length + 1}`, address: '', city: '' }])}><IconPlus size={14} /> Add location</button></div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="onb-title">Service style & modules</div>
            <div className="onb-sub">Recommended for <strong>{typeDef?.label}</strong> at your scale. Toggle anything you don't need — the menu and POS adapt automatically.</div>
            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="card">
                <div className="form-section-title" style={{ marginTop: 0 }}>Service model</div>
                <Segmented
                  value={f.serviceModel}
                  onChange={(v) => set({ serviceModel: v })}
                  options={[{ value: 'TABLE_SERVICE', label: 'Table service' }, { value: 'COUNTER', label: 'Counter' }, { value: 'HYBRID', label: 'Hybrid' }, { value: 'DELIVERY_ONLY', label: 'Delivery only' }]}
                />
                <div className="form-section-title">Order types</div>
                <div className="row row-wrap">
                  {ALL_ORDER_TYPES.map((t) => (
                    <label key={t} className="check">
                      <input type="checkbox" checked={f.orderTypes.includes(t)} onChange={(e) => set({ orderTypes: e.target.checked ? [...f.orderTypes, t] : f.orderTypes.filter((x) => x !== t) })} />
                      {ORDER_TYPE_LABELS[t]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="form-section-title" style={{ marginTop: 0 }}>Modules</div>
                {MODULE_INFO.map((m) => (
                  <SettingRow key={m.key} label={m.label} hint={m.desc}>
                    <Toggle size="sm" on={!!f.modules[m.key]} onChange={(v) => set({ modules: { ...f.modules, [m.key]: v } })} />
                  </SettingRow>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="onb-title">Starter menu & team</div>
            <div className="onb-sub">Load a starter menu for your format (with stations, modifiers and tax mapped), and invite your team with POS PINs.</div>
            <div className="card" style={{ marginBottom: 12 }}>
              <SettingRow label="Load starter menu" hint={`Sample ${typeDef?.label} categories, items and modifiers. Edit or delete anytime.`}>
                <Toggle on={f.loadSampleMenu} onChange={(v) => set({ loadSampleMenu: v })} />
              </SettingRow>
              {f.modules.tables && (
                <SettingRow label="Create a floor plan" hint="Zones and tables laid out automatically; rearrange in the floor editor.">
                  <Toggle on={f.createFloorPlan} onChange={(v) => set({ createFloorPlan: v })} />
                </SettingRow>
              )}
              <SettingRow label="Your POS PIN" hint="4–6 digits for fast sign-in and manager approvals">
                <input className="form-input" style={{ width: 110 }} value={f.ownerPin} maxLength={6} inputMode="numeric" onChange={(e) => set({ ownerPin: e.target.value.replace(/\D/g, '') })} />
              </SettingRow>
            </div>
            <div className="card">
              <div className="card-head"><div className="card-title">Team members</div>
                <button className="btn btn-secondary btn-sm" onClick={() => setTeam([...team, { name: '', email: '', password: '', role: 'STAFF', pin: '' }])}><IconPlus size={12} /> Add</button>
              </div>
              {!team.length && <p className="small muted">You can also add staff later from People → Staff.</p>}
              {team.map((t, i) => (
                <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
                  <Field label="Name"><input className="form-input" value={t.name} onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></Field>
                  <Field label="Email"><input className="form-input" value={t.email} onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} /></Field>
                  <Field label="Temp password"><input className="form-input" type="password" value={t.password} onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, password: e.target.value } : x)))} /></Field>
                  <Field label="Role">
                    <select className="form-select" value={t.role} onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                      <option value="MANAGER">Manager</option><option value="SHIFT_LEAD">Shift lead</option><option value="STAFF">Staff</option>
                    </select>
                  </Field>
                  <Field label="PIN"><input className="form-input" style={{ width: 80 }} value={t.pin} maxLength={6} onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, pin: e.target.value.replace(/\D/g, '') } : x)))} /></Field>
                  <button className="btn btn-danger btn-icon" style={{ marginBottom: 12 }} onClick={() => setTeam(team.filter((_, j) => j !== i))}><IconTrash size={14} /></button>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <div className="onb-title">Review & launch</div>
            <div className="onb-sub">Confirm your configuration. You can change every setting later under Settings.</div>
            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 8 }}>Business</div>
                <table className="data-table"><tbody>
                  <tr><td className="muted">Name</td><td>{f.businessName}</td></tr>
                  <tr><td className="muted">Format</td><td>{typeDef?.label}</td></tr>
                  <tr><td className="muted">Scale</td><td>{presets.sizes.find((s: any) => s.key === f.size)?.label}</td></tr>
                  <tr><td className="muted">Region</td><td>{f.country} · {f.currency} · {f.timezone}</td></tr>
                  <tr><td className="muted">Tax</td><td>{f.taxLabel} {f.taxRate}% {f.taxInclusive ? '(inclusive)' : '(added at checkout)'}</td></tr>
                  <tr><td className="muted">Locations</td><td>{locations.map((l) => l.name).join(', ')}</td></tr>
                  <tr><td className="muted">Team</td><td>{team.length} invited</td></tr>
                </tbody></table>
              </div>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 8 }}>Operations</div>
                <p className="small"><span className="muted">Service:</span> {f.serviceModel.replace('_', ' ').toLowerCase()}</p>
                <p className="small"><span className="muted">Order types:</span> {f.orderTypes.map((o) => ORDER_TYPE_LABELS[o]).join(', ')}</p>
                <div className="row row-wrap" style={{ marginTop: 8 }}>
                  {MODULE_INFO.filter((m) => f.modules[m.key]).map((m) => <span key={m.key} className="badge badge-primary">{m.label}</span>)}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="onb-foot">
          <button className="btn btn-secondary" disabled={step === 0} onClick={() => setStep(step - 1)}><IconArrowLeft size={14} /> Back</button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" disabled={!canNext()} onClick={() => setStep(step + 1)}>Continue <IconArrowRight size={14} /></button>
          ) : (
            <button className="btn btn-primary" disabled={saving} onClick={submit}>
              {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Configuring…</> : <><IconRocket size={14} /> Launch my business</>}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default OnboardingWizard;
