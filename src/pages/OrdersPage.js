import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import './OrdersPage.css';

const STATUS_OPTIONS = ['pending','processing','shipped','completed','cancelled'];

export default function OrdersPage() {
  const [orders,  setOrders]  = useState([]);
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const q = query(collection(db,'orders'), orderBy('createdAt','desc'));
    const unsub = onSnapshot(q, snap =>
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db,'orders',id), { status });
  };

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => !search || o.id.toLowerCase().includes(search.toLowerCase()));

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
      </div>

      {/* summary */}
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
          <p className="sum-val">${totalRevenue.toLocaleString()}</p>
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
          {/* toolbar */}
          <div className="orders-toolbar">
            <input className="field-input search-input" placeholder="Search by order ID..."
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
                  No orders found. When customers place orders on the client site, they appear here.
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
                        <span>{order.items?.length || 0} item(s)</span>
                        <span className="order-date-text">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                        </span>
                      </div>
                      <div className="order-row-right">
                        <span className="order-total">${(order.total||0).toLocaleString()}</span>
                        <select
                          className="status-select"
                          value={order.status || 'pending'}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateStatus(order.id, e.target.value)}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* expanded items */}
                    {expanded === order.id && (
                      <div className="order-items-expanded">
                        <p className="items-heading">Items in this order:</p>
                        {order.items?.map((item,i) => (
                          <div className="order-item-row" key={i}>
                            <div className="order-item-img">
                              {item.image ? <img src={item.image} alt={item.name}/> : <span>?</span>}
                            </div>
                            <div className="order-item-info">
                              <p className="order-item-name">{item.name}</p>
                              <p className="order-item-cat">{item.category}</p>
                            </div>
                            <div className="order-item-right">
                              <span className="order-item-qty">×{item.qty}</span>
                              <span className="order-item-price">${(item.price||0).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
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
            : topItems.map(([name, data]) => (
              <div className="breakdown-row" key={name}>
                <div className="breakdown-img">
                  {data.image ? <img src={data.image} alt={name}/> : <span>?</span>}
                </div>
                <div className="breakdown-info">
                  <p className="breakdown-name">{name}</p>
                  <p className="breakdown-rev">${data.revenue.toLocaleString()}</p>
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