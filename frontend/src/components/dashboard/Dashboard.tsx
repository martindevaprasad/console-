import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  IconCash, IconReceipt, IconUsers, IconClock, IconChefHat, IconAlertTriangle, IconLayoutGrid, IconUserCheck, IconRefresh,
} from '@tabler/icons-react';
import { useApi, useCan, useCurrentLocation, useModule, useOrg } from '@/hooks';
import { REPORTS } from '@/services/api';
import { dayRange, money, num, label } from '@/lib/format';
import { ORDER_TYPE_LABELS, PAYMENT_LABELS } from '@/lib/constants';
import { Kpi, PageHeader, Empty } from '../shared/ui';
import LoadingSpinner from '../shared/LoadingSpinner';

const delta = (cur: number, prev?: number) => {
  if (!prev) return { text: 'vs. yesterday —', trend: undefined as any };
  const d = ((cur - prev) / prev) * 100;
  return { text: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}% vs. yesterday`, trend: d >= 0 ? 'up' : 'down' };
};

const Bars: React.FC<{ rows: { key: string; value: number; display: string }[] }> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div>
      {rows.map((r) => (
        <div key={r.key} className="bar-row">
          <span className="truncate">{r.key}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <span className="num strong">{r.display}</span>
        </div>
      ))}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useCurrentLocation();
  const { org } = useOrg();
  const can = useCan();
  const tables = useModule('tables');
  const kds = useModule('kds');
  const vars = useMemo(() => {
    const today = dayRange(0);
    const yesterday = dayRange(1);
    return { locationId: location?.id, from: today.from, to: today.to, compareFrom: yesterday.from, compareTo: yesterday.to };
  }, [location?.id]);
  const { data, loading, reload } = useApi(REPORTS.DASHBOARD, vars, { pollMs: 30000 });
  const d = data?.dashboard;

  if (loading && !d) return <div className="page-container"><LoadingSpinner text="Loading live operations..." /></div>;
  if (!d) return <div className="page-container"><Empty title="Dashboard unavailable" /></div>;

  const s = d.summary;
  const c = d.compare || {};
  const occupied = Object.entries(d.live.tables || {}).filter(([k]) => k !== 'AVAILABLE').reduce((a, [, v]) => a + (v as number), 0);
  const totalTables = Object.values(d.live.tables || {}).reduce((a: number, v: any) => a + v, 0) as number;
  const hourly = d.hourly.filter((h: any, i: number) => h.orders > 0 || (i >= 7 && i <= 23));

  return (
    <div className="page-container">
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${org?.name}`}
        subtitle={`${location?.name || 'All locations'} · Today · refreshes every 30s`}
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => reload()}><IconRefresh size={13} /> Refresh</button>
          {can('pos.access') && <button className="btn btn-primary btn-sm" onClick={() => navigate('/pos')}>Open POS</button>}
        </>}
      />

      <div className="kpi-grid">
        <Kpi label="Net sales" icon={<IconCash size={12} />} value={money(s.netSales)} sub={delta(s.netSales, c.netSales).text} trend={delta(s.netSales, c.netSales).trend} />
        <Kpi label="Orders" icon={<IconReceipt size={12} />} tone="accent" value={num(s.orders)} sub={delta(s.orders, c.orders).text} trend={delta(s.orders, c.orders).trend} />
        <Kpi label="Avg ticket" tone="info" value={money(s.avgTicket)} sub={delta(s.avgTicket, c.avgTicket).text} trend={delta(s.avgTicket, c.avgTicket).trend} />
        <Kpi label="Guests" icon={<IconUsers size={12} />} tone="success" value={num(s.guests)} sub={s.guests ? `${money(s.netSales / s.guests)} per guest` : 'No covers yet'} />
        {s.tips !== undefined && <Kpi label="Tips" tone="success" value={money(s.tips)} sub={`${money(s.tax)} tax collected`} />}
        {s.grossMargin !== undefined && <Kpi label="Gross margin" tone={s.grossMargin > 60 ? 'success' : 'warning'} value={`${s.grossMargin}%`} sub={`COGS ${money(s.cogs)}`} />}
      </div>

      <div className="kpi-grid">
        <Kpi label="Open checks" icon={<IconClock size={12} />} tone="warning" value={num(d.live.openOrders)} sub={`${money(d.live.openValue)} outstanding`} />
        {tables && <Kpi label="Tables occupied" icon={<IconLayoutGrid size={12} />} tone="info" value={`${occupied}/${totalTables}`} sub={totalTables ? `${Math.round((occupied / totalTables) * 100)}% occupancy` : 'No floor plan'} />}
        {kds && <Kpi label="Kitchen queue" icon={<IconChefHat size={12} />} tone={d.live.kitchenQueue > 15 ? 'danger' : 'accent'} value={num(d.live.kitchenQueue)} sub="items cooking" />}
        <Kpi label="Staff on clock" icon={<IconUserCheck size={12} />} tone="success" value={num(d.live.staffOnClock)} />
        <Kpi label="Low stock" icon={<IconAlertTriangle size={12} />} tone={d.live.lowStock ? 'danger' : 'success'} value={num(d.live.lowStock)} sub={d.live.lowStock ? 'items need reorder' : 'All stocked'} />
        {s.voidCount !== undefined && <Kpi label="Voids / cancels" tone={s.voidCount ? 'danger' : 'success'} value={`${s.voidCount} / ${s.cancelled}`} sub={money(s.voidValue)} />}
      </div>

      <div className="grid-main-side">
        <div className="card">
          <div className="card-head"><div><div className="card-title">Sales by hour</div><div className="card-sub">Net sales, today</div></div></div>
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, { compact: true })} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => money(v)} labelFormatter={(h) => `${h}:00`} />
                <Area type="monotone" dataKey="sales" stroke="#7c3aed" strokeWidth={2} fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><div className="card-title">Order mix</div></div>
            {d.byOrderType.length ? (
              <Bars rows={d.byOrderType.map((r: any) => ({ key: ORDER_TYPE_LABELS[r.key] || r.key, value: r.sales, display: money(r.sales) }))} />
            ) : <p className="small muted">No sales yet today.</p>}
          </div>
          {d.payments.length > 0 && (
            <div className="card">
              <div className="card-head"><div className="card-title">Tenders</div></div>
              <Bars rows={d.payments.map((r: any) => ({ key: PAYMENT_LABELS[r.key] || label(r.key), value: r.amount, display: money(r.amount) }))} />
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head"><div className="card-title">Top sellers today</div></div>
        {d.topProducts.length ? (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Net sales</th></tr></thead>
              <tbody>
                {d.topProducts.map((p: any) => (
                  <tr key={p.id}><td>{p.name}</td><td className="num">{num(p.quantity)}</td><td className="num strong">{money(p.sales)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="small muted">No items sold yet today.</p>}
      </div>
    </div>
  );
};

export default Dashboard;
