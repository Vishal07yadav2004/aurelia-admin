import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Package, ShoppingBag, TrendingUp, IndianRupee, X } from 'lucide-react';
import PageSkeleton from '../components/PageSkeleton';
import './Dashboard.css';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loaded, setLoaded] = useState({ products: false, orders: false });

  useEffect(() => {
    const unsubP = onSnapshot(collection(db, 'products'), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoaded(state => ({ ...state, products: true }));
    }, () => setLoaded(state => ({ ...state, products: true })));
    const unsubO = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoaded(state => ({ ...state, orders: true }));
      },
      () => setLoaded(state => ({ ...state, orders: true }))
    );
    return () => { unsubP(); unsubO(); };
  }, []);

  if (!loaded.products || !loaded.orders) return <PageSkeleton variant="dashboard" />;

  const dashboardOrders = orders.filter(o => !o.dashboardHidden);
  const totalRevenue  = dashboardOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalItems    = dashboardOrders.reduce((s, o) => s + (o.items?.reduce((a,i) => a + i.qty, 0) || 0), 0);
  const totalProducts = products.length;
  const recentOrders  = dashboardOrders.slice(0, 8);

  const removeFromDashboard = async (order) => {
    if (!window.confirm(`Remove #${order.id.slice(0, 8).toUpperCase()} from this dashboard? It will remain available in Orders.`)) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        dashboardHidden: true,
        dashboardHiddenAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Could not remove order from dashboard:', error);
      window.alert('Could not remove this order from the dashboard. Please try again.');
    }
  };

  const soldMap = {};
  dashboardOrders.forEach(o => o.items?.forEach(i => {
    soldMap[i.name] = (soldMap[i.name] || 0) + i.qty;
  }));
  const topProducts = Object.entries(soldMap).sort((a,b) => b[1]-a[1]).slice(0, 5);

  const STATS = [
    { label: 'Total Products', value: totalProducts,                              icon: Package,    color: '#6c63ff' },
    { label: 'Total Orders',   value: dashboardOrders.length,                     icon: ShoppingBag,color: '#2d6a4f' },
    { label: 'Items Sold',     value: totalItems,                                 icon: TrendingUp, color: '#C9A84C' },
    { label: 'Revenue',        value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: '#1a1a1a' },
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">Welcome back — here's what's happening with Kanyamaa today.</p>
      </div>

      <div className="stats-grid">
        {STATS.map(s => (
          <div className="stat-card card" key={s.label}>
            <div className="stat-icon" style={{ background: s.color + '18', color: s.color }}>
              <s.icon size={20} strokeWidth={1.8} />
            </div>
            <div>
              <p className="stat-value">{s.value}</p>
              <p className="stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-bottom">
        <div className="card dash-orders">
          <h3 className="section-heading">Recent Orders</h3>
          {recentOrders.length === 0
            ? <p className="empty-msg">No orders yet. Orders placed on the client site will appear here.</p>
            : (
              <table className="orders-table">
                <thead>
                  <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th aria-label="Actions"></th></tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.id}>
                      <td className="order-id">#{o.id.slice(0,8).toUpperCase()}</td>
                      <td>{o.customer?.firstName || '—'} {o.customer?.lastName || ''}</td>
                      <td>{o.items?.length || 0} item(s)</td>
                      <td>₹{(o.total||0).toLocaleString('en-IN')}</td>
                      <td><span className={`badge badge-${o.status === 'completed' ? 'green' : o.status === 'cancelled' ? 'gray' : 'gold'}`}>{o.status || 'pending'}</span></td>
                      <td className="order-date">{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}</td>
                      <td className="dashboard-order-actions">
                        <button type="button" className="remove-dashboard-order" onClick={() => removeFromDashboard(o)} title="Remove from dashboard" aria-label={`Remove order #${o.id.slice(0, 8).toUpperCase()} from dashboard`}>
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        <div className="card dash-top">
          <h3 className="section-heading">Top Selling Items</h3>
          {topProducts.length === 0
            ? <p className="empty-msg">No sales data yet.</p>
            : topProducts.map(([name, qty], i) => (
              <div className="top-item" key={name}>
                <span className="top-rank">#{i+1}</span>
                <span className="top-name">{name}</span>
                <span className="top-qty">{qty} sold</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
