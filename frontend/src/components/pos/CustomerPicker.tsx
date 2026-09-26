import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IconUserPlus, IconStar } from '@tabler/icons-react';
import Modal from '../shared/Modal';
import { useApi, useMutate } from '@/hooks';
import { CUSTOMERS } from '@/services/api';
import { money } from '@/lib/format';
import { SearchBox, Field } from '../shared/ui';

export const CustomerPicker: React.FC<{ open: boolean; onClose: () => void; onPick: (c: any | null) => void }> = ({ open, onClose, onPick }) => {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const mutate = useMutate();
  const { data } = useApi(CUSTOMERS.LIST, { search: search || null, limit: 12 }, { skip: !open });

  const create = async () => {
    try {
      const res = await mutate(CUSTOMERS.CREATE, { input: { name: form.name, phone: form.phone || null, email: form.email || null } });
      onPick(res.createCustomer);
      setCreating(false);
      setForm({ name: '', phone: '', email: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Attach customer" size="lg"
      footer={creating ? <>
        <button className="btn btn-secondary" onClick={() => setCreating(false)}>Back</button>
        <button className="btn btn-primary" disabled={!form.name} onClick={create}>Create & attach</button>
      </> : <>
        <button className="btn btn-ghost" onClick={() => onPick(null)}>Remove customer</button>
        <div className="spacer" />
        <button className="btn btn-secondary" onClick={() => { setCreating(true); setForm({ ...form, name: search }); }}><IconUserPlus size={14} /> New customer</button>
      </>}
    >
      {creating ? (
        <div className="form-grid">
          <Field label="Name" full><input className="form-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        </div>
      ) : (
        <>
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, phone or email" autoFocus />
          <div className="table-container" style={{ marginTop: 10, maxHeight: 320, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Phone</th><th className="num">Visits</th><th className="num">Spent</th><th className="num">Points</th></tr></thead>
              <tbody>
                {(data?.customers.items || []).map((c: any) => (
                  <tr key={c.id} className="clickable" onClick={() => onPick(c)}>
                    <td className="strong">{c.name}{c.houseAccount && <span className="badge badge-info" style={{ marginLeft: 6 }}>House</span>}</td>
                    <td>{c.phone || '—'}</td>
                    <td className="num">{c.visitCount}</td>
                    <td className="num">{money(c.totalSpent)}</td>
                    <td className="num"><IconStar size={11} className="text-warning" /> {c.loyaltyPoints}</td>
                  </tr>
                ))}
                {!data?.customers.items.length && <tr><td colSpan={5} className="muted small" style={{ textAlign: 'center' }}>No customers found</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
};

export default CustomerPicker;
