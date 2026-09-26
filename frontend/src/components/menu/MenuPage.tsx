import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconTrash, IconToolsKitchen2, IconCategory, IconAdjustments, IconReceiptTax, IconDownload } from '@tabler/icons-react';
import { useApi, useCan, useLocation, useModule, useMutate, useOrg } from '@/hooks';
import { CATALOG, INVENTORY } from '@/services/api';
import { money, pct, downloadCsv, label } from '@/lib/format';
import { CHANNELS, DIETARY } from '@/lib/constants';
import { PageHeader, Tabs, SearchBox, Drawer, Field, Empty, Toggle, SettingRow } from '../shared/ui';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';

type Tab = 'items' | 'categories' | 'modifiers' | 'taxes';
const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#94a3b8'];

// ------------------------------------------------------------------ Items

const ProductDrawer: React.FC<{ product: any | null; open: boolean; categories: any[]; onClose: () => void; onSaved: () => void }> = ({ product, open, categories, onClose, onSaved }) => {
  const mutate = useMutate();
  const { settings } = useOrg();
  const { list: locations, current } = useLocation();
  const recipesOn = useModule('recipes');
  const groups = useApi(CATALOG.MODIFIER_GROUPS, {}, { skip: !open });
  const taxes = useApi(CATALOG.TAX_RATES, {}, { skip: !open });
  const stock = useApi(INVENTORY.ITEMS, { locationId: current?.id }, { skip: !open || !recipesOn || !current });
  const recipe = useApi(INVENTORY.RECIPE, { id: product?.id }, { skip: !open || !recipesOn || !product?.id });
  const [f, setF] = useState<any>({});
  const [lines, setLines] = useState<{ stockItemId: string; quantity: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setF(product ? {
      ...product, price: String(product.price), cost: product.cost != null ? String(product.cost) : '',
      modifierGroupIds: product.modifierGroups.map((g: any) => g.id), priceOverrides: product.priceOverrides || {},
    } : {
      name: '', price: '', cost: '', categoryId: categories[0]?.id || '', taxRateId: '', stationId: '', sku: '', barcode: '', color: '',
      isActive: true, trackStock: false, isOpenPrice: false, prepMinutes: '', dietary: [], channels: ['POS', 'ONLINE', 'KIOSK'], modifierGroupIds: [], priceOverrides: {},
    });
  }, [open, product, categories]);

  useEffect(() => {
    setLines((recipe.data?.product?.recipe || []).map((r: any) => ({ stockItemId: r.stockItemId, quantity: String(r.quantity) })));
  }, [recipe.data]);

  const set = (p: any) => setF((x: any) => ({ ...x, ...p }));
  const price = parseFloat(f.price) || 0;
  const cost = parseFloat(f.cost) || 0;
  const recipeCost = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (stock.data?.stockItems.find((i: any) => i.id === l.stockItemId)?.costPerUnit || 0), 0);
  const effectiveCost = lines.length ? recipeCost : cost;
  const margin = price > 0 ? ((price - effectiveCost) / price) * 100 : 0;
  const stations = current?.stations || [];

  const save = async () => {
    const input = {
      name: f.name, description: f.description || null, sku: f.sku || null, barcode: f.barcode || null, price, cost: f.cost === '' ? null : cost,
      color: f.color || null, isActive: f.isActive, trackStock: f.trackStock, isOpenPrice: f.isOpenPrice,
      prepMinutes: f.prepMinutes ? Number(f.prepMinutes) : null, dietary: f.dietary, channels: f.channels,
      categoryId: f.categoryId || null, taxRateId: f.taxRateId || null, stationId: f.stationId || null,
      modifierGroupIds: f.modifierGroupIds,
      priceOverrides: Object.fromEntries(Object.entries(f.priceOverrides || {}).filter(([, v]) => v !== '' && v !== null).map(([k, v]) => [k, Number(v)])),
    };
    try {
      let id = product?.id;
      if (id) await mutate(CATALOG.UPDATE_PRODUCT, { id, input });
      else id = (await mutate(CATALOG.CREATE_PRODUCT, { input })).createProduct.id;
      if (recipesOn && (lines.length || recipe.data?.product?.recipe?.length)) {
        await mutate(INVENTORY.SET_RECIPE, { productId: id, lines: lines.filter((l) => l.stockItemId && parseFloat(l.quantity) > 0).map((l) => ({ stockItemId: l.stockItemId, quantity: parseFloat(l.quantity) })) });
      }
      toast.success('Item saved');
      onSaved();
    } catch (e: any) { toast.error(e.message); }
  };

  const chipToggle = (key: 'dietary' | 'channels' | 'modifierGroupIds', v: string) =>
    set({ [key]: f[key]?.includes(v) ? f[key].filter((x: string) => x !== v) : [...(f[key] || []), v] });

  return (
    <Drawer open={open} onClose={onClose} wide title={product ? `Edit ${product.name}` : 'New menu item'}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!f.name || f.price === ''} onClick={save}>Save item</button></>}>
      <div className="form-grid">
        <Field label="Name" full><input className="form-input" autoFocus value={f.name || ''} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Description" full><input className="form-input" value={f.description || ''} onChange={(e) => set({ description: e.target.value })} /></Field>
        <Field label="Category">
          <select className="form-select" value={f.categoryId || ''} onChange={(e) => set({ categoryId: e.target.value })}>
            <option value="">Uncategorised</option>
            {categories.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Kitchen station (routing)" hint="Routed by station name at every location">
          <select className="form-select" value={f.stationId || ''} onChange={(e) => set({ stationId: e.target.value })}>
            <option value="">No kitchen ticket</option>
            {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Price"><input className="form-input" type="number" step="0.01" value={f.price ?? ''} onChange={(e) => set({ price: e.target.value })} /></Field>
        <Field label="Cost" hint={lines.length ? `Recipe cost ${money(recipeCost)}` : undefined}><input className="form-input" type="number" step="0.01" value={f.cost ?? ''} onChange={(e) => set({ cost: e.target.value })} /></Field>
        <Field label="Tax rate">
          <select className="form-select" value={f.taxRateId || ''} onChange={(e) => set({ taxRateId: e.target.value })}>
            <option value="">Default</option>
            {(taxes.data?.taxRates || []).map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
          </select>
        </Field>
        <Field label="Margin">
          <div className={`form-input ${margin >= 65 ? 'text-success' : margin >= 50 ? 'text-warning' : 'text-danger'}`} style={{ display: 'flex', alignItems: 'center' }}>
            {price ? `${pct(margin)} · food cost ${pct(100 - margin)}` : '—'}
          </div>
        </Field>
        <Field label="SKU"><input className="form-input" value={f.sku || ''} onChange={(e) => set({ sku: e.target.value })} /></Field>
        <Field label="Barcode / PLU"><input className="form-input" value={f.barcode || ''} onChange={(e) => set({ barcode: e.target.value })} /></Field>
        <Field label="Prep time (min)"><input className="form-input" type="number" value={f.prepMinutes || ''} onChange={(e) => set({ prepMinutes: e.target.value })} /></Field>
        <Field label="Button colour">
          <div className="row" style={{ gap: 4 }}>
            {COLORS.map((c) => <button key={c} type="button" onClick={() => set({ color: f.color === c ? '' : c })} style={{ width: 20, height: 20, borderRadius: 5, background: c, border: f.color === c ? '2px solid var(--text-primary)' : '1px solid var(--color-border)', cursor: 'pointer' }} />)}
          </div>
        </Field>
      </div>

      <div className="card" style={{ padding: '4px 12px', marginBottom: 12 }}>
        <SettingRow label="Active" hint="Hidden from POS when off"><Toggle size="sm" on={!!f.isActive} onChange={(v) => set({ isActive: v })} /></SettingRow>
        <SettingRow label="Open price" hint="Cashier enters price at sale (market price, custom cakes)"><Toggle size="sm" on={!!f.isOpenPrice} onChange={(v) => set({ isOpenPrice: v })} /></SettingRow>
        <SettingRow label="Track finished-goods stock" hint="Counts units per location; auto-86 at zero"><Toggle size="sm" on={!!f.trackStock} onChange={(v) => set({ trackStock: v })} /></SettingRow>
      </div>

      <div className="form-section-title">Sales channels</div>
      <div className="row row-wrap" style={{ gap: 4 }}>{CHANNELS.map((c) => <button key={c} className={`chip${f.channels?.includes(c) ? ' active' : ''}`} onClick={() => chipToggle('channels', c)}>{label(c)}</button>)}</div>

      <div className="form-section-title">Dietary & allergens</div>
      <div className="row row-wrap" style={{ gap: 4 }}>{DIETARY.map((c) => <button key={c} className={`chip${f.dietary?.includes(c) ? ' active' : ''}`} onClick={() => chipToggle('dietary', c)}>{label(c)}</button>)}</div>

      <div className="form-section-title">Modifier groups</div>
      <div className="row row-wrap" style={{ gap: 4 }}>
        {(groups.data?.modifierGroups || []).map((g: any) => (
          <button key={g.id} className={`chip${f.modifierGroupIds?.includes(g.id) ? ' active' : ''}`} onClick={() => chipToggle('modifierGroupIds', g.id)}>{g.name}</button>
        ))}
        {!groups.data?.modifierGroups.length && <span className="small muted">Create modifier groups in the Modifiers tab.</span>}
      </div>

      {locations.length > 1 && (
        <>
          <div className="form-section-title">Location price overrides</div>
          <div className="form-grid form-grid-3">
            {locations.map((l) => (
              <Field key={l.id} label={l.name}>
                <input className="form-input" type="number" step="0.01" placeholder={f.price || 'Base'} value={f.priceOverrides?.[l.id] ?? ''}
                  onChange={(e) => set({ priceOverrides: { ...f.priceOverrides, [l.id]: e.target.value } })} />
              </Field>
            ))}
          </div>
        </>
      )}

      {recipesOn && (
        <>
          <div className="form-section-title">Recipe (deducted from stock per sale)</div>
          {lines.map((l, i) => {
            const item = stock.data?.stockItems.find((s: any) => s.id === l.stockItemId);
            return (
              <div key={i} className="row" style={{ marginBottom: 6 }}>
                <select className="form-select" value={l.stockItemId} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, stockItemId: e.target.value } : x)))}>
                  <option value="">Select ingredient…</option>
                  {(stock.data?.stockItems || []).filter((s: any) => s.isActive).map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                </select>
                <input className="form-input" style={{ width: 90 }} type="number" step="0.001" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                <span className="small muted" style={{ width: 70 }}>{item ? money((parseFloat(l.quantity) || 0) * item.costPerUnit) : ''}</span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setLines(lines.filter((_, j) => j !== i))}><IconTrash size={12} /></button>
              </div>
            );
          })}
          <button className="btn btn-secondary btn-sm" onClick={() => setLines([...lines, { stockItemId: '', quantity: '' }])}><IconPlus size={12} /> Add ingredient</button>
        </>
      )}
    </Drawer>
  );
};

