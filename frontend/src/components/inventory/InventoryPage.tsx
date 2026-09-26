import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconAdjustments, IconTrash, IconTruckDelivery, IconSend, IconPackageImport, IconAlertTriangle } from '@tabler/icons-react';
import { useApi, useCan, useCurrentLocation, useModule, useMutate } from '@/hooks';
import { INVENTORY } from '@/services/api';
import { money, num, dateTime, date, label } from '@/lib/format';
import { PageHeader, Tabs, SearchBox, Drawer, Field, Empty, Kpi, Segmented } from '../shared/ui';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';

type Tab = 'ingredients' | 'goods' | 'movements' | 'suppliers' | 'purchasing';
const UNITS = ['kg', 'g', 'l', 'ml', 'unit', 'dozen', 'case', 'bottle', 'portion'];
const PO_BADGE: Record<string, string> = { DRAFT: 'badge-neutral', SENT: 'badge-info', PARTIAL: 'badge-warning', RECEIVED: 'badge-success', CANCELLED: 'badge-neutral' };

const levelTone = (q: number, rp: number) => (q <= 0 ? 'text-danger' : q <= rp ? 'text-warning' : 'text-success');

// ------------------------------------------------------------------ Ingredients

const IngredientsTab: React.FC<{ locationId: string }> = ({ locationId }) => {
  const can = useCan();
  const mutate = useMutate();
  const { data, loading, reload } = useApi(INVENTORY.ITEMS, { locationId });
  const suppliers = useApi(INVENTORY.SUPPLIERS);
  const [search, setSearch] = useState('');
  const [item, setItem] = useState<any | null>(null);
  const [adj, setAdj] = useState<{ item: any; type: string; quantity: string; reason: string; unitCost: string } | null>(null);

  const items = (data?.stockItems || []).filter((i: any) => !search || i.name.toLowerCase().includes(search.toLowerCase()));
  const value = items.reduce((s: number, i: any) => s + Math.max(0, i.level?.quantity || 0) * i.costPerUnit, 0);
  const low = items.filter((i: any) => i.isActive && (i.level?.quantity || 0) <= (i.level?.reorderPoint || 0)).length;

  const saveItem = async () => {
    const input = { name: item.name, sku: item.sku || null, unit: item.unit, category: item.category || null, costPerUnit: parseFloat(item.costPerUnit) || 0, supplierId: item.supplierId || null, isActive: item.isActive ?? true };
    try {
      const id = item.id ? (await mutate(INVENTORY.UPDATE_ITEM, { id: item.id, input })).updateStockItem.id : (await mutate(INVENTORY.CREATE_ITEM, { input })).createStockItem.id;
      await mutate(INVENTORY.SET_LEVEL, { input: { stockItemId: id, locationId, parLevel: parseFloat(item.parLevel) || 0, reorderPoint: parseFloat(item.reorderPoint) || 0 } });
      toast.success('Ingredient saved'); setItem(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const saveAdj = async () => {
    try {
      await mutate(INVENTORY.ADJUST, { input: { stockItemId: adj!.item.id, locationId, type: adj!.type, quantity: parseFloat(adj!.quantity), reason: adj!.reason || null, unitCost: adj!.unitCost ? parseFloat(adj!.unitCost) : null } });
      toast.success('Stock updated'); setAdj(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading && !data) return <LoadingSpinner />;
  return (
    <>
      <div className="kpi-grid">
        <Kpi label="Ingredients" value={num(items.length)} />
        <Kpi label="Stock value" tone="success" value={money(value)} sub="at weighted avg cost" />
        <Kpi label="Below reorder point" tone={low ? 'danger' : 'success'} value={low} />
      </div>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search ingredients" />
        <div className="spacer" />
        {can('inventory.manage') && <button className="btn btn-primary btn-sm" onClick={() => setItem({ name: '', unit: 'kg', costPerUnit: '', parLevel: '', reorderPoint: '', isActive: true })}><IconPlus size={13} /> New ingredient</button>}
      </div>
      {!items.length ? <Empty title="No ingredients" hint="Add ingredients, then attach them to menu items as recipes to track food cost." /> : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Ingredient</th><th>Supplier</th><th className="num">On hand</th><th className="num">Reorder at</th><th className="num">Par</th><th className="num">Unit cost</th><th className="num">Value</th><th /></tr></thead>
            <tbody>
              {items.map((i: any) => {
                const q = i.level?.quantity || 0;
                return (
                  <tr key={i.id} style={{ opacity: i.isActive ? 1 : 0.5 }}>
                    <td className="clickable" onClick={() => can('inventory.manage') && setItem({ ...i, costPerUnit: String(i.costPerUnit), parLevel: String(i.level?.parLevel || ''), reorderPoint: String(i.level?.reorderPoint || '') })}>
                      <span className="strong">{i.name}</span>{i.category && <span className="small muted"> · {i.category}</span>}
                    </td>
                    <td>{i.supplier?.name || '—'}</td>
                    <td className={`num strong ${levelTone(q, i.level?.reorderPoint || 0)}`}>{num(q, 2)} {i.unit}</td>
                    <td className="num">{num(i.level?.reorderPoint || 0, 2)}</td>
                    <td className="num">{num(i.level?.parLevel || 0, 2)}</td>
                    <td className="num">{money(i.costPerUnit)}</td>
                    <td className="num">{money(Math.max(0, q) * i.costPerUnit)}</td>
                    <td className="num">
                      {can('inventory.manage') && (
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setAdj({ item: i, type: 'COUNT', quantity: String(q), reason: 'Stock count', unitCost: '' })}>Count</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setAdj({ item: i, type: 'WASTE', quantity: '', reason: '', unitCost: '' })}>Waste</button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Adjust" onClick={() => setAdj({ item: i, type: 'ADJUSTMENT', quantity: '', reason: '', unitCost: '' })}><IconAdjustments size={12} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!item} onClose={() => setItem(null)} title={item?.id ? `Edit ${item.name}` : 'New ingredient'}
        footer={<><button className="btn btn-secondary" onClick={() => setItem(null)}>Cancel</button><button className="btn btn-primary" disabled={!item?.name} onClick={saveItem}>Save</button></>}>
        {item && (
          <div className="form-grid">
            <Field label="Name" full><input className="form-input" autoFocus value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} /></Field>
            <Field label="Unit"><select className="form-select" value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
            <Field label="Cost per unit"><input className="form-input" type="number" step="0.0001" value={item.costPerUnit} onChange={(e) => setItem({ ...item, costPerUnit: e.target.value })} /></Field>
            <Field label="Category"><input className="form-input" value={item.category || ''} onChange={(e) => setItem({ ...item, category: e.target.value })} placeholder="Dairy, Produce, Dry goods…" /></Field>
            <Field label="SKU"><input className="form-input" value={item.sku || ''} onChange={(e) => setItem({ ...item, sku: e.target.value })} /></Field>
            <Field label="Preferred supplier" full>
              <select className="form-select" value={item.supplierId || ''} onChange={(e) => setItem({ ...item, supplierId: e.target.value })}>
                <option value="">None</option>{(suppliers.data?.suppliers || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Reorder point (this location)"><input className="form-input" type="number" step="0.01" value={item.reorderPoint} onChange={(e) => setItem({ ...item, reorderPoint: e.target.value })} /></Field>
            <Field label="Par level (this location)"><input className="form-input" type="number" step="0.01" value={item.parLevel} onChange={(e) => setItem({ ...item, parLevel: e.target.value })} /></Field>
          </div>
        )}
      </Drawer>

      <Modal isOpen={!!adj} onClose={() => setAdj(null)} title={`${label(adj?.type)} · ${adj?.item.name}`}
        footer={<><button className="btn btn-secondary" onClick={() => setAdj(null)}>Cancel</button><button className="btn btn-primary" disabled={adj?.quantity === '' || (adj?.type === 'WASTE' && !adj?.reason)} onClick={saveAdj}>Save</button></>}>
        {adj && (
          <div className="form-grid">
            <Field label="Type" full>
              <Segmented value={adj.type} onChange={(v) => setAdj({ ...adj, type: v })} options={[{ value: 'COUNT', label: 'Count' }, { value: 'WASTE', label: 'Waste' }, { value: 'ADJUSTMENT', label: 'Adjust ±' }, { value: 'PURCHASE', label: 'Receive' }, { value: 'TRANSFER_OUT', label: 'Transfer out' }]} />
            </Field>
            <Field label={adj.type === 'COUNT' ? `Counted quantity (${adj.item.unit})` : adj.type === 'ADJUSTMENT' ? `Change (+/-) (${adj.item.unit})` : `Quantity (${adj.item.unit})`}>
              <input className="form-input" type="number" step="0.001" autoFocus value={adj.quantity} onChange={(e) => setAdj({ ...adj, quantity: e.target.value })} />
            </Field>
            {adj.type === 'PURCHASE' ? <Field label="Unit cost"><input className="form-input" type="number" step="0.01" value={adj.unitCost} onChange={(e) => setAdj({ ...adj, unitCost: e.target.value })} /></Field>
              : <Field label="Reason"><select className="form-select" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })}>
                <option value="">Select…</option>{['Stock count', 'Spoiled / expired', 'Dropped / spilled', 'Over-portioned', 'Staff meal', 'Returned to supplier', 'Transfer to other outlet', 'Other'].map((r) => <option key={r}>{r}</option>)}
              </select></Field>}
          </div>
        )}
      </Modal>
    </>
  );
};

// ------------------------------------------------------------------ Finished goods (per-product stock)

const GoodsTab: React.FC<{ locationId: string }> = ({ locationId }) => {
  const can = useCan();
  const mutate = useMutate();
  const { data, reload } = useApi(INVENTORY.PRODUCTS, { locationId });
  const [edit, setEdit] = useState<Record<string, { quantity: string; minStock: string }>>({});
  const rows = data?.inventories || [];

  const save = async (inv: any) => {
    const e = edit[inv.id];
    try {
      await mutate(INVENTORY.UPDATE, { productId: inv.productId, locationId, quantity: parseInt(e.quantity), minStock: parseInt(e.minStock) });
      const next = { ...edit }; delete next[inv.id]; setEdit(next); reload(true);
    } catch (err: any) { toast.error(err.message); }
  };

  return !rows.length ? <Empty title="No tracked items" hint="Enable “Track finished-goods stock” on menu items (bakery goods, bottled drinks) to count them here." /> : (
    <div className="table-container">
      <table className="data-table">
        <thead><tr><th>Item</th><th>Category</th><th className="num">On hand</th><th className="num">Min</th><th>Status</th><th /></tr></thead>
        <tbody>
          {rows.map((i: any) => {
            const e = edit[i.id];
            return (
              <tr key={i.id}>
                <td className="strong">{i.product.name}</td>
                <td>{i.product.category?.name || '—'}</td>
                <td className="num">{e ? <input className="form-input" style={{ width: 80, marginLeft: 'auto' }} type="number" value={e.quantity} onChange={(ev) => setEdit({ ...edit, [i.id]: { ...e, quantity: ev.target.value } })} /> : <span className={`strong ${levelTone(i.quantity, i.minStock)}`}>{i.quantity}</span>}</td>
                <td className="num">{e ? <input className="form-input" style={{ width: 70, marginLeft: 'auto' }} type="number" value={e.minStock} onChange={(ev) => setEdit({ ...edit, [i.id]: { ...e, minStock: ev.target.value } })} /> : i.minStock}</td>
                <td>{i.quantity <= 0 ? <span className="badge badge-danger">86 / sold out</span> : i.quantity <= i.minStock ? <span className="badge badge-warning">Low</span> : <span className="badge badge-success">OK</span>}</td>
                <td className="num">{can('inventory.manage') && (e
                  ? <button className="btn btn-primary btn-sm" onClick={() => save(i)}>Save</button>
                  : <button className="btn btn-ghost btn-sm" onClick={() => setEdit({ ...edit, [i.id]: { quantity: String(i.quantity), minStock: String(i.minStock) } })}>Edit</button>)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ------------------------------------------------------------------ Movements

const MovementsTab: React.FC<{ locationId: string }> = ({ locationId }) => {
  const { data } = useApi(INVENTORY.MOVEMENTS, { locationId, limit: 300 });
  const rows = data?.stockMovements || [];
  return !rows.length ? <Empty title="No stock movements yet" /> : (
    <div className="table-container">
      <table className="data-table">
        <thead><tr><th>When</th><th>Ingredient</th><th>Type</th><th className="num">Quantity</th><th>Reason / ref</th></tr></thead>
        <tbody>
          {rows.map((m: any) => (
            <tr key={m.id}>
              <td>{dateTime(m.createdAt)}</td><td className="strong">{m.stockItem?.name}</td>
              <td><span className={`badge ${m.quantity < 0 ? 'badge-danger' : 'badge-success'}`}>{label(m.type)}</span></td>
              <td className={`num ${m.quantity < 0 ? 'text-danger' : 'text-success'}`}>{m.quantity > 0 ? '+' : ''}{num(m.quantity, 3)} {m.stockItem?.unit}</td>
              <td className="small">{m.reason || m.reference || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ------------------------------------------------------------------ Suppliers

const SuppliersTab: React.FC = () => {
  const mutate = useMutate();
  const { data, reload } = useApi(INVENTORY.SUPPLIERS);
  const [form, setForm] = useState<any | null>(null);
  const save = async () => {
    const input = { name: form.name, contactName: form.contactName || null, phone: form.phone || null, email: form.email || null, address: form.address || null, leadTimeDays: parseInt(form.leadTimeDays) || 0, paymentTerms: form.paymentTerms || null, isActive: form.isActive ?? true };
    try {
      if (form.id) await mutate(INVENTORY.UPDATE_SUPPLIER, { id: form.id, input });
      else await mutate(INVENTORY.CREATE_SUPPLIER, { input });
      setForm(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <>
      <div className="toolbar"><div className="spacer" /><button className="btn btn-primary btn-sm" onClick={() => setForm({ name: '', leadTimeDays: 2 })}><IconPlus size={13} /> New supplier</button></div>
      {!data?.suppliers.length ? <Empty title="No suppliers" /> : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th className="num">Lead time</th><th>Terms</th></tr></thead>
            <tbody>{data.suppliers.map((s: any) => (
              <tr key={s.id} className="clickable" onClick={() => setForm({ ...s })}><td className="strong">{s.name}</td><td>{s.contactName || '—'}</td><td>{s.phone || '—'}</td><td>{s.email || '—'}</td><td className="num">{s.leadTimeDays}d</td><td>{s.paymentTerms || '—'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit supplier' : 'New supplier'}
        footer={<><button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={!form?.name} onClick={save}>Save</button></>}>
        {form && (
          <div className="form-grid">
            <Field label="Company" full><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Contact person"><input className="form-input" value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
            <Field label="Phone"><input className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><input className="form-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Lead time (days)"><input className="form-input" type="number" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} /></Field>
            <Field label="Payment terms"><input className="form-input" value={form.paymentTerms || ''} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Net 30, COD…" /></Field>
            <Field label="Address"><input className="form-input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          </div>
        )}
      </Drawer>
    </>
  );
};

// ------------------------------------------------------------------ Purchasing

const PurchasingTab: React.FC<{ locationId: string }> = ({ locationId }) => {
  const mutate = useMutate();
  const { data, reload } = useApi(INVENTORY.POS, { locationId });
  const suppliers = useApi(INVENTORY.SUPPLIERS);
  const stock = useApi(INVENTORY.ITEMS, { locationId });
  const [draft, setDraft] = useState<any | null>(null);
  const [receiving, setReceiving] = useState<any | null>(null);
  const [recv, setRecv] = useState<Record<string, string>>({});

  // Suggested order: bring items below reorder point up to par.
  const suggest = (supplierId: string) => (stock.data?.stockItems || [])
    .filter((i: any) => i.isActive && (!supplierId || i.supplierId === supplierId) && (i.level?.quantity || 0) <= (i.level?.reorderPoint || 0))
    .map((i: any) => ({ stockItemId: i.id, quantity: String(Math.max(1, Math.ceil((i.level?.parLevel || 0) - (i.level?.quantity || 0)))), unitCost: String(i.costPerUnit) }));

  const create = async () => {
    try {
      await mutate(INVENTORY.CREATE_PO, { input: {
        supplierId: draft.supplierId, locationId, notes: draft.notes || null, expectedAt: draft.expectedAt ? new Date(draft.expectedAt).toISOString() : null,
        lines: draft.lines.filter((l: any) => l.stockItemId && parseFloat(l.quantity) > 0).map((l: any) => ({ stockItemId: l.stockItemId, quantity: parseFloat(l.quantity), unitCost: parseFloat(l.unitCost) || 0 })),
      } });
      toast.success('Purchase order created'); setDraft(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const status = async (po: any, s: string) => {
    try { await mutate(INVENTORY.PO_STATUS, { id: po.id, status: s }); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  const receive = async () => {
    try {
      await mutate(INVENTORY.RECEIVE_PO, { id: receiving.id, lines: Object.entries(recv).map(([lineId, q]) => ({ lineId, receivedQty: parseFloat(q) || 0 })).filter((l) => l.receivedQty > 0) });
      toast.success('Goods received into stock'); setReceiving(null); reload(true); stock.reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const draftTotal = useMemo(() => (draft?.lines || []).reduce((s: number, l: any) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0), 0), [draft]);

  return (
    <>
      <div className="toolbar"><div className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => setDraft({ supplierId: '', expectedAt: '', notes: '', lines: suggest('') })}><IconPlus size={13} /> New purchase order</button>
      </div>
      {!data?.purchaseOrders.length ? <Empty icon={<IconTruckDelivery />} title="No purchase orders" /> : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>PO</th><th>Supplier</th><th>Created</th><th>Expected</th><th>Lines</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
            <tbody>{data.purchaseOrders.map((po: any) => (
              <tr key={po.id}>
                <td className="mono strong">{po.number}</td><td>{po.supplier?.name}</td><td>{date(po.createdAt)}</td><td>{po.expectedAt ? date(po.expectedAt) : '—'}</td>
                <td>{po.lines.length}</td><td className="num">{money(po.total)}</td><td><span className={`badge ${PO_BADGE[po.status]}`}>{label(po.status)}</span></td>
                <td className="num"><div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                  {po.status === 'DRAFT' && <button className="btn btn-ghost btn-sm" onClick={() => status(po, 'SENT')}><IconSend size={12} /> Mark sent</button>}
                  {['DRAFT', 'SENT', 'PARTIAL'].includes(po.status) && <button className="btn btn-primary btn-sm" onClick={() => { setReceiving(po); setRecv(Object.fromEntries(po.lines.map((l: any) => [l.id, String(Math.max(0, l.quantity - l.receivedQty))]))); }}><IconPackageImport size={12} /> Receive</button>}
                  {['DRAFT', 'SENT'].includes(po.status) && <button className="btn btn-ghost btn-icon btn-sm" title="Cancel" onClick={() => status(po, 'CANCELLED')}><IconTrash size={12} /></button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Drawer open={!!draft} onClose={() => setDraft(null)} wide title="New purchase order"
        footer={<><span className="strong">Total {money(draftTotal)}</span><div className="spacer" /><button className="btn btn-secondary" onClick={() => setDraft(null)}>Cancel</button><button className="btn btn-primary" disabled={!draft?.supplierId || !draft?.lines.length} onClick={create}>Create PO</button></>}>
        {draft && (
          <>
            <div className="form-grid">
              <Field label="Supplier">
                <select className="form-select" value={draft.supplierId} onChange={(e) => setDraft({ ...draft, supplierId: e.target.value, lines: suggest(e.target.value) })}>
                  <option value="">Select…</option>{(suppliers.data?.suppliers || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Expected delivery"><input className="form-input" type="date" value={draft.expectedAt} onChange={(e) => setDraft({ ...draft, expectedAt: e.target.value })} /></Field>
            </div>
            <p className="small muted" style={{ marginBottom: 8 }}><IconAlertTriangle size={11} /> Pre-filled with items below reorder point, topped up to par.</p>
            {draft.lines.map((l: any, i: number) => (
              <div key={i} className="row" style={{ marginBottom: 6 }}>
                <select className="form-select" value={l.stockItemId} onChange={(e) => setDraft({ ...draft, lines: draft.lines.map((x: any, j: number) => (j === i ? { ...x, stockItemId: e.target.value } : x)) })}>
                  <option value="">Ingredient…</option>{(stock.data?.stockItems || []).map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                </select>
                <input className="form-input" style={{ width: 90 }} type="number" placeholder="Qty" value={l.quantity} onChange={(e) => setDraft({ ...draft, lines: draft.lines.map((x: any, j: number) => (j === i ? { ...x, quantity: e.target.value } : x)) })} />
                <input className="form-input" style={{ width: 100 }} type="number" step="0.01" placeholder="Unit cost" value={l.unitCost} onChange={(e) => setDraft({ ...draft, lines: draft.lines.map((x: any, j: number) => (j === i ? { ...x, unitCost: e.target.value } : x)) })} />
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_: any, j: number) => j !== i) })}><IconTrash size={12} /></button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => setDraft({ ...draft, lines: [...draft.lines, { stockItemId: '', quantity: '', unitCost: '' }] })}><IconPlus size={12} /> Add line</button>
            <Field label="Notes"><input className="form-input" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </>
        )}
      </Drawer>

      <Modal isOpen={!!receiving} onClose={() => setReceiving(null)} title={`Receive ${receiving?.number}`} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setReceiving(null)}>Cancel</button><button className="btn btn-primary" onClick={receive}>Receive into stock</button></>}>
        {receiving && (
          <table className="data-table">
            <thead><tr><th>Ingredient</th><th className="num">Ordered</th><th className="num">Received</th><th className="num">Receiving now</th></tr></thead>
            <tbody>{receiving.lines.map((l: any) => (
              <tr key={l.id}><td>{l.stockItem?.name}</td><td className="num">{l.quantity} {l.stockItem?.unit}</td><td className="num">{l.receivedQty}</td>
                <td className="num"><input className="form-input" style={{ width: 90, marginLeft: 'auto' }} type="number" value={recv[l.id] ?? ''} onChange={(e) => setRecv({ ...recv, [l.id]: e.target.value })} /></td></tr>
            ))}</tbody>
          </table>
        )}
      </Modal>
    </>
  );
};

export const InventoryPage: React.FC = () => {
  const location = useCurrentLocation();
  const purchasing = useModule('purchasing');
  const can = useCan();
  const [tab, setTab] = useState<Tab>('ingredients');
  if (!location) return <div className="page-container"><Empty title="Select a location" /></div>;
  return (
    <div className="page-container">
      <PageHeader title="Inventory" subtitle={`${location.name} · stock is tracked per location`} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'ingredients', label: 'Ingredients' },
        { key: 'goods', label: 'Finished goods' },
        { key: 'movements', label: 'Movements' },
        { key: 'suppliers', label: 'Suppliers', hidden: !purchasing || !can('purchasing.manage') },
        { key: 'purchasing', label: 'Purchase orders', hidden: !purchasing || !can('purchasing.manage') },
      ]} />
      {tab === 'ingredients' && <IngredientsTab locationId={location.id} />}
      {tab === 'goods' && <GoodsTab locationId={location.id} />}
      {tab === 'movements' && <MovementsTab locationId={location.id} />}
      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'purchasing' && <PurchasingTab locationId={location.id} />}
    </div>
  );
};

export default InventoryPage;
