// ============================================================
//  UserHome.jsx  –  Main user dashboard
//  Sidebar: Home | Search | Cart | My Orders | Wishlist | Logout
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar    from './Sidebar';
import StarRating from './StarRating';
import { toast }  from './Toast';
import './UserHome.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function UserHome() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('pt_user') || '{}');

  // ── Active sidebar panel ──────────────────────────────────
  const [panel, setPanel] = useState('home');

  // ── Books & categories ────────────────────────────────────
  const [books,   setBooks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [selCat,  setSelCat]  = useState('All');

  // ── Cart (persisted in localStorage) ─────────────────────
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pt_cart') || '[]'); } catch { return []; }
  });

  // ── Wishlist (book id array) ──────────────────────────────
  const [wishlist,    setWishlist]    = useState([]);

  // ── Orders ────────────────────────────────────────────────
  const [orders,      setOrders]      = useState([]);
  const [ordLoading,  setOrdLoading]  = useState(false);

  // ── Search state ──────────────────────────────────────────
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchBy,       setSearchBy]       = useState('all');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAuthor,   setFilterAuthor]   = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterMinRating,setFilterMinRating]= useState(0);
  const [searchResults,  setSearchResults]  = useState(null);

  // ── Quick-view modal ──────────────────────────────────────
  const [qv, setQv] = useState(null);

  // ── Checkout ──────────────────────────────────────────────
  const [showCheckout,  setShowCheckout]  = useState(false);
  const [placingOrder,  setPlacingOrder]  = useState(false);

  // ════════════════════════════════════════════════════════════
  //  Data loading
  // ════════════════════════════════════════════════════════════

  // Load books on mount
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API}/api/books`)
      .then(r => r.json())
      .then(d => { if (alive) { setBooks(Array.isArray(d) ? d : []); setLoadErr(''); } })
      .catch(() => { if (alive) setLoadErr('Could not load books. Check backend.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Load wishlist on mount
  useEffect(() => {
    if (!user.email) return;
    fetch(`${API}/api/wishlist?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(d => setWishlist(Array.isArray(d.ids) ? d.ids : []))
      .catch(() => {});
  }, [user.email]);

  // Load orders when panel switches to "orders"
  useEffect(() => {
    if (panel !== 'orders' || !user.email) return;
    setOrdLoading(true);
    fetch(`${API}/api/orders?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setOrdLoading(false));
  }, [panel, user.email]);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('pt_cart', JSON.stringify(cart));
  }, [cart]);

  // ════════════════════════════════════════════════════════════
  //  Derived data
  // ════════════════════════════════════════════════════════════

  const categories  = ['All', ...Array.from(new Set(books.map(b => b.category).filter(Boolean)))];
  const displayBooks = selCat === 'All' ? books : books.filter(b => b.category === selCat);
  const cartCount   = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal   = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // ════════════════════════════════════════════════════════════
  //  Cart helpers
  // ════════════════════════════════════════════════════════════

  function addToCart(book) {
    setCart(prev => {
      const ex = prev.find(i => i.id === book.id);
      if (ex) return prev.map(i => i.id === book.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: book.id, title: book.title, author: book.author, price: book.price, image: book.image, qty: 1 }];
    });
    toast(`"${book.title}" added to cart`, 'success');
  }

  function removeFromCart(id)      { setCart(p => p.filter(i => i.id !== id)); }
  function updateQty(id, qty)      { if (qty < 1) { removeFromCart(id); return; } setCart(p => p.map(i => i.id === id ? { ...i, qty } : i)); }

  // ════════════════════════════════════════════════════════════
  //  Wishlist helpers
  // ════════════════════════════════════════════════════════════

  async function toggleWishlist(book) {
    const inList = wishlist.includes(book.id);
    const url    = inList
      ? `${API}/api/wishlist/${book.id}?email=${encodeURIComponent(user.email)}`
      : `${API}/api/wishlist`;
    const opts   = inList
      ? { method: 'DELETE' }
      : { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email: user.email, bookId: book.id }) };
    try {
      const res  = await fetch(url, opts);
      const data = await res.json();
      setWishlist(Array.isArray(data.ids) ? data.ids : []);
      toast(inList ? 'Removed from wishlist' : '❤️ Saved to wishlist', inList ? '' : 'success');
    } catch { toast('Failed to update wishlist', 'error'); }
  }

  // ════════════════════════════════════════════════════════════
  //  Rating
  // ════════════════════════════════════════════════════════════

  async function rateBook(bookId, stars) {
    try {
      const res     = await fetch(`${API}/api/books/${bookId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email: user.email, stars }),
      });
      const updated = await res.json();
      setBooks(prev => prev.map(b => b.id === bookId ? updated : b));
      if (qv?.id === bookId) setQv(updated);
      toast(`Rated ${stars} ★`, 'success');
    } catch { toast('Failed to save rating', 'error'); }
  }

  // ════════════════════════════════════════════════════════════
  //  Search
  // ════════════════════════════════════════════════════════════

  function applyClientFilters(list) {
    return list.filter(b => {
      if (filterCategory !== 'All' && b.category !== filterCategory) return false;
      if (filterAuthor && !b.author.toLowerCase().includes(filterAuthor.toLowerCase())) return false;
      if (filterMinPrice !== '' && b.price < parseFloat(filterMinPrice)) return false;
      if (filterMaxPrice !== '' && b.price > parseFloat(filterMaxPrice)) return false;
      if (filterMinRating > 0 && (b.rating || 0) < filterMinRating) return false;
      return true;
    });
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(applyClientFilters(books));
      return;
    }
    try {
      const res  = await fetch(`${API}/api/books/search?q=${encodeURIComponent(searchQuery)}&by=${searchBy}`);
      const data = await res.json();
      setSearchResults(applyClientFilters(Array.isArray(data) ? data : []));
    } catch {
      setSearchResults(applyClientFilters(books.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase())
      )));
    }
  }

  function clearSearch() {
    setSearchQuery('');
    setFilterCategory('All');
    setFilterAuthor('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterMinRating(0);
    setSearchResults(null);
  }

  // ════════════════════════════════════════════════════════════
  //  Order placement
  // ════════════════════════════════════════════════════════════

  async function placeOrder() {
    if (!cart.length) return;
    setPlacingOrder(true);
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          email: user.email,
          items: cart.map(i => ({ id: i.id, title: i.title, price: i.price, quantity: i.qty, image: i.image })),
          shipping: 0,
        }),
      });
      if (!res.ok) throw new Error();
      setCart([]);
      setShowCheckout(false);
      setPanel('orders');
      toast('✅ Order placed successfully!', 'success');
    } catch { toast('Failed to place order. Try again.', 'error'); }
    finally { setPlacingOrder(false); }
  }

  // ════════════════════════════════════════════════════════════
  //  Logout
  // ════════════════════════════════════════════════════════════

  function handleLogout() {
    sessionStorage.removeItem('pt_user');
    localStorage.removeItem('pt_cart');
    toast('Logged out', 'info');
    navigate('/login', { replace: true });
  }

  // ════════════════════════════════════════════════════════════
  //  Sidebar nav
  // ════════════════════════════════════════════════════════════

  const navItems = [
    { id:'home',     icon:'🏠', label:'Home' },
    { id:'search',   icon:'🔍', label:'Search & Filter' },
    { id:'cart',     icon:'🛒', label:'Cart',      badge: cartCount },
    { id:'orders',   icon:'📦', label:'My Orders' },
    { id:'wishlist', icon:'❤️', label:'Wishlist',  badge: wishlist.length },
  ];

  // ════════════════════════════════════════════════════════════
  //  Book Card sub-component
  // ════════════════════════════════════════════════════════════

  function BookCard({ book }) {
    const userRating = book.ratings?.[user.email] || 0;
    const inWish     = wishlist.includes(book.id);

    return (
      <div className="book-card" key={book.id}>
        {/* Wishlist toggle */}
        <button
          className={`wish-btn ${inWish ? 'active' : ''}`}
          onClick={() => toggleWishlist(book)}
          title={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
        >♥</button>

        {/* Cover */}
        <div className="book-cover" onClick={() => setQv(book)}>
          <img
            src={book.image || 'https://via.placeholder.com/160x220/1e2535/7b879f?text=No+Cover'}
            alt={book.title}
            loading="lazy"
          />
          <div className="cover-overlay">
            <span>Quick View</span>
          </div>
        </div>

        {/* Info */}
        <div className="book-info">
          <p className="book-cat">{book.category}</p>
          <h3 className="book-title" title={book.title}>{book.title}</h3>
          <p className="book-author">by {book.author}</p>

          {/* Average rating (auto-calculated on backend) */}
          <div className="book-rating-row">
            <StarRating value={Math.round(book.rating || 0)} readonly size="sm" />
            <span style={{ fontSize:'.75rem', color:'var(--text-muted)', marginLeft:4 }}>
              {book.rating ? Number(book.rating).toFixed(1) : '—'}
            </span>
          </div>

          {/* User's own rating */}
          <div className="user-rating-row">
            <span style={{ fontSize:'.72rem', color:'var(--text-muted)' }}>Your rating:</span>
            <StarRating
              value={userRating}
              onChange={stars => rateBook(book.id, stars)}
              size="sm"
            />
          </div>

          <div className="book-footer">
            <span className="book-price">₹{Number(book.price).toFixed(0)}</span>
            <button className="add-cart-btn" onClick={() => addToCart(book)}>+ Cart</button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  Panel renderers
  // ════════════════════════════════════════════════════════════

  // ── HOME panel ────────────────────────────────────────────
  function HomePanel() {
    return (
      <div className="page-body">
        <h2 className="section-title">Browse <span>Books</span></h2>

        {/* Category bar */}
        <div className="cat-bar">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-pill ${selCat === cat ? 'active' : ''}`}
              onClick={() => setSelCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Book grid */}
        {loadErr && <p className="err-msg">{loadErr}</p>}
        {loading ? (
          <div className="loading-grid">
            {[...Array(8)].map((_, i) => <div key={i} className="book-card-skeleton" />)}
          </div>
        ) : displayBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>No books in this category yet.</p>
          </div>
        ) : (
          <div className="books-grid">
            {displayBooks.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </div>
    );
  }

  // ── SEARCH panel ─────────────────────────────────────────
  function SearchPanel() {
    const results = searchResults !== null ? searchResults : books;
    return (
      <div className="page-body">
        <h2 className="section-title">Search <span>&amp; Filter</span></h2>

        {/* Search form */}
        <div className="card" style={{ marginBottom:24 }}>
          <form onSubmit={handleSearch} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Query + search by */}
            <div style={{ display:'flex', gap:12 }}>
              <input
                className="input-field"
                style={{ flex:1 }}
                placeholder="Search books..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select
                className="input-field"
                style={{ width:140 }}
                value={searchBy}
                onChange={e => setSearchBy(e.target.value)}
              >
                <option value="all">All fields</option>
                <option value="name">Title</option>
                <option value="author">Author</option>
                <option value="id">Book ID</option>
              </select>
            </div>

            {/* Filters row */}
            <div className="filter-grid">
              {/* Category */}
              <div>
                <label className="form-label">Category</label>
                <select
                  className="input-field"
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                >
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Author */}
              <div>
                <label className="form-label">Author</label>
                <input
                  className="input-field"
                  placeholder="Filter by author"
                  value={filterAuthor}
                  onChange={e => setFilterAuthor(e.target.value)}
                />
              </div>

              {/* Price range */}
              <div>
                <label className="form-label">Min Price (₹)</label>
                <input
                  className="input-field"
                  type="number" min="0"
                  placeholder="0"
                  value={filterMinPrice}
                  onChange={e => setFilterMinPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Max Price (₹)</label>
                <input
                  className="input-field"
                  type="number" min="0"
                  placeholder="Any"
                  value={filterMaxPrice}
                  onChange={e => setFilterMaxPrice(e.target.value)}
                />
              </div>

              {/* Min rating */}
              <div>
                <label className="form-label">Min Rating</label>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                  <StarRating
                    value={filterMinRating}
                    onChange={v => setFilterMinRating(v)}
                    size="md"
                  />
                  {filterMinRating > 0 && (
                    <button type="button" onClick={() => setFilterMinRating(0)}
                      style={{ fontSize:'.75rem', color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>
                      clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:12 }}>
              <button type="submit" className="btn-primary" style={{ flex:1 }}>Search</button>
              <button type="button" className="btn-secondary" onClick={clearSearch}>Clear</button>
            </div>
          </form>
        </div>

        {/* Results */}
        <p style={{ marginBottom:16, fontSize:'.85rem', color:'var(--text-muted)' }}>
          {searchResults !== null ? `${results.length} result${results.length !== 1 ? 's' : ''} found` : `${books.length} books total`}
        </p>
        {results.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔍</div><p>No books match your filters.</p></div>
        ) : (
          <div className="books-grid">
            {results.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </div>
    );
  }

  // ── CART panel ────────────────────────────────────────────
  function CartPanel() {
    return (
      <div className="page-body">
        <h2 className="section-title">Shopping <span>Cart</span></h2>
        {cart.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <p>Your cart is empty.</p>
            <button className="btn-primary" style={{ marginTop:16 }} onClick={() => setPanel('home')}>
              Browse Books
            </button>
          </div>
        ) : (
          <>
            <div className="cart-list">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <img
                    src={item.image || 'https://via.placeholder.com/60x80/1e2535/7b879f?text=Book'}
                    alt={item.title}
                    className="cart-img"
                  />
                  <div className="cart-meta">
                    <p className="cart-title">{item.title}</p>
                    <p className="cart-author">{item.author}</p>
                    <p className="cart-price">₹{Number(item.price).toFixed(0)} each</p>
                  </div>
                  <div className="cart-qty-wrap">
                    <button className="qty-btn" onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                    <span className="qty-val">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <div className="cart-line-total">₹{(item.price * item.qty).toFixed(0)}</div>
                  <button className="cart-remove" onClick={() => removeFromCart(item.id)} title="Remove">✕</button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="cart-summary card">
              <div className="summary-row"><span>Subtotal</span><span>₹{cartTotal.toFixed(0)}</span></div>
              <div className="summary-row"><span>Shipping</span><span style={{ color:'var(--success)' }}>Free</span></div>
              <div className="summary-row total"><span>Total</span><span>₹{cartTotal.toFixed(0)}</span></div>
              <button className="btn-primary" style={{ width:'100%', marginTop:16, padding:'13px' }}
                onClick={() => setShowCheckout(true)}>
                Proceed to Checkout
              </button>
            </div>
          </>
        )}

        {/* Checkout modal */}
        {showCheckout && (
          <div className="modal-backdrop" onClick={() => setShowCheckout(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 style={{ fontFamily:'var(--font-display)', marginBottom:16 }}>Confirm Order</h3>
              <p style={{ color:'var(--text-muted)', marginBottom:8, fontSize:'.875rem' }}>
                {cart.length} item{cart.length > 1 ? 's' : ''} · Total ₹{cartTotal.toFixed(0)}
              </p>
              {cart.map(i => (
                <div key={i.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'.85rem', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                  <span>{i.title} × {i.qty}</span>
                  <span style={{ color:'var(--gold)' }}>₹{(i.price * i.qty).toFixed(0)}</span>
                </div>
              ))}
              <div style={{ display:'flex', gap:12, marginTop:20 }}>
                <button className="btn-secondary" style={{ flex:1 }} onClick={() => setShowCheckout(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex:2 }} onClick={placeOrder} disabled={placingOrder}>
                  {placingOrder ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ORDERS panel ─────────────────────────────────────────
  function OrdersPanel() {
    return (
      <div className="page-body">
        <h2 className="section-title">My <span>Orders</span></h2>
        {ordLoading ? (
          <p style={{ color:'var(--text-muted)' }}>Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {orders.map(order => (
              <div key={order.id} className="card order-card">
                <div className="order-header">
                  <div>
                    <p style={{ fontSize:'.75rem', color:'var(--text-muted)' }}>Order ID</p>
                    <p style={{ fontWeight:600, fontSize:'.85rem', wordBreak:'break-all' }}>{order.id}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span className={`status-badge ${order.status.toLowerCase()}`}>{order.status}</span>
                    <p style={{ fontSize:'.75rem', color:'var(--text-muted)', marginTop:4 }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : ''}
                    </p>
                  </div>
                </div>
                <div className="order-items">
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="order-item-row">
                      <span>{item.title}</span>
                      <span style={{ color:'var(--text-muted)' }}>× {item.quantity}</span>
                      <span style={{ color:'var(--gold)' }}>₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:8, display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'.85rem', color:'var(--text-muted)' }}>Total</span>
                  <strong style={{ color:'var(--gold)' }}>₹{Number(order.total).toFixed(0)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── WISHLIST panel ────────────────────────────────────────
  function WishlistPanel() {
    const wishBooks = books.filter(b => wishlist.includes(b.id));
    return (
      <div className="page-body">
        <h2 className="section-title">My <span>Wishlist</span></h2>
        {wishBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❤️</div>
            <p>Your wishlist is empty. Browse books and tap ♥ to save.</p>
          </div>
        ) : (
          <div className="books-grid">
            {wishBooks.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  Render
  // ════════════════════════════════════════════════════════════
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
        {/* Topbar */}
        <header className="topbar">
          <span className="topbar-title">
            {panel === 'home'     && '📚 Browse Books'}
            {panel === 'search'   && '🔍 Search & Filter'}
            {panel === 'cart'     && '🛒 My Cart'}
            {panel === 'orders'   && '📦 My Orders'}
            {panel === 'wishlist' && '❤️ My Wishlist'}
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:'.8rem', color:'var(--text-muted)' }}>
              Hi, {user.name || 'Reader'}
            </span>
          </div>
        </header>

        {/* Panels */}
        {panel === 'home'     && <HomePanel />}
        {panel === 'search'   && <SearchPanel />}
        {panel === 'cart'     && <CartPanel />}
        {panel === 'orders'   && <OrdersPanel />}
        {panel === 'wishlist' && <WishlistPanel />}
      </div>

      {/* Quick-view modal */}
      {qv && (
        <div className="modal-backdrop" onClick={() => setQv(null)}>
          <div className="modal-box qv-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setQv(null)}>✕</button>
            <div className="qv-inner">
              <img
                src={qv.image || 'https://via.placeholder.com/180x250/1e2535/7b879f?text=Book'}
                alt={qv.title}
                className="qv-img"
              />
              <div className="qv-details">
                <p className="book-cat">{qv.category}</p>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.35rem', marginBottom:6 }}>{qv.title}</h2>
                <p style={{ color:'var(--text-muted)', marginBottom:12 }}>by {qv.author}</p>
                {qv.description && <p style={{ fontSize:'.875rem', marginBottom:14, lineHeight:1.7 }}>{qv.description}</p>}

                <div style={{ marginBottom:14 }}>
                  <p style={{ fontSize:'.8rem', color:'var(--text-muted)', marginBottom:4 }}>Average rating</p>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <StarRating value={Math.round(qv.rating || 0)} readonly />
                    <span style={{ color:'var(--gold)', fontWeight:600 }}>
                      {qv.rating ? Number(qv.rating).toFixed(1) : '—'} / 5
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom:20 }}>
                  <p style={{ fontSize:'.8rem', color:'var(--text-muted)', marginBottom:4 }}>Your rating</p>
                  <StarRating
                    value={qv.ratings?.[user.email] || 0}
                    onChange={stars => rateBook(qv.id, stars)}
                    size="lg"
                  />
                  <p style={{ fontSize:'.72rem', color:'var(--text-muted)', marginTop:4 }}>
                    {qv.ratings?.[user.email] ? 'Click to update your rating' : 'Click to rate this book'}
                  </p>
                </div>

                <p style={{ fontSize:'1.4rem', fontWeight:700, color:'var(--gold)', marginBottom:16 }}>
                  ₹{Number(qv.price).toFixed(0)}
                </p>

                <div style={{ display:'flex', gap:12 }}>
                  <button className="btn-primary" style={{ flex:1 }} onClick={() => { addToCart(qv); setQv(null); }}>
                    🛒 Add to Cart
                  </button>
                  <button
                    className={`btn-secondary ${wishlist.includes(qv.id) ? 'wish-active' : ''}`}
                    onClick={() => toggleWishlist(qv)}
                  >
                    {wishlist.includes(qv.id) ? '❤️ Saved' : '🤍 Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
