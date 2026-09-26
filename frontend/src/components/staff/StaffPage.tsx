import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconShieldLock, IconUsers, IconClock, IconDownload } from '@tabler/icons-react';
import { useApi, useAuth, useCan, useCurrentLocation, useLocation, useModule, useMutate } from '@/hooks';
import { STAFF } from '@/services/api';
import { dateTime, money, num, periodRange, downloadCsv } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/constants';
import { PageHeader, Tabs, SearchBox, Drawer, Field, Empty, Toggle, SettingRow, Segmented, Kpi } from '../shared/ui';
import LoadingSpinner from '../shared/LoadingSpinner';

type Tab = 'team' | 'roles' | 'time';

const TeamTab: React.FC = () => {
  const can = useCan();
  const { user: me } = useAuth();
  const mutate = useMutate();
  const { list: locations } = useLocation();
  const [search, setSearch] = useState('');
  const [inactive, setInactive] = useState(false);
  const [form, setForm] = useState<any | null>(null);
  const { data, loading, reload } = useApi(STAFF.USERS, { includeInactive: inactive });
  const roles = useApi(STAFF.ROLES);
  const custom = (roles.data?.roles || []).filter((r: any) => !r.isSystem);
  const users = (data?.users || []).filter((u: any) => !search || `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    const input: any = {
      name: form.name, email: form.email, role: form.role, roleId: form.roleId || null, phone: form.phone || null,
      hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null, locationId: form.locationId || null, isActive: form.isActive ?? true,
    };
    if (form.password) input.password = form.password;
    if (form.pin) input.pin = form.pin;
    try {
      if (form.id) await mutate(STAFF.UPDATE, { id: form.id, input });
      else await mutate(STAFF.CREATE, { input });
      toast.success('Team member saved'); setForm(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const deactivate = async () => {
    if (!window.confirm(`Deactivate ${form.name}? They will no longer be able to sign in.`)) return;
    try { await mutate(STAFF.DELETE, { id: form.id }); setForm(null); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  if (loading && !data) return <LoadingSpinner />;
  return (
    <>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search team" />
        <label className="check"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} /> Show inactive</label>
        <div className="spacer" />
        {can('staff.manage') && <button className="btn btn-primary btn-sm" onClick={() => setForm({ name: '', email: '', password: '', pin: '', role: 'STAFF', roleId: '', locationId: locations[0]?.id || '', isActive: true })}><IconPlus size={13} /> Add team member</button>}
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Home location</th><th>PIN</th><th className="num">Rate</th><th>Last sign-in</th><th>Status</th></tr></thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="clickable" onClick={() => can('staff.manage') && setForm({ ...u, password: '', pin: '', roleId: u.roleId || '', locationId: u.locationId || '', hourlyRate: u.hourlyRate ?? '' })}>
                <td className="strong">{u.name}{u.id === me?.id && <span className="small muted"> (you)</span>}</td>
                <td>{u.email}</td>
                <td>{u.customRole ? <span className="badge badge-primary">{u.customRole.name}</span> : <span className="badge badge-neutral">{ROLE_LABELS[u.role] || u.role}</span>}</td>
                <td>{u.location?.name || 'All locations'}</td>
                <td>{u.hasPin ? <span className="badge badge-success">Set</span> : <span className="badge badge-warning">None</span>}</td>
                <td className="num">{u.hourlyRate ? money(u.hourlyRate) : '—'}</td>
                <td>{u.lastLoginAt ? dateTime(u.lastLoginAt) : '—'}</td>
                <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-neutral'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.id ? `Edit ${form.name}` : 'Add team member'}
        footer={<>{form?.id && form.id !== me?.id && form.isActive && <button className="btn btn-danger" onClick={deactivate}>Deactivate</button>}<div className="spacer" />
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn btn-primary" disabled={!form?.name || !form?.email || (!form?.id && (form?.password || '').length < 8)} onClick={save}>Save</button></>}>
        {form && (
          <div className="form-grid">
            <Field label="Full name" full><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email (sign-in)"><input className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><input className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label={form.id ? 'New password (optional)' : 'Password'} hint="Min 8 characters"><input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label={form.id ? 'New POS PIN (optional)' : 'POS PIN'} hint="4–6 digits, unique"><input className="form-input" inputMode="numeric" maxLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Base role">
              <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {(me?.role === 'OWNER' ? ['OWNER', 'MANAGER', 'SHIFT_LEAD', 'STAFF'] : ['MANAGER', 'SHIFT_LEAD', 'STAFF']).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </Field>
            <Field label="Custom role (overrides permissions)">
              <select className="form-select" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                <option value="">None — use base role</option>{custom.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Home location">
              <select className="form-select" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <option value="">All locations</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Hourly rate"><input className="form-input" type="number" step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} /></Field>
            {form.id && !form.isActive && <div className="full"><SettingRow label="Reactivate"><Toggle size="sm" on={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /></SettingRow></div>}
          </div>
        )}
      </Drawer>
    </>
  );
};

const RolesTab: React.FC = () => {
  const can = useCan();
  const mutate = useMutate();
  const { data, reload } = useApi(STAFF.ROLES);
  const [form, setForm] = useState<any | null>(null);
  const catalog = data?.permissionCatalog;

  const save = async () => {
    const input = { name: form.name, description: form.description || null, permissions: form.permissions };
    try {
      if (form.id) await mutate(STAFF.UPDATE_ROLE, { id: form.id, input });
      else await mutate(STAFF.CREATE_ROLE, { input });
      toast.success('Role saved'); setForm(null); reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const togglePerm = (p: string) => setForm({ ...form, permissions: form.permissions.includes(p) ? form.permissions.filter((x: string) => x !== p) : [...form.permissions, p] });

  return (
    <>
      <div className="toolbar">
        <p className="small muted">Built-in roles cover most venues. Create custom roles (Bartender, Host, Expo, Area Manager…) with exactly the permissions they need.</p>
        <div className="spacer" />
        {can('roles.manage') && <button className="btn btn-primary btn-sm" onClick={() => setForm({ name: '', description: '', permissions: [...(catalog?.systemRoles?.STAFF || [])] })}><IconPlus size={13} /> New role</button>}
      </div>
      <div className="grid-auto">
        {(data?.roles || []).map((r: any) => (
          <div key={r.id} className="card" style={{ cursor: can('roles.manage') ? 'pointer' : 'default' }}
            onClick={() => can('roles.manage') && setForm({ ...r, readOnly: r.isSystem })}>
            <div className="card-head">
              <div className="card-title">{ROLE_LABELS[r.name] || r.name}</div>
              <span className={`badge ${r.isSystem ? 'badge-neutral' : 'badge-primary'}`}>{r.isSystem ? 'Built-in' : 'Custom'}</span>
            </div>
            <div className="small muted">{r.permissions.length} permissions · {r.userCount} members</div>
          </div>
        ))}
      </div>
      <Drawer open={!!form} onClose={() => setForm(null)} wide title={form?.readOnly ? `${ROLE_LABELS[form.name] || form.name} (built-in, read-only)` : form?.id ? `Edit ${form.name}` : 'New role'}
        footer={!form?.readOnly && <>{form?.id && <button className="btn btn-danger" onClick={async () => { await mutate(STAFF.DELETE_ROLE, { id: form.id }); setForm(null); reload(true); }}>Delete</button>}<div className="spacer" />
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary" disabled={!form?.name} onClick={save}>Save role</button></>}>
        {form && catalog && (
          <>
            {!form.readOnly && (
              <div className="form-grid">
                <Field label="Role name"><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Description"><input className="form-input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              </div>
            )}
            {catalog.groups.map((g: any) => (
              <div key={g.group} className="perm-group">
                <div className="perm-group-title">{g.group}</div>
                <div className="perm-list">
                  {g.items.map((p: any) => (
                    <label key={p.key} className="check">
                      <input type="checkbox" disabled={form.readOnly} checked={form.permissions.includes(p.key)} onChange={() => togglePerm(p.key)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </Drawer>
    </>
  );
};

const TimeTab: React.FC = () => {
  const location = useCurrentLocation();
  const can = useCan();
  const mutate = useMutate();
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d');
  const range = useMemo(() => periodRange(period), [period]);
  const { data, reload } = useApi(STAFF.TIME_ENTRIES, { locationId: location?.id, ...range });
  const rows = data?.timeEntries || [];
  const totals = rows.reduce((acc: any, e: any) => {
    const k = e.user?.name || e.userId;
    acc[k] = acc[k] || { hours: 0, cost: 0 };
    acc[k].hours += e.hours;
    acc[k].cost += e.hours * (e.user?.hourlyRate || 0);
    return acc;
  }, {});
  const totalHours = rows.reduce((s: number, e: any) => s + e.hours, 0);
  const totalCost = rows.reduce((s: number, e: any) => s + e.hours * (e.user?.hourlyRate || 0), 0);

  const edit = async (e: any) => {
    const out = window.prompt('Clock-out time (YYYY-MM-DD HH:MM)', e.clockOut ? new Date(e.clockOut).toISOString().slice(0, 16).replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' '));
    if (!out) return;
    try { await mutate(STAFF.UPDATE_TIME, { id: e.id, clockOut: new Date(out.replace(' ', 'T')).toISOString() }); reload(true); } catch (err: any) { toast.error(err.message); }
  };

  return (
    <>
      <div className="toolbar">
        <Segmented value={period} onChange={setPeriod} options={[{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]} />
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv('timesheet.csv', rows.map((e: any) => ({ staff: e.user?.name, clockIn: e.clockIn, clockOut: e.clockOut, breakMin: e.breakMinutes, hours: e.hours })))}><IconDownload size={13} /> Export timesheet</button>
      </div>
      <div className="kpi-grid">
        <Kpi label="Hours worked" value={num(totalHours, 1)} />
        <Kpi label="Labour cost" tone="warning" value={money(totalCost)} sub="from hourly rates" />
        <Kpi label="Shifts" tone="info" value={rows.length} />
        <Kpi label="On clock now" tone="success" value={rows.filter((e: any) => !e.clockOut).length} />
      </div>
      {!rows.length ? <Empty title="No time entries" hint="Staff clock in from the top bar." /> : (
        <div className="grid-main-side">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Staff</th><th>Clock in</th><th>Clock out</th><th className="num">Break</th><th className="num">Hours</th><th /></tr></thead>
              <tbody>{rows.map((e: any) => (
                <tr key={e.id}>
                  <td className="strong">{e.user?.name}</td><td>{dateTime(e.clockIn)}</td>
                  <td>{e.clockOut ? dateTime(e.clockOut) : <span className="badge badge-success">On clock</span>}</td>
                  <td className="num">{e.breakMinutes}m</td><td className="num strong">{num(e.hours, 2)}</td>
                  <td className="num">{can('timeclock.manage') && <button className="btn btn-ghost btn-sm" onClick={() => edit(e)}>Edit</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 8 }}>By team member</div>
            {Object.entries(totals).map(([k, v]: any) => (
              <div key={k} className="totals-row"><span>{k}</span><span>{num(v.hours, 1)}h · {money(v.cost)}</span></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export const StaffPage: React.FC = () => {
  const timeclock = useModule('timeclock');
  const [tab, setTab] = useState<Tab>('team');
  return (
    <div className="page-container">
      <PageHeader title="Staff" subtitle="Team, roles & permissions, time and labour" />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'team', label: 'Team', icon: <IconUsers size={13} /> },
        { key: 'roles', label: 'Roles & permissions', icon: <IconShieldLock size={13} /> },
        { key: 'time', label: 'Time clock', icon: <IconClock size={13} />, hidden: !timeclock },
      ]} />
      {tab === 'team' && <TeamTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'time' && <TimeTab />}
    </div>
  );
};

export default StaffPage;
