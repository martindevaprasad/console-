import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconSearch, IconUser, IconUsers, IconDiscount2, IconSend, IconPlayerPause, IconCreditCard, IconTrash, IconMinus, IconPlus,
  IconClipboardList, IconFileInvoice, IconArrowsSplit, IconBan, IconNote, IconX, IconLayoutGrid, IconStar, IconChefHat,
} from '@tabler/icons-react';
import { useApi, useCan, useCurrentLocation, useMutate, useOrg } from '@/hooks';
import { CATALOG, ORDERS } from '@/services/api';
import { money, minutesSince } from '@/lib/format';
import { previewTotals } from '@/lib/pricing';
import { ORDER_TYPE_LABELS } from '@/lib/constants';
import { Drawer, Empty, Segmented, useApproval, withApproval } from '../shared/ui';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';
import ModifierModal, { LineDraft } from './ModifierModal';
import CustomerPicker from './CustomerPicker';
import DiscountModal, { DiscountChoice } from './DiscountModal';
import PaymentModal from './PaymentModal';
import Receipt from './Receipt';

const ITEM_STATUS_BADGE: Record<string, string> = { PENDING: 'badge-neutral', FIRED: 'badge-warning', PREPARING: 'badge-warning', READY: 'badge-info', SERVED: 'badge-success', VOIDED: 'badge-danger' };

