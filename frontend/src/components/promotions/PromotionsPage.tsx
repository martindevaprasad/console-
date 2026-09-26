import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconDiscount2 } from '@tabler/icons-react';
import { useApi, useMutate } from '@/hooks';
import { CATALOG } from '@/services/api';
import { money, date } from '@/lib/format';
import { PageHeader, Field, Empty, Toggle, SettingRow, Segmented, Drawer } from '../shared/ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toDateInput = (v?: string | null) => (v ? v.slice(0, 10) : '');

export const PromotionsPage: React.FC = () => {
  const mutate = useMutate();
  const { data, reload } = useApi(CATALOG.DISCOUNTS);
  const [form, setForm] = useState<any | null>(null);

  const blank = { name: '', code: '', type: 'PERCENT', scope: 'ORDER', value: '', minOrderAmount: '', maxDiscount: '', categoryId: '', requiresApproval: false, autoApply: false, startsAt: '', endsAt: '', daysOfWeek: [], startTime: '', endTime: '', isActive: true };

  const save = async () => {
    const input = {
      name: form.name, code: form.code || null, type: form.type, scope: form.scope, value: parseFloat(form.value) || 0,
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null, maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      categoryId: form.scope === 'CATEGORY' ? form.categoryId || null : null, requiresApproval: form.requiresApproval, autoApply: form.autoApply,
      startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : null, endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
      daysOfWeek: form.daysOfWeek, startTime: form.startTime || null, endTime: form.endTime || null, isActive: form.isActive,
    };
    try {
      if (form.id) await mutate(CATALOG.UPDATE_DISCOUNT, { id: form.id, input });
      else await mutate(CATALOG.CREATE_DISCOUNT, { input });
      toast.success('Promotion saved'); setForm(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const schedule = (d: any) => [
    d.daysOfWeek.length ? d.daysOfWeek.map((x: number) => DAYS[x]).join(', ') : 'Every day',
    d.startTime || d.endTime ? `${d.startTime || '00:00'}–${d.endTime || '23:59'}` : 'all day',
    d.startsAt || d.endsAt ? `${d.startsAt ? date(d.startsAt) : '…'} → ${d.endsAt ? date(d.endsAt) : '…'}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className="page-container">
      <PageHeader title="Promotions" subtitle="Happy hours, promo codes, category deals and automatic discounts"
        actions={<button className="btn btn-primary btn-sm" onClick={() => setForm({ ...blank })}><IconPlus size={13} /> New promotion</button>} />
      {!data?.discounts.length ? <Empty icon={<IconDiscount2 />} title="No promotions yet" hint="Create a happy hour or a staff discount to get started." /> : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Promotion</th><th>Value</th><th>Applies to</th><th>Schedule</th><th>Rules</th><th className="num">Used</th><th>Status</th></tr></thead>
            <tbody>
              {data.discounts.map((d: any) => (
                <tr key={d.id} className="clickable" onClick={() => setForm({ ...d, value: String(d.value), minOrderAmount: d.minOrderAmount ?? '', maxDiscount: d.maxDiscount ?? '', categoryId: d.categoryId || '', startsAt: toDateInput(d.startsAt), endsAt: toDateInput(d.endsAt), code: d.code || '', startTime: d.startTime || '', endTime: d.endTime || '' })}>
                  <td className="strong">{d.name}{d.code && <div className="small muted mono">{d.code}</div>}</td>
                  <td>{d.type === 'PERCENT' ? `${d.value}%` : money(d.value)}</td>
                  <td>{d.scope === 'CATEGORY' ? data.categories.find((c: any) => c.id === d.categoryId)?.name || 'Category' : 'Whole order'}</td>
                  <td className="small">{schedule(d)}</td>
                  <td className="small">
                    {d.autoApply && <span className="badge badge-info">Auto</span>} {d.requiresApproval && <span className="badge badge-warning">Approval</span>}
                    {d.minOrderAmount ? ` min ${money(d.minOrderAmount)}` : ''}
                  </td>
                  <td className="num">{d.usageCount}</td>
                  <td><span className={`badge ${d.isCurrentlyValid ? 'badge-success' : d.isActive ? 'badge-warning' : 'badge-neutral'}`}>{d.isCurrentlyValid ? 'Live now' : d.isActive ? 'Scheduled' : 'Off'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit promotion' : 'New promotion'}
        footer={<>{form?.id && <button className="btn btn-danger" onClick={async () => { await mutate(CATALOG.DELETE_DISCOUNT, { id: form.id }); setForm(null); reload(true); }}>Delete</button>}<div className="spacer" />
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={!form?.name || !form?.value} onClick={save}>Save</button></>}>
        {form && (
          <>
            <div className="form-grid">
              <Field label="Name" full><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Happy Hour 20%" /></Field>
              <Field label="Type"><Segmented value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={[{ value: 'PERCENT', label: 'Percent' }, { value: 'FIXED', label: 'Amount' }]} /></Field>
              <Field label={form.type === 'PERCENT' ? 'Percent off' : 'Amount off'}><input className="form-input" type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field>
              <Field label="Applies to"><Segmented value={form.scope} onChange={(v) => setForm({ ...form, scope: v })} options={[{ value: 'ORDER', label: 'Whole order' }, { value: 'CATEGORY', label: 'Category' }]} /></Field>
              {form.scope === 'CATEGORY' ? (
                <Field label="Category">
                  <select className="form-select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">Select…</option>{data.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              ) : <Field label="Promo code (optional)"><input className="form-input mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>}
              <Field label="Minimum order"><input className="form-input" type="number" step="0.01" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} /></Field>
              <Field label="Maximum discount"><input className="form-input" type="number" step="0.01" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} /></Field>
            </div>
            <div className="form-section-title">Schedule</div>
            <div className="row row-wrap" style={{ gap: 4, marginBottom: 10 }}>
              {DAYS.map((d, i) => (
                <button key={d} className={`chip${form.daysOfWeek.includes(i) ? ' active' : ''}`} onClick={() => setForm({ ...form, daysOfWeek: form.daysOfWeek.includes(i) ? form.daysOfWeek.filter((x: number) => x !== i) : [...form.daysOfWeek, i].sort() })}>{d}</button>
              ))}
            </div>
            <div className="form-grid">
              <Field label="From time"><input className="form-input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
              <Field label="To time"><input className="form-input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
              <Field label="Start date"><input className="form-input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
              <Field label="End date"><input className="form-input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></Field>
            </div>
            <div className="card" style={{ padding: '4px 12px' }}>
              <SettingRow label="Apply automatically" hint="Best valid auto promotion is added to new orders"><Toggle size="sm" on={form.autoApply} onChange={(v) => setForm({ ...form, autoApply: v })} /></SettingRow>
              <SettingRow label="Requires manager approval"><Toggle size="sm" on={form.requiresApproval} onChange={(v) => setForm({ ...form, requiresApproval: v })} /></SettingRow>
              <SettingRow label="Active"><Toggle size="sm" on={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /></SettingRow>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default PromotionsPage;
