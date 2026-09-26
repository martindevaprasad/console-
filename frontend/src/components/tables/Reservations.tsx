import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconUserPlus, IconArmchair, IconX, IconCheck, IconPhone } from '@tabler/icons-react';
import { useApi, useCurrentLocation, useModule, useMutate } from '@/hooks';
import { RESERVATIONS, TABLE_MANAGEMENT } from '@/services/api';
import { time, minutesSince, label } from '@/lib/format';
import { PageHeader, Tabs, Empty, Field, Kpi } from '../shared/ui';
import Modal from '../shared/Modal';

const STATUS_BADGE: Record<string, string> = { BOOKED: 'badge-info', CONFIRMED: 'badge-primary', WAITLIST: 'badge-warning', SEATED: 'badge-success', COMPLETED: 'badge-neutral', CANCELLED: 'badge-neutral', NO_SHOW: 'badge-danger' };

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export const ReservationsPage: React.FC = () => {
  const location = useCurrentLocation();
  const mutate = useMutate();
  const tablesOn = useModule('tables');
  const [tab, setTab] = useState<'book' | 'wait'>('book');
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState<any | null>(null);
  const [seating, setSeating] = useState<any | null>(null);

  const range = useMemo(() => {
    const from = new Date(`${day}T00:00:00`);
    const to = new Date(`${day}T23:59:59`);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [day]);
  const { data, reload } = useApi(RESERVATIONS.LIST, { locationId: location?.id, ...range }, { skip: !location, pollMs: 30000 });
  const floor = useApi(TABLE_MANAGEMENT.ZONES, { locationId: location?.id }, { skip: !seating || !location || !tablesOn });

  const all = data?.reservations || [];
  const bookings = all.filter((r: any) => r.status !== 'WAITLIST');
  const waitlist = all.filter((r: any) => r.status === 'WAITLIST');
  const covers = bookings.filter((r: any) => !['CANCELLED', 'NO_SHOW'].includes(r.status)).reduce((s: number, r: any) => s + r.partySize, 0);
  const freeTables = (floor.data?.zones || []).flatMap((z: any) => z.tables.map((t: any) => ({ ...t, zone: z.name }))).filter((t: any) => t.status === 'AVAILABLE');

  const save = async () => {
    try {
      const input = {
        locationId: location?.id, customerName: form.customerName, phone: form.phone || null, email: form.email || null,
        partySize: Number(form.partySize), notes: form.notes || null, status: form.status,
        dateTime: new Date(form.dateTime).toISOString(), quotedWaitMin: form.quotedWaitMin ? Number(form.quotedWaitMin) : null,
      };
      if (form.id) await mutate(RESERVATIONS.UPDATE, { id: form.id, input });
      else await mutate(RESERVATIONS.CREATE, { input });
      toast.success(form.status === 'WAITLIST' ? 'Added to waitlist' : 'Reservation saved');
      setForm(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const setStatus = async (r: any, status: string) => {
    try { await mutate(RESERVATIONS.UPDATE, { id: r.id, input: { status } }); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  const seat = async (tableId: string) => {
    try { await mutate(RESERVATIONS.SEAT, { id: seating.id, tableId }); toast.success(`${seating.customerName} seated`); setSeating(null); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  const newBooking = (waitlist = false) => setForm({
    customerName: '', phone: '', email: '', partySize: 2, notes: '', status: waitlist ? 'WAITLIST' : 'BOOKED',
    dateTime: toLocalInput(waitlist ? new Date() : new Date(`${day}T19:00:00`)), quotedWaitMin: waitlist ? 15 : '',
  });

  const Row = ({ r }: { r: any }) => (
    <tr>
      <td className="strong">{r.status === 'WAITLIST' ? `${minutesSince(r.createdAt)}m waiting` : time(r.dateTime)}</td>
      <td>{r.customerName}{r.notes && <div className="small muted">{r.notes}</div>}</td>
      <td>{r.partySize}</td>
      <td>{r.phone ? <span className="row" style={{ gap: 4 }}><IconPhone size={11} />{r.phone}</span> : '—'}</td>
      <td>{r.table?.name || '—'}{r.quotedWaitMin ? <span className="small muted"> · quoted {r.quotedWaitMin}m</span> : null}</td>
      <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{label(r.status)}</span></td>
      <td className="num">
        <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
          {['BOOKED', 'CONFIRMED', 'WAITLIST'].includes(r.status) && (
            <>
              {r.status === 'BOOKED' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(r, 'CONFIRMED')}><IconCheck size={12} /> Confirm</button>}
              {tablesOn && <button className="btn btn-primary btn-sm" onClick={() => setSeating(r)}><IconArmchair size={12} /> Seat</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...r, dateTime: toLocalInput(new Date(r.dateTime)) })}>Edit</button>
              <button className="btn btn-ghost btn-icon btn-sm" title="No-show" onClick={() => setStatus(r, r.status === 'WAITLIST' ? 'CANCELLED' : 'NO_SHOW')}><IconX size={12} /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="page-container">
      <PageHeader title="Reservations & Waitlist" subtitle={location?.name}
        actions={<>
          <input type="date" className="form-input" style={{ width: 150 }} value={day} onChange={(e) => setDay(e.target.value)} />
          <button className="btn btn-secondary btn-sm" onClick={() => newBooking(true)}><IconUserPlus size={13} /> Walk-in to waitlist</button>
          <button className="btn btn-primary btn-sm" onClick={() => newBooking(false)}><IconPlus size={13} /> New booking</button>
        </>} />

      <div className="kpi-grid">
        <Kpi label="Bookings" value={bookings.filter((r: any) => !['CANCELLED', 'NO_SHOW'].includes(r.status)).length} />
        <Kpi label="Covers booked" tone="accent" value={covers} />
        <Kpi label="Waiting now" tone="warning" value={waitlist.length} sub={waitlist.length ? `longest ${Math.max(...waitlist.map((w: any) => minutesSince(w.createdAt)))} min` : 'No queue'} />
        <Kpi label="No-shows" tone="danger" value={bookings.filter((r: any) => r.status === 'NO_SHOW').length} />
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'book', label: 'Bookings', count: bookings.length }, { key: 'wait', label: 'Waitlist', count: waitlist.length }]} />
      {(tab === 'book' ? bookings : waitlist).length === 0 ? <Empty title={tab === 'book' ? 'No bookings for this day' : 'Waitlist is empty'} /> : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>{tab === 'book' ? 'Time' : 'Waiting'}</th><th>Guest</th><th>Party</th><th>Phone</th><th>Table</th><th>Status</th><th /></tr></thead>
            <tbody>{(tab === 'book' ? bookings : waitlist).map((r: any) => <Row key={r.id} r={r} />)}</tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit reservation' : form?.status === 'WAITLIST' ? 'Add to waitlist' : 'New reservation'}
        footer={<><button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={!form?.customerName || !form?.partySize} onClick={save}>Save</button></>}>
        {form && (
          <div className="form-grid">
            <Field label="Guest name"><input className="form-input" autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></Field>
            <Field label="Party size"><input className="form-input" type="number" min={1} value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })} /></Field>
            <Field label="Phone"><input className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            {form.status === 'WAITLIST'
              ? <Field label="Quoted wait (min)"><input className="form-input" type="number" value={form.quotedWaitMin || ''} onChange={(e) => setForm({ ...form, quotedWaitMin: e.target.value })} /></Field>
              : <Field label="Date & time"><input className="form-input" type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} /></Field>}
            <Field label="Notes (occasion, allergies, seating preference)" full><input className="form-input" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!seating} onClose={() => setSeating(null)} title={`Seat ${seating?.customerName} (${seating?.partySize})`}>
        {!freeTables.length ? <Empty title="No tables available" hint="Free up or clean a table first." /> : (
          <div className="option-grid">
            {freeTables.sort((a: any, b: any) => Math.abs(a.capacity - (seating?.partySize || 0)) - Math.abs(b.capacity - (seating?.partySize || 0))).map((t: any) => (
              <button key={t.id} className="option-btn" disabled={t.capacity < (seating?.partySize || 0)} style={{ opacity: t.capacity < (seating?.partySize || 0) ? 0.4 : 1 }} onClick={() => seat(t.id)}>
                <span>{t.name}<div className="small muted">{t.zone}</div></span><small>{t.capacity} seats</small>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReservationsPage;
