import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMultiTenantContext, useAppDispatch } from '@/hooks';
import { setLocations, setCurrentLocation } from '@/store/locationSlice';
import { api, LOCATION, DEPARTMENT } from '@/services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import Modal from '../shared/Modal';

export const LocationManager: React.FC = () => {
  const { organizationId, token } = useMultiTenantContext();
  const dispatch = useAppDispatch();
  const [locList, setLocList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals and Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const [activeLoc, setActiveLoc] = useState<any>(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.query(LOCATION.LIST, { organizationId }, token);
      setLocList(data.locations);
      dispatch(setLocations(data.locations));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load store locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) loadData();
  }, [organizationId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error('Name is required'); return; }
    setSubmitLoading(true);

    try {
      await api.mutation(
        LOCATION.CREATE,
        { organizationId, name, address: address || null, phone: phone || null, email: email || null },
        token
      );
      toast.success('Location registered successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Location registration failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName) { toast.error('Department name is required'); return; }
    setSubmitLoading(true);

    try {
      await api.mutation(
        DEPARTMENT.CREATE,
        { locationId: activeLoc.id, name: deptName, description: deptDesc || null },
        token
      );
      toast.success('Department created successfully');
      setIsDeptModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Department setup failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSelectLocation = (loc: any) => {
    dispatch(setCurrentLocation(loc));
    toast.success(`Active outlet switched to: ${loc.name}`);
  };

  if (loading) return <LoadingSpinner text="Connecting organization outlets..." />;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Store Locations</h1>
          <p className="page-subtitle">Configure business outlets and local department zones</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          ➕ Add Location
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {locList.map((loc) => (
          <div key={loc.id} className="glass-card-static p-6" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{loc.name}</h3>
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>{loc.address || 'No address configured'}</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => handleSelectLocation(loc)}>
                🎯 Set Active
              </button>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="font-semibold text-xs text-secondary">Departments ({loc.departments?.length || 0})</span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 6px', fontSize: 10 }}
                  onClick={() => {
                    setActiveLoc(loc);
                    setDeptName('');
                    setDeptDesc('');
                    setIsDeptModalOpen(true);
                  }}
                >
                  ＋ Add Dept
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {loc.departments?.map((dept: any) => (
                  <span key={dept.id} className="badge badge-neutral" style={{ fontSize: 11 }}>
                    🏢 {dept.name}
                  </span>
                ))}
                {(!loc.departments || loc.departments.length === 0) && (
                  <span className="text-xs text-muted">No departments configured</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Outlet"
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitLoading}>
              {submitLoading ? 'Registering...' : 'Register Location'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="loc-name">Location Name</label>
            <input
              id="loc-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Downtown Outlet"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="loc-addr">Street Address</label>
            <input
              id="loc-addr"
              type="text"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="loc-phone">Contact Phone</label>
            <input
              id="loc-phone"
              type="text"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="loc-email">Contact Email</label>
            <input
              id="loc-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="downtown@company.com"
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={`Add Department to ${activeLoc?.name}`}
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreateDept} disabled={submitLoading}>
              {submitLoading ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateDept} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="dept-name">Department Name</label>
            <input
              id="dept-name"
              type="text"
              className="form-input"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Counter, Kitchen, Bakery Shop"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dept-desc">Description</label>
            <input
              id="dept-desc"
              type="text"
              className="form-input"
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              placeholder="Functional description, purpose..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LocationManager;