const ItemsTab: React.FC = () => {
  const can = useCan();
  const mutate = useMutate();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const { data, loading, reload } = useApi(CATALOG.MENU, {});
  const categories = data?.categories || [];
  const products = useMemo(() => (data?.products || []).filter((p: any) =>
    (!cat || p.categoryId === cat) && (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))), [data, cat, search]);

  const toggleActive = async (p: any) => {
    try { await mutate(CATALOG.UPDATE_PRODUCT, { id: p.id, input: { isActive: !p.isActive } }); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  if (loading && !data) return <LoadingSpinner />;
  return (
    <>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search items or SKU" />
        <select className="form-select" style={{ width: 170 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv('menu.csv', products.map((p: any) => ({ name: p.name, category: p.category?.name, sku: p.sku, price: p.price, cost: p.cost, tax: p.tax?.name, station: p.station?.name, active: p.isActive })))}>
          <IconDownload size={13} /> Export
        </button>
        {can('menu.manage') && <button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}><IconPlus size={13} /> New item</button>}
      </div>
      {!products.length ? <Empty icon={<IconToolsKitchen2 />} title="No menu items" hint="Create your first item or load a starter menu during onboarding." /> : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Item</th><th>Category</th><th>Station</th><th>Options</th><th className="num">Price</th><th className="num">Cost</th><th className="num">Margin</th><th>Active</th></tr></thead>
            <tbody>
              {products.map((p: any) => {
                const c = p.recipeCost ?? p.cost;
                const m = p.price && c != null ? ((p.price - c) / p.price) * 100 : null;
                return (
                  <tr key={p.id} className="clickable" onClick={() => can('menu.manage') && setEditing(p)} style={{ opacity: p.isActive ? 1 : 0.5 }}>
                    <td><span className="dot" style={{ background: p.color || p.category?.color || 'var(--color-primary)', marginRight: 6 }} /><span className="strong">{p.name}</span>
                      {p.dietary.length > 0 && <span className="small muted"> · {p.dietary.map(label).join(', ')}</span>}
                      {p.sku && <div className="small muted mono">{p.sku}</div>}</td>
                    <td>{p.category?.name || '—'}</td>
                    <td>{p.station?.name || '—'}</td>
                    <td className="small">{p.modifierGroups.map((g: any) => g.name).join(', ') || '—'}</td>
                    <td className="num strong">{p.isOpenPrice ? 'Open' : money(p.price)}</td>
                    <td className="num">{c != null ? money(c) : '—'}</td>
                    <td className={`num ${m == null ? '' : m >= 65 ? 'text-success' : m >= 50 ? 'text-warning' : 'text-danger'}`}>{m != null ? pct(m) : '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}><Toggle size="sm" on={p.isActive} disabled={!can('menu.manage')} onChange={() => toggleActive(p)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ProductDrawer open={editing !== undefined} product={editing} categories={categories} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(true); }} />
    </>
  );
};

// ------------------------------------------------------------------ Categories

const CategoriesTab: React.FC = () => {
  const can = useCan();
  const mutate = useMutate();
  const { data, reload } = useApi(CATALOG.MENU, {});
  const [form, setForm] = useState<any | null>(null);

  const save = async () => {
    const input = { name: form.name, description: form.description || null, color: form.color || null, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive };
    try {
      if (form.id) await mutate(CATALOG.UPDATE_CATEGORY, { id: form.id, input });
      else await mutate(CATALOG.CREATE_CATEGORY, { input });
      setForm(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <div className="toolbar"><div className="spacer" />{can('menu.manage') && <button className="btn btn-primary btn-sm" onClick={() => setForm({ name: '', color: COLORS[0], sortOrder: (data?.categories.length || 0), isActive: true })}><IconPlus size={13} /> New category</button>}</div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Order</th><th>Category</th><th>Description</th><th className="num">Items</th><th>Status</th></tr></thead>
          <tbody>
            {(data?.categories || []).map((c: any) => (
              <tr key={c.id} className="clickable" onClick={() => can('menu.manage') && setForm({ ...c })}>
                <td>{c.sortOrder}</td>
                <td><span className="dot" style={{ background: c.color || 'var(--color-primary)', marginRight: 6 }} /><span className="strong">{c.name}</span></td>
                <td className="muted">{c.description || '—'}</td>
                <td className="num">{c.productCount}</td>
                <td><span className={`badge ${c.isActive ? 'badge-success' : 'badge-neutral'}`}>{c.isActive ? 'Active' : 'Hidden'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit category' : 'New category'}
        footer={<>{form?.id && <button className="btn btn-danger" onClick={async () => { await mutate(CATALOG.DELETE_CATEGORY, { id: form.id }); setForm(null); reload(true); }}>Hide</button>}<div className="spacer" />
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={!form?.name} onClick={save}>Save</button></>}>
        {form && (
          <div className="form-grid">
            <Field label="Name"><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Sort order"><input className="form-input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>
            <Field label="Description" full><input className="form-input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Colour" full>
              <div className="row" style={{ gap: 4 }}>{COLORS.map((c) => <button key={c} onClick={() => setForm({ ...form, color: c })} style={{ width: 22, height: 22, borderRadius: 5, background: c, border: form.color === c ? '2px solid var(--text-primary)' : '1px solid var(--color-border)', cursor: 'pointer' }} />)}</div>
            </Field>
            <div className="full"><SettingRow label="Visible on POS"><Toggle size="sm" on={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /></SettingRow></div>
          </div>
        )}
      </Modal>
    </>
  );
};

// ------------------------------------------------------------------ Modifiers

const ModifiersTab: React.FC = () => {
  const can = useCan();
  const mutate = useMutate();
  const { data, reload } = useApi(CATALOG.MODIFIER_GROUPS);
  const [form, setForm] = useState<any | null>(null);

  const save = async () => {
    const input = {
      name: form.name, minSelect: Number(form.minSelect), maxSelect: Number(form.maxSelect), isActive: form.isActive,
      modifiers: form.modifiers.filter((m: any) => m.name).map((m: any) => ({ id: m.id || null, name: m.name, price: parseFloat(m.price) || 0, isDefault: !!m.isDefault, isActive: m.isActive ?? true })),
    };
    try {
      if (form.id) await mutate(CATALOG.UPDATE_GROUP, { id: form.id, input });
      else await mutate(CATALOG.CREATE_GROUP, { input });
      setForm(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <div className="toolbar">
        <p className="small muted">Modifier groups power sizes, add-ons, cooking temperatures, milk choices and combos. Attach them to items in the item editor.</p>
        <div className="spacer" />
        {can('menu.manage') && <button className="btn btn-primary btn-sm" onClick={() => setForm({ name: '', minSelect: 0, maxSelect: 1, isActive: true, modifiers: [{ name: '', price: '0' }] })}><IconPlus size={13} /> New group</button>}
      </div>
      {!data?.modifierGroups.length ? <Empty icon={<IconAdjustments />} title="No modifier groups" /> : (
        <div className="grid-auto">
          {data.modifierGroups.map((g: any) => (
            <div key={g.id} className="card" style={{ cursor: 'pointer', opacity: g.isActive ? 1 : 0.5 }} onClick={() => can('menu.manage') && setForm({ ...g, modifiers: g.modifiers.map((m: any) => ({ ...m, price: String(m.price) })) })}>
              <div className="card-head">
                <div className="card-title">{g.name}</div>
                <span className={`badge ${g.minSelect > 0 ? 'badge-warning' : 'badge-neutral'}`}>{g.minSelect > 0 ? 'Required' : 'Optional'} · max {g.maxSelect}</span>
              </div>
              <div className="row row-wrap" style={{ gap: 4 }}>
                {g.modifiers.map((m: any) => <span key={m.id} className="badge badge-primary">{m.name}{m.price ? ` +${money(m.price)}` : ''}</span>)}
              </div>
              <div className="small muted" style={{ marginTop: 8 }}>Used on {g.productIds.length} items</div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit modifier group' : 'New modifier group'} size="lg"
        footer={<>{form?.id && <button className="btn btn-danger" onClick={async () => { await mutate(CATALOG.DELETE_GROUP, { id: form.id }); setForm(null); reload(true); }}>Delete</button>}<div className="spacer" />
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={!form?.name} onClick={save}>Save</button></>}>
        {form && (
          <>
            <div className="form-grid form-grid-3">
              <Field label="Group name"><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Size, Add-ons" /></Field>
              <Field label="Min selections" hint="1+ makes it required"><input className="form-input" type="number" min={0} value={form.minSelect} onChange={(e) => setForm({ ...form, minSelect: e.target.value })} /></Field>
              <Field label="Max selections"><input className="form-input" type="number" min={1} value={form.maxSelect} onChange={(e) => setForm({ ...form, maxSelect: e.target.value })} /></Field>
            </div>
            <div className="form-section-title">Options</div>
            {form.modifiers.map((m: any, i: number) => (
              <div key={i} className="row" style={{ marginBottom: 6 }}>
                <input className="form-input" placeholder="Option name" value={m.name} onChange={(e) => setForm({ ...form, modifiers: form.modifiers.map((x: any, j: number) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <input className="form-input" style={{ width: 100 }} type="number" step="0.01" placeholder="+ price" value={m.price} onChange={(e) => setForm({ ...form, modifiers: form.modifiers.map((x: any, j: number) => (j === i ? { ...x, price: e.target.value } : x)) })} />
                <label className="check"><input type="checkbox" checked={!!m.isDefault} onChange={(e) => setForm({ ...form, modifiers: form.modifiers.map((x: any, j: number) => (j === i ? { ...x, isDefault: e.target.checked } : x)) })} />Default</label>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setForm({ ...form, modifiers: form.modifiers.filter((_: any, j: number) => j !== i) })}><IconTrash size={12} /></button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, modifiers: [...form.modifiers, { name: '', price: '0' }] })}><IconPlus size={12} /> Add option</button>
          </>
        )}
      </Modal>
    </>
  );
};

// ------------------------------------------------------------------ Taxes

const TaxesTab: React.FC = () => {
  const can = useCan();
  const mutate = useMutate();
  const { org } = useOrg();
  const { data, reload } = useApi(CATALOG.TAX_RATES);
  const [form, setForm] = useState<any | null>(null);

  const save = async () => {
    const input = { name: form.name, rate: parseFloat(form.rate) || 0, isDefault: !!form.isDefault, isActive: form.isActive ?? true };
    try {
      if (form.id) await mutate(CATALOG.UPDATE_TAX, { id: form.id, input });
      else await mutate(CATALOG.CREATE_TAX, { input });
      setForm(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <div className="toolbar">
        <p className="small muted">Prices are {org?.taxInclusive ? <strong>tax-inclusive</strong> : <strong>tax-exclusive</strong>} (change under Settings → Localization & tax). Assign per-item rates for reduced/zero-rated items, alcohol, takeaway, etc.</p>
        <div className="spacer" />
        {can('menu.manage', 'settings.manage') && <button className="btn btn-primary btn-sm" onClick={() => setForm({ name: '', rate: '', isDefault: false, isActive: true })}><IconPlus size={13} /> New tax rate</button>}
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th className="num">Rate</th><th>Default</th><th>Status</th></tr></thead>
          <tbody>
            {(data?.taxRates || []).map((t: any) => (
              <tr key={t.id} className="clickable" onClick={() => setForm({ ...t, rate: String(t.rate) })}>
                <td className="strong">{t.name}</td><td className="num">{t.rate}%</td>
                <td>{t.isDefault && <span className="badge badge-primary">Default</span>}</td>
                <td><span className={`badge ${t.isActive ? 'badge-success' : 'badge-neutral'}`}>{t.isActive ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
            {!data?.taxRates.length && <tr><td colSpan={4} className="muted small">No tax rates yet — items fall back to the organization rate ({org?.taxRate}%).</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit tax rate' : 'New tax rate'}
        footer={<>{form?.id && <button className="btn btn-danger" onClick={async () => { await mutate(CATALOG.DELETE_TAX, { id: form.id }); setForm(null); reload(true); }}>Delete</button>}<div className="spacer" />
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={!form?.name || form?.rate === ''} onClick={save}>Save</button></>}>
        {form && (
          <div className="form-grid">
            <Field label="Name"><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. VAT Standard, GST 5%" /></Field>
            <Field label="Rate (%)"><input className="form-input" type="number" step="0.001" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></Field>
            <div className="full">
              <SettingRow label="Default rate" hint="Applied to items without a specific rate"><Toggle size="sm" on={!!form.isDefault} onChange={(v) => setForm({ ...form, isDefault: v })} /></SettingRow>
              <SettingRow label="Active"><Toggle size="sm" on={form.isActive ?? true} onChange={(v) => setForm({ ...form, isActive: v })} /></SettingRow>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export const MenuPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('items');
  return (
    <div className="page-container">
      <PageHeader title="Menu" subtitle="Central catalog shared by every location and channel" />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'items', label: 'Items', icon: <IconToolsKitchen2 size={13} /> },
        { key: 'categories', label: 'Categories', icon: <IconCategory size={13} /> },
        { key: 'modifiers', label: 'Modifiers', icon: <IconAdjustments size={13} /> },
        { key: 'taxes', label: 'Tax rates', icon: <IconReceiptTax size={13} /> },
      ]} />
      {tab === 'items' && <ItemsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'modifiers' && <ModifiersTab />}
      {tab === 'taxes' && <TaxesTab />}
    </div>
  );
};

export default MenuPage;
