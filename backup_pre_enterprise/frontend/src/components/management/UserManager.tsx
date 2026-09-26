import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMultiTenantContext } from '@/hooks';
import { api, USER, LOCATION } from '@/services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import Modal from '../shared/Modal';

export const UserManager: React.FC = () => {
  const { organizationId, token } = useMultiTenantContext();
  const [users, setUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STAFF');
  const [locationId, setLocationId] = useState('');
  const [phone, setPhone] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, locRes] = await Promise.all([
        api.query(USER.LIST, { organizationId }, token),
        api.query(LOCATION.LIST, { organizationId }, token),
      ]);
      setUsers(userRes.users);
      setLocations(locRes.locations);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) loadData();
  }, [organizationId, token]);

  const openAddModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('STAFF');
    setLocationId(locations[0]?.id || '');
    setPhone('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error('Please fill in name, email, and password'); return; }
    setSubmitLoading(true);
    try {
      await api.mutation(
        USER.CREATE,
        {
          organizationId,
          name,
          email,
          password,
          role,
          locationId: locationId || null,
          phone: phone || null,
        },
        token
      );
      toast.success('Team member added successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Add user operation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      await api.mutation(USER.UPDATE, { id: user.id, isActive: !user.isActive }, token);
      toast.success(`User status toggled successfully`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user status');
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving team directory..." />;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Team Directory</h1>
          <p className="page-subtitle">Manage employee portal credentials and roles</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          ➕ Add Team Member
        </button>
      </div>

      <div className="glass-card-static" style={{ overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Primary Location</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'OWNER' ? 'badge-primary' : 'badge-neutral'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.location?.name || <span className="text-muted">All Locations</span>}</td>
                  <td>{u.phone || <span className="text-muted">—</span>}</td>
                  <td>
                    {u.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-danger">Suspended</span>
                    )}
                  </td>
                  <td>
                    {u.role !== 'OWNER' && (
                      <button
                        className={`btn ${u.isActive ? 'btn-danger' : 'btn-success'} btn-sm`}
                        onClick={() => handleToggleStatus(u)}
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Team Member"
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitLoading}>
              {submitLoading ? 'Creating...' : 'Register User'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="user-name">Full Name</label>
            <input
              id="user-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice Green"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="user-email">Email Address</label>
            <input
              id="user-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="user-pass">Initial Password</label>
            <input
              id="user-pass"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Secret123"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="user-phone">Phone Number</label>
            <input
              id="user-phone"
              type="text"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="user-role">Role Hierarchy</label>
            <select
              id="user-role"
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="STAFF">STAFF (POS Operations only)</option>
              <option value="SHIFT_LEAD">SHIFT_LEAD (Department oversight)</option>
              <option value="MANAGER">MANAGER (Location level operations)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="user-loc">Primary Assigned Location</label>
            <select
              id="user-loc"
              className="form-select"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">All Locations / Floating</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManager;
