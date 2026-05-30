import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Plus, Trash2 } from 'lucide-react';
import './OrdersPage.css';

const STATUS_OPTIONS = ['pending','processing','shipped','completed','cancelled'];

// Demo orders data for testing
const DEMO_ORDERS = [
  {
    customer: { email: 'priya.sharma@gmail.com', firstName: 'Priya', lastName: 'Sharma', phone: '+91 98765 12345' },
    shippingAddress: { address: '42, MG Road, Indiranagar', apartment: 'Flat 3B', city: 'Bangalore', state: 'Karnataka', zip: '560038', country: 'India' },
    items: [
      { id: '1', name: 'Heirloom Watch', price: 24900, originalPrice: 24900, qty: 1, image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80', category: 'watches', size: '40mm', material: 'Automatic' },
      { id: '8', name: 'Pearl Drop Earrings', price: 3500, originalPrice: 3500, qty: 2, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80', category: 'earrings', size: 'Medium', material: '18k Gold' },
    ],
    paymentMethod: 'upi', subtotal: 31900, shipping: 0, tax: 1595, discount: 0, couponCode: '', total: 33495, status: 'completed', notes: '',
  },
  {
    customer: { email: 'rahul.mehta@outlook.com', firstName: 'Rahul', lastName: 'Mehta', phone: '+91 87654 98765' },
    shippingAddress: { address: '15, Linking Road, Bandra West', apartment: '', city: 'Mumbai', state: 'Maharashtra', zip: '400050', country: 'India' },
    items: [
      { id: '2', name: 'Gold Signet Ring', price: 7400, originalPrice: 7400, qty: 1, image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80', category: 'rings', size: '8', material: '18k Gold' },
    ],
    paymentMethod: 'cod', subtotal: 7400, shipping: 200, tax: 370, discount: 0, couponCode: '', total: 7970, status: 'processing', notes: 'Gift wrap please',
  },
  {
    customer: { email: 'ananya.reddy@yahoo.com', firstName: 'Ananya', lastName: 'Reddy', phone: '+91 99887 65432' },
    shippingAddress: { address: '8-2-293, Road No. 14, Jubilee Hills', apartment: 'Villa 7', city: 'Hyderabad', state: 'Telangana', zip: '500033', country: 'India' },
    items: [
      { id: '11', name: 'Vintage Emerald Ring', price: 34800, originalPrice: 34800, qty: 1, image: 'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=400&q=80', category: 'rings', size: '6', material: 'Platinum' },
      { id: '12', name: 'Minimalist Gold Choker', price: 7000, originalPrice: 7000, qty: 1, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80', category: 'necklaces', size: '16"', material: '18k Gold' },
      { id: '13', name: 'Rose Gold Cuff', price: 4500, originalPrice: 4500, qty: 1, image: 'https://images.unsplash.com/photo-1576022162916-77c28f32e4e3?w=400&q=80', category: 'bracelets', size: 'M (7")', material: 'Rose Gold' },
    ],
    paymentMethod: 'card', subtotal: 46300, shipping: 0, tax: 2315, discount: 4630, couponCode: 'WELCOME10', total: 43985, status: 'shipped', notes: '',
  },
  {
    customer: { email: 'karthik.nair@gmail.com', firstName: 'Karthik', lastName: 'Nair', phone: '+91 77889 11223' },
    shippingAddress: { address: '23, Park Street', apartment: 'Block C, Apt 12', city: 'Kolkata', state: 'West Bengal', zip: '700016', country: 'India' },
    items: [
      { id: '3', name: 'Diamond Tennis Bracelet', price: 29000, originalPrice: 29000, qty: 1, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80', category: 'bracelets', size: 'M (7")', material: '18k Gold' },
    ],
    paymentMethod: 'netbanking', subtotal: 29000, shipping: 0, tax: 1450, discount: 0, couponCode: '', total: 30450, status: 'pending', notes: 'Please call before delivery',
  },
  {
    customer: { email: 'sneha.gupta@icloud.com', firstName: 'Sneha', lastName: 'Gupta', phone: '+91 98123 44556' },
    shippingAddress: { address: '56, Connaught Place', apartment: '', city: 'New Delhi', state: 'Delhi', zip: '110001', country: 'India' },
    items: [
      { id: '5', name: 'Sapphire Solitaire', price: 17400, originalPrice: 17400, qty: 1, image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=400&q=80', category: 'rings', size: '7', material: 'Platinum' },
      { id: '9', name: 'Eternity Pearl Drops', price: 5400, originalPrice: 5400, qty: 1, image: 'https://images.unsplash.com/photo-1573408301185-9519f94815b9?w=400&q=80', category: 'earrings', size: 'Small', material: 'Sterling Silver' },
    ],
    paymentMethod: 'upi', subtotal: 22800, shipping: 0, tax: 1140, discount: 0, couponCode: '', total: 23940, status: 'completed', notes: '',
  },
];

export default function OrdersPage() {
  const { showToast } = useContext(ToastContext);
  const [orders,  setOrders]  = useState([]);
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');
  const [expanded, setExpanded] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const q = query(collection(db,'orders'), orderBy('createdAt','desc'));
    const unsub = onSnapshot(q, snap =>
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db,'orders',id), { status });
    showToast(`Order status → ${status} ✓`);
  };

  // Seed demo orders
  const seedDemoOrders = async () => {
    if (!window.confirm('This will add 5 demo orders to your database for testing. Continue?')) return;
    setSeeding(true);
    try {
      for (const order of DEMO_ORDERS) {
        await addDoc(collection(db, 'orders'), {
          ...order,
          createdAt: serverTimestamp(),
        });
      }
      showToast('5 demo orders created! 🎉');
    } catch (err) {
      console.error(err);
      showToast('Error creating demo orders', 'error');
    }
    setSeeding(false);
  };

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => {
      if (!search) return true;
      const s = search.toLowerCase();
      return o.id.toLowerCase().includes(s) ||
        o.customer?.firstName?.toLowerCase().includes(s) ||
        o.customer?.lastName?.toLowerCase().includes(s) ||
        o.customer?.email?.toLowerCase().includes(s);
    });

  // Summary stats
  const totalRevenue = orders.reduce((s,o) => s+(o.total||0), 0);
  const totalQty     = orders.reduce((s,o) => s+(o.items?.reduce((a,i)=>a+i.qty,0)||0), 0);

  // Item quantity breakdown
  const itemMap = {};
  orders.forEach(o => o.items?.forEach(i => {
    if (!itemMap[i.name]) itemMap[i.name] = { qty:0, revenue:0, image: i.image };
    itemMap[i.name].qty     += i.qty;
    itemMap[i.name].revenue += (i.price||0) * i.qty;
  }));
  const topItems = Object.entries(itemMap).sort((a,b) => b[1].qty-a[1].qty);

  const STATUS_COLOR = {
    pending:'badge-gray', processing:'badge-gold',
    shipped:'badge-gold', completed:'badge-green', cancelled:'badge-gray'
  };

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">All customer orders with item breakdown and quantities.</p>
        </div>
        <button className="btn-secondary" onClick={seedDemoOrders} disabled={seeding} style={{ gap: 6 }}>
          <Plus size={14} /> {seeding ? 'Creating...' : 'Seed Demo Orders'}
        </button>
      </div>

      {/* Summary */}
      <div className="orders-summary">
        <div className="card summary-box">
          <p className="sum-val">{orders.length}</p>
          <p className="sum-label">Total Orders</p>
        </div>
        <div className="card summary-box">
          <p className="sum-val">{totalQty}</p>
          <p className="sum-label">Items Sold</p>
        </div>
        <div className="card summary-box">
          <p className="sum-val">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="sum-label">Total Revenue</p>
        </div>
        <div className="card summary-box">
          <p className="sum-val">{orders.filter(o=>o.status==='completed').length}</p>
          <p className="sum-label">Completed</p>
        </div>
      </div>

      <div className="orders-layout">
        {/* ORDERS TABLE */}
        <div className="orders-main">
          <div className="orders-toolbar">
            <input className="field-input search-input" placeholder="Search by order ID, name, or email..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="filter-tabs">
              {['all',...STATUS_OPTIONS].map(s => (
                <button key={s}
                  className={`filter-tab ${filter===s?'active':''}`}
                  onClick={() => setFilter(s)}>
                  {s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0
            ? <div className="card" style={{padding:'48px',textAlign:'center'}}>
                <p style={{color:'#aaa',fontStyle:'italic',fontSize:14}}>
                  {orders.length === 0
                    ? 'No orders yet. Click "Seed Demo Orders" to create test data, or place orders from the client site.'
                    : 'No orders match your filter.'}
                </p>
              </div>
            : <div className="orders-list">
                {filtered.map(order => (
                  <div className="order-row card" key={order.id}>
                    <div className="order-row-main" onClick={() => setExpanded(expanded===order.id?null:order.id)}>
                      <div className="order-row-left">
                        <span className="order-id-text">#{order.id.slice(0,8).toUpperCase()}</span>
                        <span className={`badge ${STATUS_COLOR[order.status]||'badge-gray'}`}>
                          {order.status || 'pending'}
                        </span>
                      </div>
                      <div className="order-row-mid">
                        <span className="order-customer-name">
                          {order.customer?.firstName} {order.customer?.lastName}
                        </span>
                        <span>{order.items?.length || 0} item(s)</span>
                        <span className="order-date-text">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                        </span>
                      </div>
                      <div className="order-row-right">
                        <span className="order-total">₹{(order.total||0).toLocaleString('en-IN')}</span>
                        <select
                          className="status-select"
                          value={order.status || 'pending'}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateStatus(order.id, e.target.value)}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expanded === order.id && (
                      <div className="order-items-expanded">
                        {/* Customer & shipping info */}
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
                            <p className="order-detail-line">Method: {order.paymentMethod || 'COD'}</p>
                            {order.couponCode && <p className="order-detail-line">Coupon: {order.couponCode}</p>}
                            {order.notes && <p className="order-detail-line" style={{ fontStyle: 'italic' }}>"{order.notes}"</p>}
                          </div>
                        </div>

                        <p className="items-heading" style={{ marginTop: 16 }}>Items in this order:</p>
                        {order.items?.map((item,i) => (
                          <div className="order-item-row" key={i}>
                            <div className="order-item-img">
                              {item.image ? <img src={item.image} alt={item.name}/> : <span>?</span>}
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
                              <span className="order-item-price">₹{(item.price||0).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}

                        {/* Order totals */}
                        <div className="order-totals">
                          <div className="order-total-row"><span>Subtotal</span><span>₹{(order.subtotal||0).toLocaleString('en-IN')}</span></div>
                          {order.discount > 0 && <div className="order-total-row discount"><span>Discount</span><span>−₹{order.discount.toLocaleString('en-IN')}</span></div>}
                          <div className="order-total-row"><span>Shipping</span><span>{order.shipping === 0 ? 'FREE' : `₹${order.shipping}`}</span></div>
                          <div className="order-total-row"><span>Tax</span><span>₹{(order.tax||0).toLocaleString('en-IN')}</span></div>
                          <div className="order-total-row grand-total"><span>Total</span><span>₹{(order.total||0).toLocaleString('en-IN')}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
          }
        </div>

        {/* ITEM BREAKDOWN SIDEBAR */}
        <div className="card items-breakdown">
          <h3 className="section-heading">Items Sold</h3>
          <p className="breakdown-sub">All-time quantities across all orders</p>
          {topItems.length === 0
            ? <p style={{color:'#bbb',fontStyle:'italic',fontSize:13,marginTop:16}}>No data yet</p>
            : topItems.slice(0, 10).map(([name, data]) => (
              <div className="breakdown-row" key={name}>
                <div className="breakdown-img">
                  {data.image ? <img src={data.image} alt={name}/> : <span>?</span>}
                </div>
                <div className="breakdown-info">
                  <p className="breakdown-name">{name}</p>
                  <p className="breakdown-rev">₹{data.revenue.toLocaleString('en-IN')}</p>
                </div>
                <span className="breakdown-qty">{data.qty} sold</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}