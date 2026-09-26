import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconStar, IconDownload, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useApi, useCan, useModule, useMutate } from '@/hooks';
import { CUSTOMERS } from '@/services/api';
import { money, date, dateTime, downloadCsv } from '@/lib/format';
import { ORDER_STATUS_BADGE, ORDER_TYPE_LABELS } from '@/lib/constants';
import { PageHeader, SearchBox, Drawer, Field, Empty, Kpi, Toggle, SettingRow, StatusBadge } from '../shared/ui';
import LoadingSpinner from '../shared/LoadingSpinner';

const PAGE = 50;

export const CustomersPage: React.FC = () => {
  const can = useCan();
  const mutate = useMutate();
  const loyalty = useModule('loyalty');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<any | null>(null);
  const [points, setPoints] = useState('');
  const { data, loading, reload } = useApi(CUSTOMERS.LIST, { search: search || null, limit: PAGE, offset: page * PAGE });
  const detail = useApi(CUSTOMERS.GET, { id: openId }, { skip: !openId });
  const c = detail.data?.customer;

  const save = async () => {
    const input = {
      name: form.name, phone: form.phone || null, email: form.email || null, notes: form.notes || null,
      birthday: form.birthday ? new Date(form.birthday).toISOString() : null, houseAccount: !!form.houseAccount,
      tags: (form.tagsText || '').split(',').map((t: string) => t.trim()).filter(Boolean),
    };
    try {
      if (form.id) await mutate(CUSTOMERS.UPDATE, { id: form.id, input });
      else await mutate(CUSTOMERS.CREATE, { input });
      toast.success('Customer saved'); setForm(null); reload(true); detail.reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const adjust = async (sign: number) => {
    const n = parseInt(points);
    if (!n) return;
    const reason = window.prompt('Reason for adjustment?', sign > 0 ? 'Goodwill' : 'Correction');
    if (!reason) return;
    try { await mutate(CUSTOMERS.ADJUST_POINTS, { customerId: c.id, points: sign * n, reason }); setPoints(''); detail.reload(true); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  const total = data?.customers.total || 0;

  return (
    <div className="page-container">
      <PageHeader title="Customers" subtitle={`${total} guest profiles`}
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv('customers.csv', (data?.customers.items || []).map((x: any) => ({ name: x.name, phone: x.phone, email: x.email, visits: x.visitCount, spent: x.totalSpent, points: x.loyaltyPoints, lastVisit: x.lastVisitAt })))}><IconDownload size={13} /> Export</button>
          {can('customers.manage', 'pos.access') && <button className="btn btn-primary btn-sm" onClick={() => setForm({ name: '', phone: '', email: '', tagsText: '', houseAccount: false })}><IconPlus size={13} /> New customer</button>}
        </>} />
      <div className="toolbar"><SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search name, phone, email" /></div>

      {loading && !data ? <LoadingSpinner /> : !data?.customers.items.length ? <Empty title="No customers" hint="Customers are created from the POS or here." /> : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th className="num">Visits</th><th className="num">Lifetime spend</th>{loyalty && <th className="num">Points</th>}<th>Last visit</th><th>Tags</th></tr></thead>
              <tbody>
                {data.customers.items.map((x: any) => (
                  <tr key={x.id} className="clickable" onClick={() => setOpenId(x.id)}>
                    <td className="strong">{x.name}{x.houseAccount && <span className="badge badge-info" style={{ marginLeft: 4 }}>House</span>}</td>
                    <td>{x.phone || '—'}</td><td>{x.email || '—'}</td>
                    <td className="num">{x.visitCount}</td><td className="num strong">{money(x.totalSpent)}</td>
                    {loyalty && <td className="num"><IconStar size={10} className="text-warning" /> {x.loyaltyPoints}</td>}
                    <td>{x.lastVisitAt ? date(x.lastVisitAt) : '—'}</td>
                    <td>{x.tags.map((t: string) => <span key={t} className="badge badge-neutral" style={{ marginRight: 3 }}>{t}</span>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <span className="small muted">{page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} of {total}</span>
            <button className="btn btn-secondary btn-icon btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}><IconChevronLeft size={12} /></button>
            <button className="btn btn-secondary btn-icon btn-sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}><IconChevronRight size={12} /></button>
          </div>
        </>
      )}

      <Drawer open={!!openId && !form} onClose={() => setOpenId(null)} wide title={c?.name || 'Customer'}
        footer={c && can('customers.manage') && <button className="btn btn-secondary" onClick={() => setForm({ ...c, tagsText: c.tags.join(', '), birthday: c.birthday?.slice(0, 10) || '' })}>Edit profile</button>}>
        {!c ? <LoadingSpinner /> : (
          <div className="stack">
            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              <Kpi label="Visits" value={c.visitCount} sub={c.lastVisitAt ? `last ${date(c.lastVisitAt)}` : 'never'} />
              <Kpi label="Lifetime spend" tone="success" value={money(c.totalSpent)} sub={c.visitCount ? `${money(c.totalSpent / c.visitCount)} avg` : ''} />
              {loyalty && <Kpi label="Loyalty points" tone="warning" value={c.loyaltyPoints} />}
              {c.houseAccount && <Kpi label="House balance" tone="danger" value={money(c.balance)} />}
            </div>
            <div className="card">
              <table className="data-table"><tbody>
                <tr><td className="muted">Phone</td><td>{c.phone || '—'}</td></tr>
                <tr><td className="muted">Email</td><td>{c.email || '—'}</td></tr>
                <tr><td className="muted">Birthday</td><td>{c.birthday ? date(c.birthday) : '—'}</td></tr>
                <tr><td className="muted">Customer since</td><td>{date(c.createdAt)}</td></tr>
                <tr><td className="muted">Notes</td><td>{c.notes || '—'}</td></tr>
              </tbody></table>
            </div>
            {loyalty && can('customers.manage') && (
              <div className="card row">
                <span className="small strong">Adjust points</span>
                <input className="form-input" style={{ width: 90 }} type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
                <button className="btn btn-success btn-sm" onClick={() => adjust(1)}>Add</button>
                <button className="btn btn-danger btn-sm" onClick={() => adjust(-1)}>Deduct</button>
              </div>
            )}
            <div className="card card-flush">
              <div className="card-head" style={{ padding: '10px 12px 0' }}><div className="card-title">Recent orders</div></div>
              <table className="data-table">
                <thead><tr><th>#</th><th>Date</th><th>Type</th><th>Status</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {c.recentOrders.map((o: any) => (
                    <tr key={o.id}><td>#{o.ticketNumber}</td><td>{dateTime(o.createdAt)}</td><td>{ORDER_TYPE_LABELS[o.orderType]}</td><td><StatusBadge value={o.status} map={ORDER_STATUS_BADGE} /></td><td className="num">{money(o.total)}</td></tr>
                  ))}
                  {!c.recentOrders.length && <tr><td colSpan={5} className="muted small">No orders yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit customer' : 'New customer'}
        footer={<><button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={!form?.name} onClick={save}>Save</button></>}>
        {form && (
          <div className="form-grid">
            <Field label="Full name" full><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone"><input className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><input className="form-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Birthday"><input className="form-input" type="date" value={form.birthday || ''} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></Field>
            <Field label="Tags (comma separated)"><input className="form-input" value={form.tagsText || ''} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} placeholder="VIP, vegan, corporate" /></Field>
            <Field label="Notes (allergies, preferences)" full><textarea className="form-input" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="full"><SettingRow label="House account" hint="Allow charging orders to an account balance (corporate, hotel guests)"><Toggle size="sm" on={!!form.houseAccount} onChange={(v) => setForm({ ...form, houseAccount: v })} /></SettingRow></div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CustomersPage;
