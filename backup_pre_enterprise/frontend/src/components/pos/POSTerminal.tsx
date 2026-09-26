import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch, useMultiTenantContext, useProduct } from '@/hooks';
import { useLocation as useRouterLocation } from 'react-router-dom';
import {
  setProducts,
  setCategories,
  addToCart,
  updateCartQuantity,
  clearCart,
} from '@/store/productSlice';
import { api, PRODUCT, CATEGORY, ORDER } from '@/services/api';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import PaymentModal from './PaymentModal';
import LoadingSpinner from '../shared/LoadingSpinner';

export const POSTerminal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { organizationId, locationId, token } = useMultiTenantContext();
  const { list: products, categories, cart } = useProduct();

  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Detect if we're serving a specific dine-in table (from /pos?tableId=...)
  const routerLocation = useRouterLocation();
  const tableSessionId = new URLSearchParams(routerLocation.search).get('tableId') || undefined;
  const orderType = tableSessionId ? 'DINE_IN' : 'TAKEAWAY';

  // Load products & categories
  useEffect(() => {
    if (!organizationId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          api.query(PRODUCT.LIST, { organizationId, isActive: true }, token),
          api.query(CATEGORY.LIST, { organizationId }, token),
        ]);
        dispatch(setProducts(prodRes.products));
        dispatch(setCategories(catRes.categories));
      } catch (err: any) {
        toast.error(err.message || 'Error loading store catalog');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, token, dispatch]);

  const handleAddToCart = (product: any) => {
    dispatch(addToCart({ product }));
  };

  const handleUpdateQty = (productId: string, qty: number) => {
    dispatch(updateCartQuantity({ productId, quantity: qty }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 8.0; // default tax rate
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discount;

  const handleCheckoutConfirm = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      await api.mutation(
        ORDER.CREATE,
        {
          organizationId,
          locationId,
          paymentMethod,
          taxAmount,
          discountAmount: discount,
          notes: notes || null,
          orderType,
          tableSessionId: tableSessionId || null,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
        token
      );

      toast.success('Transaction Completed Successfully!');
      dispatch(clearCart());
      setDiscount(0);
      setNotes('');
      setIsPaymentOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Settlement checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Connecting store catalog..." />;
  }

  return (
    <div className="page-container" style={{ padding: 0, paddingTop: 'var(--topbar-height)' }}>
      {tableSessionId && (
        <div style={{
          background: '#dbeafe', borderBottom: '1px solid #93c5fd',
          padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '10px',
          color: '#1e40af', fontSize: '14px', fontWeight: 600,
        }}>
          🪑 Dine-In Order — Table Session Active
          <a href="/tables" style={{ marginLeft: 'auto', color: '#2563eb', textDecoration: 'underline', fontWeight: 400, fontSize: '13px' }}>
            Back to Table Management
          </a>
        </div>
      )}
      <div className="pos-layout">
        <div style={{ padding: 24, overflowY: 'auto' }}>
          <ProductGrid
            products={products}
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            onAddToCart={handleAddToCart}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>

        <CartPanel
          cart={cart}
          subtotal={subtotal}
          taxRate={taxRate}
          discount={discount}
          setDiscount={setDiscount}
          onUpdateQty={handleUpdateQty}
          onRemove={(id) => handleUpdateQty(id, 0)}
          onCheckout={() => setIsPaymentOpen(true)}
          onClear={() => dispatch(clearCart())}
        />
      </div>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={Math.max(0, total)}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        notes={notes}
        setNotes={setNotes}
        onConfirm={handleCheckoutConfirm}
        loading={checkoutLoading}
      />
    </div>
  );
};

export default POSTerminal;
