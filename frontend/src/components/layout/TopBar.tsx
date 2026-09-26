import React, { useEffect, useRef, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconMapPin, IconClock, IconUserCircle, IconLogout, IconSwitchHorizontal, IconKey, IconCash, IconChevronDown,
} from '@tabler/icons-react';
import { useAuth, useAppDispatch, useLocation, useModule, useOrg, useApi, useMutate } from '@/hooks';
import { setCurrentLocation } from '@/store/locationSlice';
import { logout } from '@/store/authSlice';
import { clearOrganization } from '@/store/organizationSlice';
import { AUTH, CASH, STAFF } from '@/services/api';
import { NAV } from '@/lib/nav';
import { time } from '@/lib/format';
import { useSessionLoader } from '@/hooks/useSession';
import Modal from '../shared/Modal';
import { PinPad } from '../shared/ui';

export const TopBar: React.FC = () => {
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { settings } = useOrg();
  const { list: locations, current } = useLocation();
  const mutate = useMutate();
  const loadSession = useSessionLoader();
  const timeclock = useModule('timeclock');
  const cashMgmt = useModule('cashManagement');

  const page = NAV.find((n) => routerLocation.pathname.startsWith(n.path));
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinMode, setPinMode] = useState<null | 'switch' | 'set'>(null);
  const [pin, setPin] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: clock, reload: reloadClock } = useApi(STAFF.MY_TIME, {}, { skip: !timeclock });
  const { data: shift } = useApi(CASH.CURRENT, { locationId: current?.id }, { skip: !cashMgmt || !current, pollMs: 60000 });

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggleClock = async () => {
    try {
      if (clock?.myTimeEntry) {
        await mutate(STAFF.CLOCK_OUT, {});
        toast.success('Clocked out');
      } else {
        await mutate(STAFF.CLOCK_IN, { locationId: current?.id });
        toast.success('Clocked in');
      }
      reloadClock(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const submitPin = async () => {
    if (pin.length < 4) return;
    try {
      if (pinMode === 'switch') {
        const res = await mutate(AUTH.SWITCH_USER, { pin });
        await loadSession(res.switchUser.token);
        toast.success(`Switched to ${res.switchUser.user.name}`);
      } else {
        await mutate(AUTH.SET_PIN, { pin });
        toast.success('PIN updated');
      }
      setPinMode(null);
      setPin('');
    } catch (e: any) { toast.error(e.message); setPin(''); }
  };

  const signOut = () => {
    dispatch(logout());
    dispatch(clearOrganization());
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <div className="topbar-title">{page?.label || 'MageOS'}</div>
          {page?.subtitle && <div className="topbar-sub">{page.subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right">
        {locations.length > 1 ? (
          <div className="row" style={{ gap: 4 }}>
            <IconMapPin size={14} className="muted" />
            <select
              className="form-select topbar-select"
              value={current?.id || ''}
              onChange={(e) => {
                const loc = locations.find((l) => l.id === e.target.value);
                if (loc) dispatch(setCurrentLocation(loc));
              }}
            >
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        ) : current && (
          <div className="topbar-location"><IconMapPin size={13} /> {current.name}</div>
        )}

        {cashMgmt && (
          <button className="topbar-location" style={{ cursor: 'pointer' }} onClick={() => navigate('/cash')} title="Cash drawer">
            <span className={`dot ${shift?.currentShift ? 'success' : 'warning'}`} />
            <IconCash size={13} /> {shift?.currentShift ? 'Drawer open' : 'No drawer'}
          </button>
        )}

        {timeclock && (
          <button className={`btn btn-sm ${clock?.myTimeEntry ? 'btn-success' : 'btn-secondary'}`} onClick={toggleClock}>
            <IconClock size={13} />
            {clock?.myTimeEntry ? `On clock · ${time(clock.myTimeEntry.clockIn)}` : 'Clock in'}
          </button>
        )}

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button className="topbar-location" style={{ cursor: 'pointer' }} onClick={() => setMenuOpen((o) => !o)}>
            <IconUserCircle size={14} /> {user?.name?.split(' ')[0]} <IconChevronDown size={12} />
          </button>
          {menuOpen && (
            <div className="user-menu">
              {settings?.security?.pinSwitchUser && (
                <button onClick={() => { setMenuOpen(false); setPinMode('switch'); }}><IconSwitchHorizontal size={14} /> Switch user (PIN)</button>
              )}
              <button onClick={() => { setMenuOpen(false); setPinMode('set'); }}><IconKey size={14} /> Set my PIN</button>
              <div className="divider" style={{ margin: '4px 0' }} />
              <button onClick={signOut}><IconLogout size={14} /> Sign out</button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!pinMode} onClose={() => { setPinMode(null); setPin(''); }} title={pinMode === 'switch' ? 'Switch user' : 'Set your POS PIN'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setPinMode(null); setPin(''); }}>Cancel</button>
          <button className="btn btn-primary" disabled={pin.length < 4} onClick={submitPin}>{pinMode === 'switch' ? 'Switch' : 'Save PIN'}</button>
        </>}
      >
        <p className="small muted" style={{ textAlign: 'center' }}>{pinMode === 'switch' ? 'Enter your 4–6 digit PIN' : 'Choose a 4–6 digit PIN for fast sign-in and approvals'}</p>
        <PinPad value={pin} onChange={setPin} onSubmit={submitPin} />
      </Modal>
    </header>
  );
};

export default TopBar;
