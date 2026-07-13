import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../firebase/config';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ToastContext } from '../App';
import PageSkeleton from '../components/PageSkeleton';
import './OrdersPage.css';

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

const money = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
const displayId = (order) => order.visibleOrderId || (order.orderNumber ? `#${order.orderNumber}` : `#${order.id.slice(0, 8).toUpperCase()}`);
const monthValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const orderDate = (order) => order.createdAt?.toDate ? order.createdAt.toDate() : null;

const sendOrderEmail = async (type, order) => {
  let token;
  try {
    token = await auth.currentUser?.getIdToken();
  } catch (tokenErr) {
    console.error('getIdToken failed:', tokenErr);
    throw new Error('Your admin session is corrupted — please log out and back in.');
  }
  if (!token) throw new Error('Admin auth session expired. Please login again.');

  let res;
  try {
    res = await fetch('/.netlify/functions/send-order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, order }),
    });
  } catch (netErr) {
    console.error('Network/fetch failed:', netErr);
    throw new Error('Could not reach the email function (network/CORS issue).');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Email failed');
};
export default function OrdersPage() {
  const { showToast } = useContext(ToastContext);
  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [upiForm, setUpiForm] = useState({ upiId: '', upiName: 'KANYAMAA' });
  const [savingUpi, setSavingUpi] = useState(false);
  const [reportMonth, setReportMonth] = useState(monthValue());
  const [loaded, setLoaded] = useState({ orders: false, pending: false, payment: false });

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, source: 'orders', approved: true, ...d.data() })));
      setLoaded(state => ({ ...state, orders: true }));
    }, () => setLoaded(state => ({ ...state, orders: true })));
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'pendingOrders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setPendingOrders(snap.docs.map(d => ({ id: d.id, source: 'pendingOrders', approved: false, ...d.data() })));
      setLoaded(state => ({ ...state, pending: true }));
    }, () => setLoaded(state => ({ ...state, pending: true })));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site', 'payment_settings'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setUpiForm({
          upiId: data.upiId || '',
          upiName: data.upiName || 'KANYAMAA',
        });
      }
      setLoaded(state => ({ ...state, payment: true }));
    }, () => setLoaded(state => ({ ...state, payment: true })));
    return () => unsub();
  }, []);

  if (!loaded.orders || !loaded.pending || !loaded.payment) return <PageSkeleton />;

  const allOrders = [...pendingOrders, ...orders].sort((a, b) => {
    const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bt - at;
  });

  const updateStatus = async (order, status) => {
    if (status === 'shipped') {
      const courierName = window.prompt(`Courier / delivery company for ${displayId(order)}:`, order.shippingTracking?.courierName || '');
      if (courierName === null) return;

      const trackingNumber = window.prompt(`Tracking number for ${displayId(order)}:`, order.shippingTracking?.trackingNumber || '');
      if (trackingNumber === null) return;

      if (!courierName.trim() || !trackingNumber.trim()) {
        showToast('Courier name and tracking number are required for shipped status', 'error');
        return;
      }

      const shippingTracking = {
        courierName: courierName.trim(),
        trackingNumber: trackingNumber.trim(),
        shippedAt: new Date().toISOString(),
      };

      const updatedOrder = { ...order, status: 'shipped', shippingTracking };

      await updateDoc(doc(db, 'orders', order.id), {
        status: 'shipped',
        shippingTracking,
        updatedAt: serverTimestamp(),
      });

      try {
        await sendOrderEmail('shipped', updatedOrder);
        showToast('Order shipped + email sent ✓');
      } catch (err) {
        console.error(err);
        showToast(`Status saved, but email failed: ${err.message}`, 'error');
      }
      return;
    }

    await updateDoc(doc(db, 'orders', order.id), { status, updatedAt: serverTimestamp() });
    showToast(`Order status → ${status} ✓`);
  };

  const approveOrder = async (order) => {
    if (!order.paymentProof?.utr || !order.paymentProof?.screenshotDataUrl) {
      showToast('UTR and screenshot are required before approval', 'error');
      return;
    }

    const amountPaid = Number(order.paymentProof?.amountPaid || 0);
    const payable = Number(order.payableAmount || order.total || 0);

    if (amountPaid !== payable) {
      showToast(`Amount mismatch. Expected ${money(payable)}, proof says ${money(amountPaid)}`, 'error');
      return;
    }

    if (!window.confirm(`Approve ${displayId(order)} for ${money(payable)}?`)) return;

    setBusyId(order.id);
    try {
      const orderNumber = order.orderNumber || order.id;
      const { id, source, approved, ...orderFields } = order;
      const approvedOrder = {
        ...orderFields,
        approved: true,
        orderNumber,
        visibleOrderId: `#${orderNumber}`,
        paymentMethod: 'upi_qr',
        paymentStatus: 'approved',
        status: 'pending',
        payableAmount: payable,
        total: payable,
        sourcePendingId: order.id,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'orders', orderNumber), approvedOrder);
      await deleteDoc(doc(db, 'pendingOrders', order.id));

      try {
        await sendOrderEmail('verified', approvedOrder);
        showToast(`${displayId(order)} approved + email sent ✓`);
      } catch (err) {
        console.error(err);
        showToast(`Approved, but email failed: ${err.message}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not approve order', 'error');
    }
    setBusyId('');
  };

  const rejectOrder = async (order) => {
    const reason = window.prompt(`Reject ${displayId(order)}? Enter the reason for the customer:`, '');
    if (reason === null) return;
    if (!reason.trim()) {
      showToast('A rejection reason is required', 'error');
      return;
    }

    setBusyId(order.id);
    try {
      const rejectedOrder = {
        ...order,
        status: 'rejected',
        paymentStatus: 'rejected',
        rejectionReason: reason.trim(),
      };
      await updateDoc(doc(db, 'pendingOrders', order.id), {
        status: 'rejected',
        paymentStatus: 'rejected',
        rejectionReason: reason.trim(),
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      try {
        await sendOrderEmail('rejected', rejectedOrder);
        showToast(`${displayId(order)} rejected + email sent ✓`);
      } catch (emailError) {
        console.error(emailError);
        showToast(`Order rejected, but email failed: ${emailError.message}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not reject order', 'error');
    }
    setBusyId('');
  };

  const saveUpiSettings = async (e) => {
    e.preventDefault();
    const upiId = upiForm.upiId.trim();
    const upiName = upiForm.upiName.trim() || 'KANYAMAA';

    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{2,64}$/.test(upiId)) {
      showToast('Enter a valid UPI ID like name@bank', 'error');
      return;
    }

    setSavingUpi(true);
    try {
      await setDoc(doc(db, 'site', 'payment_settings'), {
        upiId,
        upiName,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast('UPI payment settings saved ✓');
    } catch (err) {
      console.error(err);
      showToast('Could not save UPI settings', 'error');
    }
    setSavingUpi(false);
  };

  const downloadMonthlyReport = () => {
    if (!reportMonth) return;

    const [year, month] = reportMonth.split('-').map(Number);
    const monthOrders = allOrders.filter(order => {
      const date = orderDate(order);
      return date && date.getFullYear() === year && date.getMonth() + 1 === month;
    });
    const headers = ['Order ID', 'Order Date', 'Status', 'Payment Status', 'Customer Name', 'Email', 'Phone', 'Shipping Address', 'Items Bought', 'Item Quantity', 'Order Amount', 'Amount Paid', 'UTR', 'Coupon', 'Rejection Reason'];
    const rows = monthOrders.map(order => {
      const items = order.items || [];
      const address = order.shippingAddress || {};
      return [
        displayId(order), orderDate(order)?.toLocaleDateString('en-IN') || '', order.status || 'payment pending', order.paymentStatus || 'pending',
        `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(), order.customer?.email, order.customer?.phone,
        [address.address, address.apartment, address.city, address.state, address.zip].filter(Boolean).join(', '),
        items.map(item => `${item.name || 'Item'} x${item.qty || 0}`).join('; '), items.reduce((total, item) => total + Number(item.qty || 0), 0),
        Number(order.payableAmount || order.total || 0), Number(order.paymentProof?.amountPaid || 0), order.paymentProof?.utr, order.couponCode, order.rejectionReason,
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(csvValue).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-summary-${reportMonth}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${monthOrders.length} order${monthOrders.length === 1 ? '' : 's'} exported for ${reportMonth}`);
  };

  const filtered = allOrders
    .filter(o => {
      if (filter === 'all') return true;
      if (filter === 'payment_pending') return !o.approved && o.paymentStatus !== 'rejected';
      if (filter === 'rejected') return o.paymentStatus === 'rejected' || o.status === 'rejected';
      return o.status === filter;
    })
    .filter(o => {
      if (!search) return true;
      const s = search.toLowerCase();
      return displayId(o).toLowerCase().includes(s)
        || o.id.toLowerCase().includes(s)
        || o.customer?.firstName?.toLowerCase().includes(s)
        || o.customer?.lastName?.toLowerCase().includes(s)
        || o.customer?.email?.toLowerCase().includes(s)
        || o.paymentProof?.utr?.toLowerCase().includes(s);
    });

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalQty = orders.reduce((s, o) => s + (o.items?.reduce((a, i) => a + i.qty, 0) || 0), 0);

  const itemMap = {};
  orders.forEach(o => o.items?.forEach(i => {
    if (!itemMap[i.name]) itemMap[i.name] = { qty: 0, revenue: 0, image: i.image };
    itemMap[i.name].qty += i.qty;
    itemMap[i.name].revenue += (i.price || 0) * i.qty;
  }));
  const topItems = Object.entries(itemMap).sort((a, b) => b[1].qty - a[1].qty);

  const STATUS_COLOR = {
    payment_pending: 'badge-gold',
    pending: 'badge-gray',
    processing: 'badge-gold',
    shipped: 'badge-gold',
    completed: 'badge-green',
    cancelled: 'badge-gray',
    rejected: 'badge-red',
  };

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">Approve QR payments first. Shipping statuses unlock after approval.</p>
        </div>
      </div>

      <form className="card upi-settings-card" onSubmit={saveUpiSettings}>
        <div>
          <p className="items-heading">QR Payment Settings</p>
          <h3>UPI account used for customer QR payments</h3>
          <p>Only admin can edit this. The client payment QR updates automatically from Firestore.</p>
        </div>
        <label>
          <span>UPI ID</span>
          <input
            value={upiForm.upiId}
            onChange={e => setUpiForm(prev => ({ ...prev, upiId: e.target.value }))}
            placeholder="jatinsingh101219@okhdfcbank"
          />
        </label>
        <label>
          <span>Payee Name</span>
          <input
            value={upiForm.upiName}
            onChange={e => setUpiForm(prev => ({ ...prev, upiName: e.target.value }))}
            placeholder="KANYAMAA"
          />
        </label>
        <button type="submit" disabled={savingUpi}>
          {savingUpi ? 'Saving...' : 'Save UPI'}
        </button>
      </form>

      <div className="orders-summary">
        <div className="card summary-box">
          <p className="sum-val">{allOrders.length}</p>
          <p className="sum-label">Total Orders</p>
        </div>
        <div className="card summary-box">
          <p className="sum-val">{pendingOrders.filter(o => o.paymentStatus === 'submitted_for_verification').length}</p>
          <p className="sum-label">Need Verification</p>
        </div>
        <div className="card summary-box">
          <p className="sum-val">{money(totalRevenue)}</p>
          <p className="sum-label">Approved Revenue</p>
        </div>
        <div className="card summary-box">
          <p className="sum-val">{orders.filter(o => o.status === 'completed').length}</p>
          <p className="sum-label">Completed</p>
        </div>
      </div>

      <div className="card monthly-report-card">
        <div>
          <p className="items-heading">Monthly order summary</p>
          <p>Download every order for a selected month, including customer details, products, amounts paid, and rejection reasons.</p>
        </div>
        <label>
          <span>Month</span>
          <input type="month" value={reportMonth} max={monthValue()} onChange={e => setReportMonth(e.target.value)} />
        </label>
        <button type="button" onClick={downloadMonthlyReport}>Download Excel</button>
      </div>

      <div className="orders-layout">
        <div className="orders-main">
          <div className="orders-toolbar">
            <input
              className="field-input search-input"
              placeholder="Search by order ID, name, email, or UTR..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="filter-tabs">
              {['all', 'payment_pending', ...STATUS_OPTIONS, 'rejected'].map(s => (
                <button key={s} className={`filter-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: 14 }}>No orders match your filter.</p>
            </div>
          ) : (
            <div className="orders-list">
              {filtered.map(order => {
                const isPendingPayment = !order.approved;
                const status = order.paymentStatus === 'rejected' ? 'rejected' : (isPendingPayment ? 'payment_pending' : order.status || 'pending');
                const isRejected = status === 'rejected';

                return (
                  <div className="order-row card" key={`${order.source}-${order.id}`}>
                    <div className="order-row-main" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                      <div className="order-row-left">
                        <span className="order-id-text">{displayId(order)}</span>
                        <span className={`badge ${STATUS_COLOR[status] || 'badge-gray'}`}>{status.replace('_', ' ')}</span>
                      </div>
                      <div className="order-row-mid">
                        <span className="order-customer-name">{order.customer?.firstName} {order.customer?.lastName}</span>
                        <span>{order.items?.length || 0} item(s)</span>
                        <span className="order-date-text">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </div>
                      <div className="order-row-right">
                        <span className="order-total">{money(order.payableAmount || order.total)}</span>

                        {isPendingPayment && !isRejected ? (
                          <div className="verify-actions" onClick={e => e.stopPropagation()}>
                            <button
                              className="approve-btn"
                              disabled={busyId === order.id || order.paymentStatus !== 'submitted_for_verification'}
                              onClick={() => approveOrder(order)}
                            >
                              Approve
                            </button>
                            <button className="reject-btn" disabled={busyId === order.id} onClick={() => rejectOrder(order)}>
                              Reject
                            </button>
                          </div>
                        ) : !isRejected ? (
                          <select
                            className="status-select"
                            value={order.status || 'pending'}
                            onClick={e => e.stopPropagation()}
                            onChange={e => updateStatus(order, e.target.value)}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : null}
                      </div>
                    </div>

                    {expanded === order.id && (
                      <div className="order-items-expanded">
                        <div className="order-details-grid">
                          <div className="order-detail-section">
                            <p className="items-heading">Customer</p>
                            <p className="order-detail-line">{order.customer?.firstName} {order.customer?.lastName}</p>
                            <p className="order-detail-line">{order.customer?.email}</p>
                            <p className="order-detail-line">{order.customer?.phone}</p>
                          </div>
                          <div className="order-detail-section">
                            <p className="items-heading">Shipping Address</p>
                            <p className="order-detail-line">{order.shippingAddress?.address}</p>
                            {order.shippingAddress?.apartment && <p className="order-detail-line">{order.shippingAddress.apartment}</p>}
                            <p className="order-detail-line">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}</p>
                          </div>
                          <div className="order-detail-section">
                            <p className="items-heading">Payment & Notes</p>
                            <p className="order-detail-line">Method: UPI QR</p>
                            <p className="order-detail-line">Payable: <strong>{money(order.payableAmount || order.total)}</strong></p>
                            {order.paymentProof?.amountPaid && <p className="order-detail-line">Amount Paid: <strong>{money(order.paymentProof.amountPaid)}</strong></p>}
                            {order.paymentProof?.utr && <p className="order-detail-line">UTR: <strong>{order.paymentProof.utr}</strong></p>}
                            {order.shippingTracking?.courierName && <p className="order-detail-line">Courier: <strong>{order.shippingTracking.courierName}</strong></p>}
                            {order.shippingTracking?.trackingNumber && <p className="order-detail-line">Tracking ID: <strong>{order.shippingTracking.trackingNumber}</strong></p>}
                            {order.couponCode && <p className="order-detail-line">Coupon: {order.couponCode}</p>}
                            {order.notes && <p className="order-detail-line" style={{ fontStyle: 'italic' }}>"{order.notes}"</p>}
                            {order.rejectionReason && <p className="order-detail-line rejection-reason"><strong>Rejection reason:</strong> {order.rejectionReason}</p>}
                          </div>
                        </div>

                        {order.paymentProof?.screenshotDataUrl && (
                          <div className="payment-proof-box">
                            <div>
                              <p className="items-heading">Payment Screenshot</p>
                              <p className="order-detail-line">{order.paymentProof.screenshotName || 'Uploaded screenshot'}</p>
                            </div>
                            <a href={order.paymentProof.screenshotDataUrl} target="_blank" rel="noreferrer">
                              <img src={order.paymentProof.screenshotDataUrl} alt="Payment proof" />
                            </a>
                          </div>
                        )}

                        <p className="items-heading" style={{ marginTop: 16 }}>Items in this order:</p>
                        {order.items?.map((item, i) => (
                          <div className="order-item-row" key={i}>
                            <div className="order-item-img">
                              {item.image ? <img src={item.image} alt={item.name} /> : <span>?</span>}
                            </div>
                            <div className="order-item-info">
                              <p className="order-item-name">{item.name}</p>
                              <p className="order-item-cat">
                                {item.category}
                                {item.size && ` · Size: ${item.size}`}
                                {item.material && ` · ${item.material}`}
                              </p>
                            </div>
                            <div className="order-item-right">
                              <span className="order-item-qty">×{item.qty}</span>
                              <span className="order-item-price">{money(item.price)}</span>
                            </div>
                          </div>
                        ))}

                        <div className="order-totals">
                          <div className="order-total-row"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
                          {order.discount > 0 && <div className="order-total-row discount"><span>Discount</span><span>−{money(order.discount)}</span></div>}
                          <div className="order-total-row"><span>Shipping</span><span>{order.shipping === 0 ? 'FREE' : money(order.shipping)}</span></div>
                          <div className="order-total-row"><span>Tax</span><span>{money(order.tax)}</span></div>
                          <div className="order-total-row grand-total"><span>Total</span><span>{money(order.payableAmount || order.total)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card items-breakdown">
          <h3 className="section-heading">Items Sold</h3>
          <p className="breakdown-sub">Approved orders only</p>
          {topItems.length === 0 ? (
            <p style={{ color: '#bbb', fontStyle: 'italic', fontSize: 13, marginTop: 16 }}>No data yet</p>
          ) : topItems.slice(0, 10).map(([name, data]) => (
            <div className="breakdown-row" key={name}>
              <div className="breakdown-img">{data.image ? <img src={data.image} alt={name} /> : <span>?</span>}</div>
              <div className="breakdown-info">
                <p className="breakdown-name">{name}</p>
                <p className="breakdown-rev">{money(data.revenue)}</p>
              </div>
              <span className="breakdown-qty">{data.qty} sold</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