export const POSTerminal: React.FC = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const location = useCurrentLocation();
  const { org, settings } = useOrg();
  const can = useCan();
  const mutate = useMutate();
  const approval = useApproval();
  const searchRef = useRef<HTMLInputElement>(null);

  const tableIdParam = new URLSearchParams(routerLocation.search).get('tableId');
  const orderIdParam = new URLSearchParams(routerLocation.search).get('orderId');

  const { data: menu, loading } = useApi(CATALOG.POS_MENU);
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Ticket state
  const [order, setOrder] = useState<any | null>(null);
  const [drafts, setDrafts] = useState<LineDraft[]>([]);
  const [orderType, setOrderType] = useState<string>('');
  const [guestCount, setGuestCount] = useState(1);
  const [customer, setCustomer] = useState<any | null>(null);
  const [draftDiscount, setDraftDiscount] = useState<DiscountChoice | null>(null);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modals
  const [modProduct, setModProduct] = useState<any | null>(null);
  const [editing, setEditing] = useState<LineDraft | null>(null);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitIds, setSplitIds] = useState<string[]>([]);

  const openChecks = useApi(ORDERS.OPEN, { locationId: location?.id }, { skip: !showChecks });

  const orderTypes = settings?.orderTypes?.length ? settings.orderTypes : ['TAKEAWAY'];
  useEffect(() => {
    if (!orderType || !orderTypes.includes(orderType)) setOrderType(tableIdParam ? 'DINE_IN' : orderTypes[0]);
  }, [orderTypes, orderType, tableIdParam]);

  const loadOrder = useCallback((o: any) => {
    setOrder(o);
    setDrafts([]);
    setOrderType(o.orderType);
    setGuestCount(o.guestCount || 1);
    setCustomer(o.customer || null);
    setNotes(o.notes || '');
    setDraftDiscount(null);
    setSelected(null);
  }, []);

  const resetTicket = useCallback(() => {
    setOrder(null); setDrafts([]); setCustomer(null); setDraftDiscount(null); setNotes(''); setGuestCount(1); setSelected(null);
    setSplitMode(false); setSplitIds([]);
    if (tableIdParam || orderIdParam) navigate('/pos', { replace: true });
  }, [navigate, tableIdParam, orderIdParam]);

  // Deep links: /pos?tableId=… resumes the table's open check; /pos?orderId=… resumes an order.
  useEffect(() => {
    (async () => {
      try {
        if (tableIdParam) {
          const res = await mutate(ORDERS.TABLE_ORDER, { tableId: tableIdParam });
          if (res.tableOrder) loadOrder(res.tableOrder);
          else { setOrder(null); setDrafts([]); setOrderType('DINE_IN'); }
        } else if (orderIdParam) {
          const res = await mutate(ORDERS.GET, { id: orderIdParam });
          if (res.order) loadOrder(res.order);
        }
      } catch (e: any) { toast.error(e.message); }
    })();
  }, [tableIdParam, orderIdParam, mutate, loadOrder]);

  // F2 focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const products = useMemo(() => {
    const list = menu?.products || [];
    const q = search.trim().toLowerCase();
    return list.filter((p: any) => (category === 'ALL' || p.categoryId === category) && (!q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase() === q || p.barcode === q));
  }, [menu, category, search]);

  const stockFor = (p: any) => (p.trackStock ? (p.inventory.find((i: any) => i.locationId === location?.id)?.quantity ?? 0) : null);

  const addProduct = (p: any) => {
    if (order && !['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'].includes(order.status)) { toast.error('This order is closed. Start a new one.'); return; }
    const needsModal = p.modifierGroups.length > 0 || p.isOpenPrice || settings?.pos.courses || settings?.pos.seats;
    if (needsModal) { setEditing(null); setModProduct(p); return; }
    // Merge identical simple lines
    const existing = drafts.find((d) => d.productId === p.id && !d.modifierIds.length && !d.notes);
    if (existing) setDrafts(drafts.map((d) => (d.key === existing.key ? { ...d, quantity: d.quantity + 1 } : d)));
    else setDrafts([...drafts, { key: `${p.id}-${Date.now()}`, productId: p.id, name: p.name, basePrice: p.price, unitPrice: p.price, taxRate: p.tax?.rate ?? 0, quantity: 1, modifierIds: [], modifiers: [], course: 1 }]);
    if (search) setSearch('');
  };

  const onSearchEnter = () => {
    if (products.length === 1) addProduct(products[0]);
  };

  const sentItems = (order?.items || []) as any[];
  const activeSent = sentItems.filter((i) => i.status !== 'VOIDED');
  const svcPct = orderType === 'DINE_IN' && settings && settings.pos.serviceChargePct > 0 && (!settings.pos.serviceChargeMinGuests || guestCount >= settings.pos.serviceChargeMinGuests) ? settings.pos.serviceChargePct : 0;

  const totals = useMemo(() => {
    if (order && !drafts.length) {
      return { subtotal: order.subtotal, discount: order.discountAmount, tax: order.taxAmount, service: order.serviceCharge, total: order.total - order.tipAmount, estimate: false };
    }
    const lines = [
      ...activeSent.map((i) => ({ unitPrice: i.price, quantity: i.quantity, taxRate: i.taxRate })),
      ...drafts.map((d) => ({ unitPrice: d.unitPrice, quantity: d.quantity, taxRate: d.taxRate })),
    ];
    const discount = order?.discountAmount ? { type: 'FIXED', value: order.discountAmount } : draftDiscount?.type ? { type: draftDiscount.type, value: draftDiscount.value! } : null;
    return { ...previewTotals(lines, { taxInclusive: !!org?.taxInclusive, discount, serviceChargePct: svcPct }), estimate: true };
  }, [order, drafts, activeSent, draftDiscount, org?.taxInclusive, svcPct]);

  const itemInputs = (list: LineDraft[]) => list.map((d) => ({
    productId: d.productId, quantity: d.quantity, modifierIds: d.modifierIds, notes: d.notes || null,
    seat: d.seat ?? null, course: d.course, priceOverride: d.priceOverride ?? null,
  }));

  /** Persists the ticket (create or append). Returns the saved order. */
  const save = async (fire: boolean): Promise<any | null> => {
    if (!order && !drafts.length) { toast.error('Add items first'); return null; }
    if (orderType === 'DELIVERY' && !customer) { setShowCustomer(true); toast('Attach a customer for delivery'); return null; }
    setBusy(true);
    try {
      let saved = order;
      if (!order) {
        const run = (pin?: string) => mutate(ORDERS.CREATE, {
          input: {
            locationId: location?.id, orderType, channel: 'POS', tableId: tableIdParam || null,
            guestCount, customerId: customer?.id || null, notes: notes || null, items: itemInputs(drafts), fire,
            discount: draftDiscount ? { discountId: draftDiscount.discountId || null, type: draftDiscount.type || null, value: draftDiscount.value || null, reason: draftDiscount.reason || null, approverPin: pin || null } : null,
            idempotencyKey: `${location?.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        }).then((r) => r.createOrder);
        saved = await withApproval(run, approval.request);
        if (!saved) return null;
      } else {
        if (drafts.length) saved = (await mutate(ORDERS.ADD_ITEMS, { orderId: order.id, items: itemInputs(drafts), fire })).addOrderItems;
        if (fire && saved.items.some((i: any) => i.status === 'PENDING')) saved = (await mutate(ORDERS.FIRE, { orderId: order.id })).fireOrder;
        if (notes !== (order.notes || '') || guestCount !== (order.guestCount || 1) || orderType !== order.orderType || (customer?.id || null) !== (order.customerId || null)) {
          saved = (await mutate(ORDERS.UPDATE, { orderId: order.id, input: { notes, guestCount, orderType, customerId: customer?.id || null } })).updateOrder;
        }
      }
      setOrder(saved);
      setDrafts([]);
      setDraftDiscount(null);
      return saved;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const saved = await save(true);
    if (saved) {
      toast.success(`Sent to kitchen · #${saved.ticketNumber}`);
      if (settings?.serviceModel === 'TABLE_SERVICE' || tableIdParam) resetTicket();
    }
  };

  const hold = async () => {
    const saved = await save(false);
    if (saved) { toast.success(`Check #${saved.ticketNumber} saved`); resetTicket(); }
  };

  const pay = async () => {
    const saved = drafts.length || !order ? await save(!!settings?.pos.autoFire) : order;
    if (saved) setShowPay(true);
  };

  const applyDiscount = async (d: DiscountChoice) => {
    setShowDiscount(false);
    if (!order) { setDraftDiscount(d); return; }
    try {
      const res = await withApproval(
        (pin) => mutate(ORDERS.APPLY_DISCOUNT, { orderId: order.id, discount: { discountId: d.discountId || null, type: d.type || null, value: d.value || null, reason: d.reason || null, approverPin: pin || null } }),
        approval.request,
      );
      if (res) { setOrder(res.applyDiscount); toast.success(`Discount applied: ${d.label}`); }
    } catch (e: any) { toast.error(e.message); }
  };

  const removeDiscount = async () => {
    setShowDiscount(false);
    if (!order) { setDraftDiscount(null); return; }
    try { setOrder((await mutate(ORDERS.REMOVE_DISCOUNT, { orderId: order.id })).removeDiscount); } catch (e: any) { toast.error(e.message); }
  };

  const voidItem = async (item: any) => {
    const reason = window.prompt(`Void "${item.name}" — reason?`, item.status === 'PENDING' ? 'Removed before send' : 'Guest changed mind');
    if (!reason) return;
    try {
      const res = await withApproval((pin) => mutate(ORDERS.VOID_ITEM, { itemId: item.id, reason, approverPin: pin || null }), approval.request);
      if (res) setOrder(res.voidOrderItem);
    } catch (e: any) { toast.error(e.message); }
  };

  const cancelOrder = async () => {
    if (!order) { resetTicket(); return; }
    const reason = window.prompt('Cancel this check — reason?', 'Guest left');
    if (!reason) return;
    try {
      const res = await withApproval((pin) => mutate(ORDERS.CANCEL, { orderId: order.id, reason, approverPin: pin || null }), approval.request);
      if (res) { toast.success('Check cancelled'); resetTicket(); }
    } catch (e: any) { toast.error(e.message); }
  };

  const doSplit = async () => {
    if (!order || !splitIds.length) return;
    try {
      const res = await mutate(ORDERS.SPLIT, { orderId: order.id, itemIds: splitIds });
      toast.success(`Created check #${res.splitOrder.ticketNumber}`);
      setSplitMode(false); setSplitIds([]);
      const refreshed = await mutate(ORDERS.GET, { id: order.id });
      setOrder(refreshed.order);
    } catch (e: any) { toast.error(e.message); }
  };

  const printCheck = async () => {
    if (order?.tableId) mutate(ORDERS.REQUEST_BILL, { orderId: order.id }).catch(() => null);
    setTimeout(() => window.print(), 50);
  };

  if (loading) return <div className="page-container"><LoadingSpinner text="Loading menu..." /></div>;

  const selectedDraft = drafts.find((d) => d.key === selected);
  const isClosed = order && !['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'].includes(order.status);
  const courses = [...new Set([...activeSent.map((i) => i.course), ...drafts.map((d) => d.course)])].sort();
  const showCourses = !!settings?.pos.courses && courses.length > 1;

  const renderSent = (i: any) => (
    <div key={i.id} className={`ticket-line${i.status === 'VOIDED' ? ' voided' : ''}${splitIds.includes(i.id) ? ' selected' : ''}`}
      onClick={() => splitMode && i.status !== 'VOIDED' && setSplitIds(splitIds.includes(i.id) ? splitIds.filter((x) => x !== i.id) : [...splitIds, i.id])}>
      <span className="ticket-qty">{i.quantity}</span>
      <div>
        <div className="ticket-name">{i.name} {i.seat ? <span className="muted small">· S{i.seat}</span> : null}</div>
        {(i.modifiers || []).length > 0 && <div className="ticket-mods">{i.modifiers.map((m: any) => m.name).join(', ')}</div>}
        {i.notes && <div className="ticket-mods text-warning">“{i.notes}”</div>}
        <span className={`badge ${ITEM_STATUS_BADGE[i.status]}`} style={{ marginTop: 3 }}>{i.status === 'PENDING' ? 'Not sent' : i.status.toLowerCase()}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="ticket-price">{money(i.subtotal)}</div>
        {!isClosed && !splitMode && i.status !== 'VOIDED' && order?.paidAmount === 0 && (
          <button className="btn btn-ghost btn-icon btn-sm" title="Void" onClick={(e) => { e.stopPropagation(); voidItem(i); }}><IconBan size={12} /></button>
        )}
      </div>
    </div>
  );

  const renderDraft = (d: LineDraft) => (
    <div key={d.key}>
      <div className={`ticket-line${selected === d.key ? ' selected' : ''}`} onClick={() => setSelected(selected === d.key ? null : d.key)}>
        <span className="ticket-qty">{d.quantity}</span>
        <div>
          <div className="ticket-name">{d.name} {d.seat ? <span className="muted small">· S{d.seat}</span> : null}</div>
          {d.modifiers.length > 0 && <div className="ticket-mods">{d.modifiers.map((m) => m.name).join(', ')}</div>}
          {d.notes && <div className="ticket-mods text-warning">“{d.notes}”</div>}
        </div>
        <div className="ticket-price">{money(d.unitPrice * d.quantity)}</div>
      </div>
      {selected === d.key && (
        <div className="ticket-tools">
          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setDrafts(drafts.map((x) => (x.key === d.key ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}><IconMinus size={12} /></button>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setDrafts(drafts.map((x) => (x.key === d.key ? { ...x, quantity: x.quantity + 1 } : x)))}><IconPlus size={12} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => { const p = menu.products.find((x: any) => x.id === d.productId); setEditing(d); setModProduct(p); }}>Edit</button>
          <div className="spacer" />
          <button className="btn btn-danger btn-icon btn-sm" onClick={() => { setDrafts(drafts.filter((x) => x.key !== d.key)); setSelected(null); }}><IconTrash size={12} /></button>
        </div>
      )}
    </div>
  );

  const tableName = order?.table?.name;

  return (
    <div className="pos-shell">
      <section className="pos-main">
        <div className="pos-bar">
          <div className="search-input-wrapper" style={{ flex: '1 1 240px', maxWidth: 360 }}>
            <span className="search-icon" style={{ display: 'flex' }}><IconSearch size={14} /></span>
            <input ref={searchRef} className="form-input search-input" placeholder="Search item, SKU or scan barcode (F2)" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearchEnter()} />
          </div>
          <Segmented value={orderType} onChange={setOrderType} options={orderTypes.map((t) => ({ value: t, label: ORDER_TYPE_LABELS[t] || t }))} />
          <div className="spacer" />
          <button className="btn btn-secondary btn-sm" onClick={() => setShowChecks(true)}><IconClipboardList size={13} /> Open checks</button>
          {settings?.modules.tables && <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tables')}><IconLayoutGrid size={13} /> Floor</button>}
        </div>

        <div className="pos-body">
          <nav className="pos-cats">
            <button className={`pos-cat${category === 'ALL' ? ' active' : ''}`} onClick={() => setCategory('ALL')}>All items</button>
            {(menu?.categories || []).map((c: any) => (
              <button key={c.id} className={`pos-cat${category === c.id ? ' active' : ''}`} onClick={() => setCategory(c.id)}>
                <span className="dot" style={{ background: c.color || 'var(--color-primary)' }} />{c.name}
              </button>
            ))}
          </nav>
          <div className="pos-grid">
            {products.map((p: any) => {
              const stock = stockFor(p);
              const soldOut = stock !== null && stock <= 0;
              return (
                <button key={p.id} className={`pos-item${soldOut ? ' disabled' : ''}`} style={{ ['--item-color' as any]: p.color || p.category?.color || 'var(--color-primary)' }} onClick={() => addProduct(p)}>
                  {p.modifierGroups.length > 0 && <span className="pos-item-flag">OPTIONS</span>}
                  {soldOut && <span className="pos-item-flag text-danger">86</span>}
                  <span className="pos-item-name">{p.name}</span>
                  <span className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="pos-item-price">{p.isOpenPrice ? 'Open' : money(p.price)}</span>
                    {stock !== null && !soldOut && <span className="small muted">{stock} left</span>}
                  </span>
                </button>
              );
            })}
            {!products.length && <div style={{ gridColumn: '1 / -1' }}><Empty title="No items" hint="Try another category or search term." /></div>}
          </div>
        </div>
      </section>

      <aside className="ticket">
        <div className="ticket-head">
          <div className="row">
            <div>
              <div className="strong">{order ? `Check #${order.ticketNumber}` : 'New order'}{tableName ? ` · ${tableName}` : ''}</div>
              <div className="small muted">
                {ORDER_TYPE_LABELS[orderType]}{order ? ` · ${minutesSince(order.createdAt)} min` : ''}{order?.user ? ` · ${order.user.name}` : ''}
              </div>
            </div>
            <div className="spacer" />
            {order && <span className={`badge ${order.paymentStatus === 'PAID' ? 'badge-success' : order.paymentStatus === 'PARTIAL' ? 'badge-info' : 'badge-warning'}`}>{order.paymentStatus.toLowerCase()}</span>}
            <button className="btn btn-ghost btn-icon btn-sm" title="New order" onClick={resetTicket}><IconX size={14} /></button>
          </div>
          <div className="row row-wrap" style={{ gap: 4 }}>
            <button className="chip" onClick={() => setShowCustomer(true)}>
              <IconUser size={12} /> {customer ? customer.name : 'Customer'}
              {customer && settings?.modules.loyalty ? <span className="text-warning"><IconStar size={10} /> {customer.loyaltyPoints}</span> : null}
            </button>
            {(orderType === 'DINE_IN') && (
              <span className="chip" style={{ cursor: 'default' }}>
                <IconUsers size={12} />
                <button className="btn btn-ghost btn-icon btn-sm" style={{ width: 16, height: 16 }} onClick={() => setGuestCount(Math.max(1, guestCount - 1))}><IconMinus size={10} /></button>
                {guestCount}
                <button className="btn btn-ghost btn-icon btn-sm" style={{ width: 16, height: 16 }} onClick={() => setGuestCount(guestCount + 1)}><IconPlus size={10} /></button>
              </span>
            )}
            <button className={`chip${notes ? ' active' : ''}`} onClick={() => setShowNote(true)}><IconNote size={12} /> Note</button>
          </div>
        </div>

        <div className="ticket-body">
          {!sentItems.length && !drafts.length ? (
            <Empty icon={<IconChefHat size={28} />} title="Empty ticket" hint="Tap menu items to start an order." />
          ) : showCourses ? (
            courses.map((c) => (
              <div key={c}>
                <div className="ticket-course">Course {c}</div>
                {sentItems.filter((i) => i.course === c).map(renderSent)}
                {drafts.filter((d) => d.course === c).map(renderDraft)}
              </div>
            ))
          ) : (
            <>
              {sentItems.map(renderSent)}
              {drafts.length > 0 && sentItems.length > 0 && <div className="ticket-course">New items</div>}
              {drafts.map(renderDraft)}
            </>
          )}
        </div>

        <div className="ticket-foot">
          {splitMode ? (
            <div className="stack" style={{ gap: 6 }}>
              <p className="small muted">Tap sent items to move them to a new check ({splitIds.length} selected).</p>
              <div className="row">
                <button className="btn btn-secondary btn-block" onClick={() => { setSplitMode(false); setSplitIds([]); }}>Cancel</button>
                <button className="btn btn-primary btn-block" disabled={!splitIds.length} onClick={doSplit}><IconArrowsSplit size={14} /> Split</button>
              </div>
            </div>
          ) : (
            <>
              <div className="totals-row"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
              {(totals.discount > 0 || draftDiscount) && (
                <div className="totals-row text-success"><span>Discount {order?.discountReason ? `(${order.discountReason})` : draftDiscount ? `(${draftDiscount.label})` : ''}</span><span>-{money(totals.discount)}</span></div>
              )}
              {totals.service > 0 && <div className="totals-row"><span>Service charge {settings?.pos.serviceChargePct}%</span><span>{money(totals.service)}</span></div>}
              <div className="totals-row"><span>{settings?.taxLabel || 'Tax'}{org?.taxInclusive ? ' (included)' : ''}</span><span>{money(totals.tax)}</span></div>
              {order?.paidAmount > 0 && <div className="totals-row text-accent"><span>Paid</span><span>-{money(order.paidAmount)}</span></div>}
              <div className="totals-row grand"><span>{order?.paidAmount > 0 ? 'Balance' : 'Total'}{totals.estimate && (drafts.length > 0) ? ' (est.)' : ''}</span>
                <span className="text-accent">{money(order?.paidAmount > 0 && !drafts.length ? order.balanceDue : totals.total)}</span></div>

              <div className="ticket-actions">
                <button className="btn btn-secondary btn-sm" disabled={!!isClosed} onClick={() => setShowDiscount(true)}><IconDiscount2 size={13} /> Discount</button>
                <button className="btn btn-secondary btn-sm" disabled={!order || !!isClosed || order.paidAmount > 0 || activeSent.length < 2} onClick={() => setSplitMode(true)}><IconArrowsSplit size={13} /> Split</button>
                <button className="btn btn-secondary btn-sm" disabled={!order} onClick={printCheck}><IconFileInvoice size={13} /> Print</button>
                <button className="btn btn-secondary btn-sm" disabled={busy || !!isClosed || (!drafts.length && !order)} onClick={hold}><IconPlayerPause size={13} /> Hold</button>
                {settings?.modules.kds !== false && (
                  <button className="btn btn-secondary btn-sm" disabled={busy || !!isClosed || (!drafts.length && !activeSent.some((i) => i.status === 'PENDING'))} onClick={send}><IconSend size={13} /> Send</button>
                )}
                <button className="btn btn-danger btn-sm" disabled={!!isClosed || (!order && !drafts.length) || (order?.paidAmount > 0)} onClick={cancelOrder}><IconBan size={13} /> Void</button>
              </div>
              <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }} disabled={busy || !!isClosed || (!drafts.length && !order)} onClick={pay}>
                {busy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <IconCreditCard size={16} />}
                Pay {money(order?.paidAmount > 0 && !drafts.length ? order.balanceDue : totals.total)}
              </button>
            </>
          )}
        </div>
      </aside>

      <ModifierModal
        product={modProduct}
        initial={editing}
        showSeats={!!settings?.pos.seats && orderType === 'DINE_IN'}
        showCourses={!!settings?.pos.courses}
        guestCount={guestCount}
        onClose={() => { setModProduct(null); setEditing(null); }}
        onConfirm={(line) => {
          setDrafts(editing ? drafts.map((d) => (d.key === line.key ? line : d)) : [...drafts, line]);
          setModProduct(null); setEditing(null); setSearch('');
        }}
      />
      <CustomerPicker open={showCustomer} onClose={() => setShowCustomer(false)} onPick={async (c) => {
        setCustomer(c); setShowCustomer(false);
        if (order) {
          try { setOrder((await mutate(ORDERS.UPDATE, { orderId: order.id, input: { customerId: c?.id || null } })).updateOrder); } catch (e: any) { toast.error(e.message); }
        }
      }} />
      <DiscountModal open={showDiscount} promotions={menu?.discounts || []} approvalLimit={settings?.security.maxDiscountPctWithoutApproval ?? 10}
        onClose={() => setShowDiscount(false)} onApply={applyDiscount} onRemove={order?.discountAmount || draftDiscount ? removeDiscount : undefined} />
      <PaymentModal open={showPay} order={order} onClose={() => setShowPay(false)} onUpdated={setOrder} onPrint={() => setTimeout(() => window.print(), 50)}
        onFinished={() => { setShowPay(false); resetTicket(); }} />
      <Modal isOpen={showNote} onClose={() => setShowNote(false)} title="Order note" footer={<button className="btn btn-primary" onClick={() => setShowNote(false)}>Done</button>}>
        <textarea className="form-input" autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery address, allergy info, pickup time…" />
      </Modal>
      <Drawer open={showChecks} onClose={() => setShowChecks(false)} title="Open checks">
        {openChecks.loading ? <LoadingSpinner /> : !(openChecks.data?.openOrders || []).length ? <Empty title="No open checks" /> : (
          <div className="stack" style={{ gap: 6 }}>
            {openChecks.data.openOrders.map((o: any) => (
              <button key={o.id} className="option-btn" onClick={async () => {
                setShowChecks(false);
                try { loadOrder((await mutate(ORDERS.GET, { id: o.id })).order); } catch (e: any) { toast.error(e.message); }
              }}>
                <span>
                  <span className="strong">#{o.ticketNumber}</span> · {ORDER_TYPE_LABELS[o.orderType]}{o.table ? ` · ${o.table.name}` : ''}{o.customer ? ` · ${o.customer.name}` : ''}
                  <div className="small muted">{o.user?.name} · {minutesSince(o.createdAt)} min ago</div>
                </span>
                <span className="strong">{money(o.balanceDue)}</span>
              </button>
            ))}
          </div>
        )}
      </Drawer>
      {approval.element}
      {order && <div className="print-area"><Receipt order={order} org={org} location={location} /></div>}
    </div>
  );
};

export default POSTerminal;
