import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { IconDownload, IconPrinter } from '@tabler/icons-react';
import { useApi, useCurrentLocation, useOrg } from '@/hooks';
import { REPORTS } from '@/services/api';
import { money, num, pct, periodRange, downloadCsv, label } from '@/lib/format';
import { ORDER_TYPE_LABELS, PAYMENT_LABELS } from '@/lib/constants';
import { PageHeader, Tabs, Kpi, Segmented, Empty } from '../shared/ui';
import LoadingSpinner from '../shared/LoadingSpinner';

type Period = 'today' | 'yesterday' | '7d' | '30d' | 'mtd' | '90d';
type Tab = 'overview' | 'items' | 'tenders' | 'staff' | 'locations' | 'tax';

const tooltipStyle = { background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 };

const Table: React.FC<{ head: string[]; rows: (string | number)[][]; numeric?: number[] }> = ({ head, rows, numeric = [] }) => (
  <div className="table-container">
    <table className="data-table">
      <thead><tr>{head.map((h, i) => <th key={h} className={numeric.includes(i) ? 'num' : ''}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={numeric.includes(j) ? 'num' : j === 0 ? 'strong' : ''}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

export const ReportsPage: React.FC = () => {
  const location = useCurrentLocation();
  const { org } = useOrg();
  const [period, setPeriod] = useState<Period>('7d');
  const [scope, setScope] = useState<'location' | 'all'>('location');
  const [tab, setTab] = useState<Tab>('overview');
  const range = useMemo(() => periodRange(period), [period]);
  const { data, loading } = useApi(REPORTS.SALES, { ...range, locationId: scope === 'all' ? null : location?.id });
  const r = data?.salesReport;
  const s = r?.summary;

  const exportTab = () => {
    if (!r) return;
    const map: Record<Tab, any[]> = {
      overview: r.daily, items: r.topProducts, tenders: r.payments, staff: r.byStaff, locations: r.byLocation, tax: r.taxBreakdown,
    };
    downloadCsv(`${tab}-${period}.csv`, map[tab] || []);
  };

  return (
    <div className="page-container">
      <PageHeader title="Reports" subtitle={`${scope === 'all' ? 'All locations' : location?.name} · ${org?.currency}`}
        actions={<>
          <Segmented value={period} onChange={setPeriod} options={[
            { value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }, { value: '7d', label: '7d' },
            { value: '30d', label: '30d' }, { value: 'mtd', label: 'MTD' }, { value: '90d', label: '90d' },
          ]} />
          {org?.settings.modules.multiLocation && <Segmented value={scope} onChange={setScope} options={[{ value: 'location', label: 'This location' }, { value: 'all', label: 'All locations' }]} />}
          <button className="btn btn-secondary btn-sm" onClick={exportTab}><IconDownload size={13} /> CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}><IconPrinter size={13} /></button>
        </>} />

      {loading && !r ? <LoadingSpinner /> : !r ? <Empty title="No data" /> : (
        <>
          <div className="kpi-grid">
            <Kpi label="Gross sales" value={money(s.grossSales)} />
            <Kpi label="Net sales" tone="success" value={money(s.netSales)} sub={`after ${money(s.discounts)} discounts, ${money(s.refunds)} refunds`} />
            <Kpi label="Orders" tone="accent" value={num(s.orders)} sub={`${s.cancelled} cancelled`} />
            <Kpi label="Avg ticket" tone="info" value={money(s.avgTicket)} sub={s.guests ? `${money(s.perGuest)} per guest` : undefined} />
            <Kpi label="Tax collected" value={money(s.tax)} />
            <Kpi label="Tips" tone="success" value={money(s.tips)} sub={s.serviceCharge ? `+ ${money(s.serviceCharge)} service` : undefined} />
            {s.grossMargin !== undefined && <Kpi label="Gross margin" tone={s.grossMargin >= 60 ? 'success' : 'warning'} value={pct(s.grossMargin)} sub={`COGS ${money(s.cogs)}`} />}
            <Kpi label="Voids" tone="danger" value={num(s.voidCount)} sub={money(s.voidValue)} />
          </div>

          <Tabs active={tab} onChange={setTab} tabs={[
            { key: 'overview', label: 'Overview' }, { key: 'items', label: 'Items & categories' }, { key: 'tenders', label: 'Tenders' },
            { key: 'staff', label: 'Staff' }, { key: 'locations', label: 'Locations', hidden: scope !== 'all' }, { key: 'tax', label: 'Tax' },
          ]} />

          {tab === 'overview' && (
            <div className="stack">
              <div className="grid-2">
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 8 }}>Net sales by day</div>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer><BarChart data={r.daily} margin={{ left: -10, right: 5, top: 5 }}>
                      <CartesianGrid stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v) => money(v, { compact: true })} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(v)} />
                      <Bar dataKey="sales" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart></ResponsiveContainer>
                  </div>
                </div>
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 8 }}>Sales by hour (daypart)</div>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer><BarChart data={r.hourly} margin={{ left: -10, right: 5, top: 5 }}>
                      <CartesianGrid stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v) => money(v, { compact: true })} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(v)} labelFormatter={(h) => `${h}:00`} />
                      <Bar dataKey="sales" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart></ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="grid-2">
                <Table head={['Order type', 'Orders', 'Net sales']} numeric={[1, 2]} rows={r.byOrderType.map((x: any) => [ORDER_TYPE_LABELS[x.key] || x.key, num(x.orders), money(x.sales)])} />
                <Table head={['Channel', 'Orders', 'Net sales']} numeric={[1, 2]} rows={r.byChannel.map((x: any) => [label(x.key), num(x.orders), money(x.sales)])} />
              </div>
            </div>
          )}
          {tab === 'items' && (
            <div className="grid-main-side">
              <Table head={['Item', 'Qty', 'Net sales', '% of sales']} numeric={[1, 2, 3]} rows={r.topProducts.map((p: any) => [p.name, num(p.quantity), money(p.sales), pct(s.netSales ? (p.sales / (s.grossSales - s.discounts)) * 100 : 0)])} />
              <Table head={['Category', 'Qty', 'Net sales']} numeric={[1, 2]} rows={r.byCategory.map((c: any) => [c.key, num(c.quantity), money(c.sales)])} />
            </div>
          )}
          {tab === 'tenders' && (r.payments.length
            ? <Table head={['Tender', 'Transactions', 'Net amount', 'Tips']} numeric={[1, 2, 3]} rows={r.payments.map((p: any) => [PAYMENT_LABELS[p.key] || p.key, num(p.count), money(p.amount), money(p.tips)])} />
            : <Empty title="Financial reports require the reports.financial permission" />)}
          {tab === 'staff' && <Table head={['Staff', 'Orders', 'Net sales', 'Avg ticket', 'Tips']} numeric={[1, 2, 3, 4]} rows={r.byStaff.map((x: any) => [x.key, num(x.orders), money(x.sales), money(x.orders ? x.sales / x.orders : 0), money(x.tips)])} />}
          {tab === 'locations' && <Table head={['Location', 'Orders', 'Net sales', 'Avg ticket']} numeric={[1, 2, 3]} rows={r.byLocation.map((x: any) => [x.key, num(x.orders), money(x.sales), money(x.orders ? x.sales / x.orders : 0)])} />}
          {tab === 'tax' && (r.taxBreakdown.length
            ? <Table head={['Tax', 'Rate', 'Taxable amount', 'Tax']} numeric={[1, 2, 3]} rows={r.taxBreakdown.map((t: any) => [t.name, `${t.rate}%`, money(t.taxable), money(t.amount)])} />
            : <Empty title="No tax data for this period" />)}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
