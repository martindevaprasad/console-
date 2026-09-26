import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconBuildingStore, IconChefHat, IconDevices, IconTrash, IconStar } from '@tabler/icons-react';
import { useApi, useAppDispatch, useModule, useMutate } from '@/hooks';
import { LOCATION } from '@/services/api';
import { setLocations } from '@/store/locationSlice';
import { dateTime, label } from '@/lib/format';
import { PageHeader, Drawer, Field, Empty, Toggle, SettingRow, Tabs } from '../shared/ui';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';

const DEVICE_TYPES = ['POS', 'KDS', 'KIOSK', 'PRINTER', 'PAYMENT_TERMINAL', 'CUSTOMER_DISPLAY'];
const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export const LocationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const mutate = useMutate();
  const multi = useModule('multiLocation');
  const { data, loading, reload } = useApi(LOCATION.LIST, { includeInactive: true });
  const devices = useApi(LOCATION.DEVICES, {});
  const [form, setForm] = useState<any | null>(null);
  const [tab, setTab] = useState<'details' | 'stations' | 'devices'>('details');
  const [station, setStation] = useState<any | null>(null);
  const [device, setDevice] = useState<any | null>(null);

  const refresh = async () => {
    const res = await reload(true);
    const fresh = await mutate(LOCATION.LIST, {});
    dispatch(setLocations(fresh.locations));
    devices.reload(true);
    return res;
  };

  const save = async () => {
    const input = {
      name: form.name, code: form.code || null, address: form.address || null, city: form.city || null, country: form.country || null,
      phone: form.phone || null, email: form.email || null, timezone: form.timezone || null, isHeadOffice: !!form.isHeadOffice,
      receiptHeader: form.receiptHeader || null, receiptFooter: form.receiptFooter || null, isActive: form.isActive ?? true,
    };
    try {
      if (form.id) await mutate(LOCATION.UPDATE, { id: form.id, input });
      else await mutate(LOCATION.CREATE, { input });
      toast.success('Location saved'); setForm(null); refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveStation = async () => {
    const input = { locationId: form.id, name: station.name, color: station.color, printerName: station.printerName || null, isExpo: !!station.isExpo, isActive: station.isActive ?? true };
    try {
      if (station.id) await mutate(LOCATION.UPDATE_STATION, { id: station.id, input });
      else await mutate(LOCATION.CREATE_STATION, { input });
      setStation(null); await refresh();
      const fresh = await mutate(LOCATION.LIST, { includeInactive: true });
      setForm((f: any) => ({ ...f, stations: fresh.locations.find((l: any) => l.id === form.id)?.stations || [] }));
    } catch (e: any) { toast.error(e.message); }
  };

  const saveDevice = async () => {
    const input = { locationId: form.id, name: device.name, type: device.type, identifier: device.identifier || null, ipAddress: device.ipAddress || null, isActive: device.isActive ?? true };
    try {
      if (device.id) await mutate(LOCATION.UPDATE_DEVICE, { id: device.id, input });
      else await mutate(LOCATION.CREATE_DEVICE, { input });
      setDevice(null); devices.reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const locDevices = (id: string) => (devices.data?.devices || []).filter((d: any) => d.locationId === id);
  const active = (data?.locations || []).filter((l: any) => l.isActive).length;

  if (loading && !data) return <div className="page-container"><LoadingSpinner /></div>;

  return (
    <div className="page-container">
      <PageHeader title="Locations" subtitle={`${active} active outlets${multi ? '' : ' · multi-location disabled (Settings → Modules)'}`}
        actions={<button className="btn btn-primary btn-sm" disabled={!multi && active >= 1} onClick={() => { setTab('details'); setForm({ name: '', isActive: true, stations: [] }); }}><IconPlus size={13} /> New location</button>} />

      {!data?.locations.length ? <Empty icon={<IconBuildingStore />} title="No locations" /> : (
        <div className="grid-auto">
          {data.locations.map((l: any) => (
            <div key={l.id} className="card" style={{ cursor: 'pointer', opacity: l.isActive ? 1 : 0.5 }} onClick={() => { setTab('details'); setForm({ ...l }); }}>
              <div className="card-head">
                <div>
                  <div className="card-title">{l.name} {l.isHeadOffice && <IconStar size={12} className="text-warning" />}</div>
                  <div className="card-sub">{[l.code, l.city, l.country].filter(Boolean).join(' · ') || 'No address'}</div>
                </div>
                <span className={`badge ${l.isActive ? 'badge-success' : 'badge-neutral'}`}>{l.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="row row-wrap small muted" style={{ gap: 10 }}>
                <span><IconChefHat size={12} /> {l.stations.length} stations</span>
                <span><IconDevices size={12} /> {locDevices(l.id).length} devices</span>
                {l.timezone && <span>{l.timezone}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={!!form} onClose={() => setForm(null)} wide title={form?.id ? form.name : 'New location'}
        footer={tab === 'details' && <>{form?.id && form.isActive && !form.isHeadOffice && <button className="btn btn-danger" onClick={async () => { if (!window.confirm('Deactivate this location?')) return; await mutate(LOCATION.DELETE, { id: form.id }); setForm(null); refresh(); }}>Deactivate</button>}<div className="spacer" />
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={!form?.name} onClick={save}>Save</button></>}>
        {form && (
          <>
            {form.id && <Tabs active={tab} onChange={setTab} tabs={[{ key: 'details', label: 'Details' }, { key: 'stations', label: 'Kitchen stations', count: form.stations?.length }, { key: 'devices', label: 'Devices', count: locDevices(form.id).length }]} />}
            {tab === 'details' && (
              <div className="form-grid">
                <Field label="Name"><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Code" hint="Short code for receipts & reports"><input className="form-input" maxLength={6} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
                <Field label="Address" full><input className="form-input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
                <Field label="City"><input className="form-input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
                <Field label="Country"><input className="form-input" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
                <Field label="Phone"><input className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Timezone" hint="Defaults to the organization timezone"><input className="form-input" value={form.timezone || ''} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></Field>
                <Field label="Receipt header" full><input className="form-input" value={form.receiptHeader || ''} onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })} /></Field>
                <Field label="Receipt footer" full><input className="form-input" value={form.receiptFooter || ''} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} /></Field>
                <div className="full">
                  <SettingRow label="Head office" hint="New outlets copy its kitchen station layout"><Toggle size="sm" on={!!form.isHeadOffice} onChange={(v) => setForm({ ...form, isHeadOffice: v })} /></SettingRow>
                  {form.id && <SettingRow label="Active"><Toggle size="sm" on={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /></SettingRow>}
                </div>
              </div>
            )}
            {tab === 'stations' && (
              <>
                <div className="toolbar"><p className="small muted">Items route to stations by name, so keep names consistent across outlets.</p><div className="spacer" /><button className="btn btn-primary btn-sm" onClick={() => setStation({ name: '', color: COLORS[0], isExpo: false, isActive: true })}><IconPlus size={12} /> Station</button></div>
                <table className="data-table">
                  <thead><tr><th>Station</th><th>Printer</th><th>Type</th><th /></tr></thead>
                  <tbody>{(form.stations || []).map((s: any) => (
                    <tr key={s.id} className="clickable" onClick={() => setStation({ ...s })}>
                      <td><span className="dot" style={{ background: s.color || 'var(--color-primary)', marginRight: 6 }} />{s.name}</td>
                      <td>{s.printerName || '—'}</td><td>{s.isExpo ? 'Expo' : 'Prep'}</td>
                      <td className="num"><button className="btn btn-ghost btn-icon btn-sm" onClick={async (e) => { e.stopPropagation(); await mutate(LOCATION.DELETE_STATION, { id: s.id }); setForm({ ...form, stations: form.stations.filter((x: any) => x.id !== s.id) }); refresh(); }}><IconTrash size={12} /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </>
            )}
            {tab === 'devices' && (
              <>
                <div className="toolbar"><div className="spacer" /><button className="btn btn-primary btn-sm" onClick={() => setDevice({ name: '', type: 'POS', isActive: true })}><IconPlus size={12} /> Device</button></div>
                <table className="data-table">
                  <thead><tr><th>Device</th><th>Type</th><th>Identifier / IP</th><th>Last seen</th><th /></tr></thead>
                  <tbody>{locDevices(form.id).map((d: any) => (
                    <tr key={d.id} className="clickable" onClick={() => setDevice({ ...d })}>
                      <td className="strong">{d.name}</td><td><span className="badge badge-neutral">{label(d.type)}</span></td>
                      <td className="mono small">{d.identifier || d.ipAddress || '—'}</td><td>{d.lastSeenAt ? dateTime(d.lastSeenAt) : '—'}</td>
                      <td className="num"><button className="btn btn-ghost btn-icon btn-sm" onClick={async (e) => { e.stopPropagation(); await mutate(LOCATION.DELETE_DEVICE, { id: d.id }); devices.reload(true); }}><IconTrash size={12} /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </>
            )}
          </>
        )}
      </Drawer>

      <Modal isOpen={!!station} onClose={() => setStation(null)} title={station?.id ? 'Edit station' : 'New station'}
        footer={<><button className="btn btn-secondary" onClick={() => setStation(null)}>Cancel</button><button className="btn btn-primary" disabled={!station?.name} onClick={saveStation}>Save</button></>}>
        {station && (
          <div className="form-grid">
            <Field label="Name"><input className="form-input" autoFocus value={station.name} onChange={(e) => setStation({ ...station, name: e.target.value })} placeholder="Grill, Bar, Pastry…" /></Field>
            <Field label="Printer name / IP"><input className="form-input" value={station.printerName || ''} onChange={(e) => setStation({ ...station, printerName: e.target.value })} /></Field>
            <Field label="Colour" full><div className="row" style={{ gap: 4 }}>{COLORS.map((c) => <button key={c} onClick={() => setStation({ ...station, color: c })} style={{ width: 22, height: 22, borderRadius: 5, background: c, border: station.color === c ? '2px solid var(--text-primary)' : '1px solid var(--color-border)', cursor: 'pointer' }} />)}</div></Field>
            <div className="full"><SettingRow label="Expo / pass station" hint="Sees all items for final quality check"><Toggle size="sm" on={!!station.isExpo} onChange={(v) => setStation({ ...station, isExpo: v })} /></SettingRow></div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!device} onClose={() => setDevice(null)} title={device?.id ? 'Edit device' : 'Register device'}
        footer={<><button className="btn btn-secondary" onClick={() => setDevice(null)}>Cancel</button><button className="btn btn-primary" disabled={!device?.name} onClick={saveDevice}>Save</button></>}>
        {device && (
          <div className="form-grid">
            <Field label="Name"><input className="form-input" autoFocus value={device.name} onChange={(e) => setDevice({ ...device, name: e.target.value })} /></Field>
            <Field label="Type"><select className="form-select" value={device.type} onChange={(e) => setDevice({ ...device, type: e.target.value })}>{DEVICE_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></Field>
            <Field label="Serial / identifier"><input className="form-input" value={device.identifier || ''} onChange={(e) => setDevice({ ...device, identifier: e.target.value })} /></Field>
            <Field label="IP address"><input className="form-input" value={device.ipAddress || ''} onChange={(e) => setDevice({ ...device, ipAddress: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LocationsPage;
