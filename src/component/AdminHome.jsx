// ============================================================
//  AdminHome.jsx  –  Admin dashboard
//
//  Sidebar sections:
//    home       – Dashboard summary (revenue, total books, orders)
//    inventory  – Full book CRUD: add, update, delete, search
//    orders     – All orders across all users
//    revenue    – Revenue breakdown
//
//  Admin also inherits User panel features (browse/cart/wishlist)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar    from './Sidebar';
import StarRating from './StarRating';
import { toast }  from './Toast';
import './AdminHome.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Blank form for add/edit book
const EMPTY_BOOK = { title:'', author:'', category:'', description:'', price:'', stock:'', image:'', discount:'', isNew:false, isBestseller:false };

export default function AdminHome() {
  const navigate = useNavigate();
  const user     = JSON.parse(sessionStorage.getItem('pt_user') || '{}');

  // ── Active sidebar panel ──────────────────────────────────
  const [panel, setPanel] = useState('home');

  // ── Books state ───────────────────────────────────────────
  const [books,     setBooks]     = useState([]);
  const [booksLoad, setBooksLoad] = useState(true);
  const [booksErr,  setBooksErr]  = useState('');

  // ── Inventory UI state ────────────────────────────────────
  const [invSearch,   setInvSearch]   = useState('');
  const [invSearchBy, setInvSearchBy] = useState('name');
  const [invResults,  setInvResults]  = useState(null);  // null = show all
  const [showAddForm, setShowAddForm] = useState(false);
  const [editBook,    setEditBook]    = useState(null);   // book being edited
  const [bookForm,    setBookForm]    = useState(EMPTY_BOOK);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);   // confirm-delete id

  // ── Orders ────────────────────────────────────────────────
  const [allOrders,   setAllOrders]   = useState([]);
  const [ordersLoad,  setOrdersLoad]  = useState(false);

  // ── Revenue ───────────────────────────────────────────────
  const [revenue, setRevenue] = useState(null);

  // ════════════════════════════════════════════════════════════
  //  Data loading
  // ════════════════════════════════════════════════════════════

  // Books
  useEffect(() => {
    let alive = true;
    setBooksLoad(true);
    fetch(`${API}/api/books`)
      .then(r => r.json())
      .then(d => { if (alive) { setBooks(Array.isArray(d) ? d : []); setBooksErr(''); } })
      .catch(() => { if (alive) setBooksErr('Failed to load books'); })
      .finally(() => { if (alive) setBooksLoad(false); });
    return () => { alive = false; };
  }, []);

  // All orders (admin)
  useEffect(() => {
    if (panel !== 'orders' && panel !== 'home') return;
    setOrdersLoad(true);
    fetch(`${API}/api/admin/orders`)
      .then(r => r.json())
      .then(d => setAllOrders(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setOrdersLoad(false));
  }, [panel]);

  // Revenue
  useEffect(() => {
    if (panel !== 'revenue' && panel !== 'home') return;
    fetch(`${API}/api/admin/revenue`)
      .then(r => r.json())
      .then(d => setRevenue(d.totalRevenue ?? 0))
      .catch(() => {});
  }, [panel]);

  // ════════════════════════════════════════════════════════════
  //  Inventory helpers
  // ════════════════════════════════════════════════════════════

  function openAddForm() { setBookForm(EMPTY_BOOK); setEditBook(null); setShowAddForm(true); }
  function openEditForm(book) {
    setBookForm({
      title:       book.title       || '',
      author:      book.author      || '',
      category:    book.category    || '',
      description: book.description || '',
      price:       book.price       || '',
      stock:       book.stock       || '',
      image:       book.image       || '',
      discount:    book.discount    || '',
      isNew:       book.isNew       || false,
      isBestseller:book.isBestseller|| false,
    });
    setEditBook(book);
    setShowAddForm(true);
  }
  function closeForm() { setShowAddForm(false); setEditBook(null); setBookForm(EMPTY_BOOK); }

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    setBookForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        ...bookForm,
        price:    parseFloat(bookForm.price) || 0,
        stock:    parseInt(bookForm.stock)   || 0,
        discount: parseInt(bookForm.discount)|| 0,
      };
      const url    = editBook ? `${API}/api/books/${editBook.id}` : `${API}/api/books`;
      const method = editBook ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      const saved = await res.json();

      if (editBook) {
        setBooks(prev => prev.map(b => b.id === saved.id ? saved : b));
        toast(`"${saved.title}" updated`, 'success');
      } else {
        setBooks(prev => [saved, ...prev]);
        toast(`"${saved.title}" added`, 'success');
      }
      closeForm();
    } catch (err) { toast(err.message || 'Failed to save book', 'error'); }
    finally { setFormLoading(false); }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/api/books/${id}`, { method:'DELETE' });
      if (!res.ok) throw new Error();
      setBooks(prev => prev.filter(b => b.id !== id));
      setDeleteId(null);
      toast('Book deleted', 'info');
    } catch { toast('Failed to delete book', 'error'); }
  }

  // Inventory search
  async function handleInvSearch(e) {
    e.preventDefault();
    if (!invSearch.trim()) { setInvResults(null); return; }
    try {
      const res  = await fetch(`${API}/api/books/search?q=${encodeURIComponent(invSearch)}&by=${invSearchBy}`);
      const data = await res.json();
      setInvResults(Array.isArray(data) ? data : []);
    } catch {
      setInvResults(books.filter(b =>
        b.title.toLowerCase().includes(invSearch.toLowerCase()) ||
        b.author.toLowerCase().includes(invSearch.toLowerCase()) ||
        b.id === invSearch
      ));
    }
  }

  // ════════════════════════════════════════════════════════════
  //  Logout
  // ════════════════════════════════════════════════════════════

  function handleLogout() {
    sessionStorage.removeItem('pt_user');
    toast('Logged out', 'info');
    navigate('/login', { replace: true });
  }

  // ════════════════════════════════════════════════════════════
  //  Sidebar nav
  // ════════════════════════════════════════════════════════════

  const navItems = [
    { id:'home',      icon:'🏠', label:'Dashboard' },
    { id:'inventory', icon:'📋', label:'Inventory' },
    { id:'orders',    icon:'📦', label:'All Orders', badge: allOrders.length },
    { id:'revenue',   icon:'💰', label:'Revenue' },
  ];

  // ════════════════════════════════════════════════════════════
  //  Panel: HOME (dashboard)
  // ════════════════════════════════════════════════════════════

  function DashboardPanel() {
    const totalBooks  = books.length;
    const totalOrders = allOrders.length;
    const rev         = revenue ?? '—';

    return (
      <div className="page-body">
        <h2 className="section-title">Admin <span>Dashboard</span></h2>

        {/* Stat cards */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-value">{totalBooks}</div>
            <div className="stat-label">Total Books</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{totalOrders}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-card gold">
            <div className="stat-icon">💰</div>
            <div className="stat-value">₹{typeof rev === 'number' ? rev.toFixed(0) : rev}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-value">
              {books.filter(b => b.rating >= 4).length}
            </div>
            <div className="stat-label">Top-Rated (4★+)</div>
          </div>
        </div>

        {/* Recent orders */}
        <h3 className="section-title" style={{ marginTop:32, fontSize:'1.1rem' }}>Recent Orders</h3>
        {ordersLoad ? <p style={{ color:'var(--text-muted)' }}>Loading…</p> : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th><th>User</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.slice(0,10).map(o => (
                  <tr key={o.id}>
                    <td style={{ fontFamily:'monospace', fontSize:'.75rem' }}>{o.id.slice(-8)}</td>
                    <td>{o.userEmail}</td>
                    <td>{(o.items||[]).length}</td>
                    <td style={{ color:'var(--gold)', fontWeight:700 }}>₹{Number(o.total).toFixed(0)}</td>
                    <td><span className={`status-badge ${(o.status||'').toLowerCase()}`}>{o.status}</span></td>
                    <td style={{ fontSize:'.78rem', color:'var(--text-muted)' }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
                {allOrders.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:24 }}>No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  Panel: INVENTORY
  // ════════════════════════════════════════════════════════════

  function InventoryPanel() {
    const displayBooks = invResults !== null ? invResults : books;

    return (
      <div className="page-body">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <h2 className="section-title" style={{ marginBottom:0 }}>Book <span>Inventory</span></h2>
          <button className="btn-primary" onClick={openAddForm}>+ Add Book</button>
        </div>

        {/* Search bar */}
        <form onSubmit={handleInvSearch} style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
          <input
            className="input-field"
            style={{ flex:1, minWidth:200 }}
            placeholder="Search books..."
            value={invSearch}
            onChange={e => setInvSearch(e.target.value)}
          />
          <select
            className="input-field"
            style={{ width:150 }}
            value={invSearchBy}
            onChange={e => setInvSearchBy(e.target.value)}
          >
            <option value="name">By Title</option>
            <option value="author">By Author</option>
            <option value="id">By ID</option>
            <option value="all">All Fields</option>
          </select>
          <button type="submit" className="btn-primary">Search</button>
          {invResults !== null && (
            <button type="button" className="btn-secondary" onClick={() => { setInvResults(null); setInvSearch(''); }}>
              Clear
            </button>
          )}
        </form>

        {/* Book table */}
        {booksErr && <p className="err-msg">{booksErr}</p>}
        {booksLoad ? <p style={{ color:'var(--text-muted)' }}>Loading books…</p> : (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cover</th><th>Title</th><th>Author</th><th>Category</th>
                  <th>Price (₹)</th><th>Stock</th><th>Rating</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayBooks.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
                    No books found.
                  </td></tr>
                )}
                {displayBooks.map(book => (
                  <tr key={book.id}>
                    <td>
                      <img
                        src={book.image || 'https://via.placeholder.com/40x54/1e2535/7b879f?text=B'}
                        alt={book.title}
                        style={{ width:40, height:54, objectFit:'cover', borderRadius:4, background:'var(--surface2)' }}
                      />
                    </td>
                    <td style={{ fontWeight:600, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {book.title}
                    </td>
                    <td style={{ color:'var(--text-muted)', fontSize:'.85rem' }}>{book.author}</td>
                    <td>
                      <span className="cat-tag">{book.category}</span>
                    </td>
                    <td style={{ fontWeight:700, color:'var(--gold)' }}>₹{Number(book.price).toFixed(0)}</td>
                    <td style={{ color: book.stock < 5 ? 'var(--danger)' : 'var(--text)' }}>
                      {book.stock ?? '—'}
                    </td>
                    <td>
                      <StarRating value={Math.round(book.rating || 0)} readonly size="sm" />
                      <span style={{ fontSize:'.72rem', color:'var(--text-muted)', marginLeft:4 }}>
                        {book.rating ? Number(book.rating).toFixed(1) : '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="icon-btn edit" onClick={() => openEditForm(book)} title="Edit">✏️</button>
                        <button className="icon-btn del"  onClick={() => setDeleteId(book.id)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add / Edit modal */}
        {showAddForm && (
          <div className="modal-backdrop" onClick={closeForm}>
            <div className="modal-box" style={{ maxWidth:600 }} onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={closeForm}>✕</button>
              <h3 style={{ fontFamily:'var(--font-display)', marginBottom:20 }}>
                {editBook ? 'Edit Book' : 'Add New Book'}
              </h3>
              <form onSubmit={handleFormSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-row-2">
                  <div className="form-field">
                    <label className="form-label">Title *</label>
                    <input className="input-field" name="title" required value={bookForm.title} onChange={handleFormChange} placeholder="Book title" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Author *</label>
                    <input className="input-field" name="author" required value={bookForm.author} onChange={handleFormChange} placeholder="Author name" />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-field">
                    <label className="form-label">Category *</label>
                    <input className="input-field" name="category" required value={bookForm.category} onChange={handleFormChange} placeholder="e.g. Fiction" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Price (₹) *</label>
                    <input className="input-field" name="price" type="number" min="0" step="0.01" required value={bookForm.price} onChange={handleFormChange} placeholder="299" />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-field">
                    <label className="form-label">Stock</label>
                    <input className="input-field" name="stock" type="number" min="0" value={bookForm.stock} onChange={handleFormChange} placeholder="0" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Discount %</label>
                    <input className="input-field" name="discount" type="number" min="0" max="100" value={bookForm.discount} onChange={handleFormChange} placeholder="0" />
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Description</label>
                  <textarea className="input-field" name="description" rows={3} value={bookForm.description} onChange={handleFormChange} placeholder="Short description…" style={{ resize:'vertical' }} />
                </div>
                <div className="form-field">
                  <label className="form-label">Cover Image URL</label>
                  <input className="input-field" name="image" type="url" value={bookForm.image} onChange={handleFormChange} placeholder="https://..." />
                </div>
                <div style={{ display:'flex', gap:20 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'.875rem' }}>
                    <input type="checkbox" name="isNew" checked={bookForm.isNew} onChange={handleFormChange} />
                    New Arrival
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'.875rem' }}>
                    <input type="checkbox" name="isBestseller" checked={bookForm.isBestseller} onChange={handleFormChange} />
                    Bestseller
                  </label>
                </div>
                <div style={{ display:'flex', gap:12, marginTop:4 }}>
                  <button type="button" className="btn-secondary" style={{ flex:1 }} onClick={closeForm}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ flex:2 }} disabled={formLoading}>
                    {formLoading ? 'Saving…' : (editBook ? 'Save Changes' : 'Add Book')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete confirm modal */}
        {deleteId && (
          <div className="modal-backdrop" onClick={() => setDeleteId(null)}>
            <div className="modal-box" style={{ maxWidth:380, textAlign:'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>⚠️</div>
              <h3 style={{ fontFamily:'var(--font-display)', marginBottom:8 }}>Delete this book?</h3>
              <p style={{ color:'var(--text-muted)', fontSize:'.875rem', marginBottom:20 }}>This action cannot be undone.</p>
              <div style={{ display:'flex', gap:12 }}>
                <button className="btn-secondary" style={{ flex:1 }} onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn-danger" style={{ flex:1 }} onClick={() => handleDelete(deleteId)}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  Panel: ORDERS
  // ════════════════════════════════════════════════════════════

  function OrdersPanel() {
    return (
      <div className="page-body">
        <h2 className="section-title">All <span>Orders</span></h2>
        {ordersLoad ? <p style={{ color:'var(--text-muted)' }}>Loading…</p> : (
          allOrders.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📦</div><p>No orders placed yet.</p></div>
          ) : (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th><th>Customer</th><th>Items</th><th>Subtotal</th><th>Total</th><th>Status</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontFamily:'monospace', fontSize:'.75rem' }}>{o.id.slice(-10)}</td>
                      <td style={{ fontSize:'.85rem' }}>{o.userEmail}</td>
                      <td style={{ fontSize:'.85rem' }}>{(o.items||[]).length} item{(o.items||[]).length !== 1 ? 's' : ''}</td>
                      <td>₹{Number(o.subtotal||0).toFixed(0)}</td>
                      <td style={{ fontWeight:700, color:'var(--gold)' }}>₹{Number(o.total).toFixed(0)}</td>
                      <td><span className={`status-badge ${(o.status||'').toLowerCase()}`}>{o.status}</span></td>
                      <td style={{ fontSize:'.78rem', color:'var(--text-muted)' }}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  Panel: REVENUE
  // ════════════════════════════════════════════════════════════

  function RevenuePanel() {
    const byBook = {};
    allOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (!byBook[item.title]) byBook[item.title] = { qty: 0, rev: 0 };
        byBook[item.title].qty += item.quantity || 1;
        byBook[item.title].rev += (item.price || 0) * (item.quantity || 1);
      });
    });
    const sorted = Object.entries(byBook).sort((a,b) => b[1].rev - a[1].rev);

    return (
      <div className="page-body">
        <h2 className="section-title">Revenue <span>Analytics</span></h2>

        <div className="stat-grid" style={{ marginBottom:32 }}>
          <div className="stat-card gold">
            <div className="stat-icon">💰</div>
            <div className="stat-value">₹{revenue != null ? Number(revenue).toFixed(0) : '—'}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🧾</div>
            <div className="stat-value">{allOrders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-value">
              ₹{allOrders.length ? (Number(revenue || 0) / allOrders.length).toFixed(0) : '—'}
            </div>
            <div className="stat-label">Avg Order Value</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-value">
              {allOrders.reduce((s,o) => s + (o.items||[]).reduce((ss,i) => ss + (i.quantity||1), 0), 0)}
            </div>
            <div className="stat-label">Books Sold</div>
          </div>
        </div>

        {sorted.length > 0 && (
          <>
            <h3 className="section-title" style={{ fontSize:'1.05rem', marginBottom:14 }}>Top Selling Books</h3>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="data-table">
                <thead><tr><th>Book</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {sorted.map(([title, data]) => (
                    <tr key={title}>
                      <td style={{ fontWeight:600 }}>{title}</td>
                      <td>{data.qty}</td>
                      <td style={{ color:'var(--gold)', fontWeight:700 }}>₹{data.rev.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  Render
  // ════════════════════════════════════════════════════════════

  const panelTitle = {
    home:      '🏠 Dashboard',
    inventory: '📋 Inventory',
    orders:    '📦 All Orders',
    revenue:   '💰 Revenue',
  };

  return (
    <div className="shell">
      <Sidebar
        items={navItems}
        active={panel}
        onSelect={setPanel}
        onLogout={handleLogout}
        user={user}
      />

      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{panelTitle[panel] || 'Admin'}</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ background:'rgba(201,168,76,.15)', border:'1px solid rgba(201,168,76,.3)', color:'var(--gold)', fontSize:'.72rem', fontWeight:700, padding:'3px 10px', borderRadius:99, letterSpacing:'.06em', textTransform:'uppercase' }}>
              Admin
            </span>
            <span style={{ fontSize:'.8rem', color:'var(--text-muted)' }}>{user.name}</span>
          </div>
        </header>

        {panel === 'home'      && <DashboardPanel />}
        {panel === 'inventory' && <InventoryPanel />}
        {panel === 'orders'    && <OrdersPanel />}
        {panel === 'revenue'   && <RevenuePanel />}
      </div>
    </div>
  );
}
