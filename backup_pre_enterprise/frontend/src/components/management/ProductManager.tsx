import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMultiTenantContext } from '@/hooks';
import { api, PRODUCT, CATEGORY } from '@/services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import Modal from '../shared/Modal';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';

export const ProductManager: React.FC = () => {
  const { organizationId, token } = useMultiTenantContext();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.query(PRODUCT.LIST, { organizationId }, token),
        api.query(CATEGORY.LIST, { organizationId }, token),
      ]);
      setProducts(prodRes.products);
      setCategories(catRes.categories);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) loadData();
  }, [organizationId, token]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setDescription('');
    setSku('');
    setCategoryId(categories[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (prod: any) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price.toString());
    setDescription(prod.description || '');
    setSku(prod.sku || '');
    setCategoryId(prod.categoryId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) { toast.error('Please enter product name and price'); return; }
    setSubmitLoading(true);

    try {
      if (editingProduct) {
        await api.mutation(
          PRODUCT.UPDATE,
          {
            id: editingProduct.id,
            name,
            price: parseFloat(price),
            description: description || null,
            categoryId: categoryId || null,
          },
          token
        );
        toast.success('Product updated successfully');
      } else {
        await api.mutation(
          PRODUCT.CREATE,
          {
            organizationId,
            name,
            price: parseFloat(price),
            description: description || null,
            sku: sku || null,
            categoryId: categoryId || null,
          },
          token
        );
        toast.success('Product added successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to disable this product?')) return;
    try {
      await api.mutation(PRODUCT.DELETE, { id }, token);
      toast.success('Product disabled');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Delete operation failed');
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving product catalog..." />;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Product Catalog</h1>
          <p className="page-subtitle">Add, modify, or archive menu items and products</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPlus size={16} /> Add Product
        </button>
      </div>

      <div className="glass-card-static" style={{ overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => (
                <tr key={prod.id}>
                  <td style={{ fontWeight: 600 }}>{prod.name}</td>
                  <td>
                    {prod.category ? (
                      <span className="badge badge-primary">{prod.category.name}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>{prod.sku || <span className="text-muted">—</span>}</td>
                  <td style={{ fontWeight: 700 }}>${prod.price.toFixed(2)}</td>
                  <td>
                    {prod.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(prod)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconEdit size={14} /> Edit
                      </button>
                      {prod.isActive && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(prod.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IconTrash size={14} /> Disable
                        </button>
                      )}
                    </div>
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
        title={editingProduct ? 'Modify Catalog Item' : 'New Catalog Item'}
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitLoading}>
              {submitLoading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="prod-name">Name</label>
            <input
              id="prod-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chocolate Donut"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prod-price">Retail Price ($)</label>
            <input
              id="prod-price"
              type="number"
              step="0.01"
              className="form-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="4.99"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prod-sku">SKU Code</label>
            <input
              id="prod-sku"
              type="text"
              className="form-input"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="DONUT-CHOC-01"
              disabled={!!editingProduct}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prod-cat">Category</label>
            <select
              id="prod-cat"
              className="form-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prod-desc">Description</label>
            <textarea
              id="prod-desc"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Item recipe, contents, ingredients..."
              style={{ minHeight: 60 }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductManager;
