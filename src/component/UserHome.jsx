// ============================================================
//  UserHome.jsx  –  Main user dashboard
//  Sidebar: Home | Search | Cart | My Orders | Wishlist | Logout
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CheckoutModal from './CheckoutModal';
import Layout from '../components/layout/Layout';
import StarRating from './StarRating';
import { toast }  from './Toast';
import { clearSession, getSession, updateSession } from '../lib/session';
import { loadRazorpayCheckout } from '../lib/razorpay';
import './UserHome.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function HomeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M5 9.5V21h14V9.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M3 5h2l2.2 10.2A2 2 0 0 0 9.2 17H18a2 2 0 0 0 2-1.6L21 8H7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="10" cy="20" r="1.5" fill="currentColor" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M12 20s-7-4.6-9-8.8C1.5 8.1 3.4 4 7.6 4c2 0 3.4 1 4.4 2.3C13 5 14.4 4 16.4 4 20.6 4 22.5 8.1 21 11.2 19 15.4 12 20 12 20Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function getBookCategories(book) {
  if (Array.isArray(book?.categories) && book.categories.length) {
    return book.categories.filter(Boolean);
  }
  return book?.category ? [book.category] : [];
}
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || '';

export default function UserHome() {
  const navigate = useNavigate();
  const user = getSession() || {};

  // -- Active sidebar panel ----------------------------------
  const [panel, setPanel] = useState('home');

  // -- Books & categories ------------------------------------
  const [books,   setBooks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [selCat,  setSelCat]  = useState('All');

  // -- Cart (persisted in localStorage) ---------------------
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pt_cart') || '[]'); } catch { return []; }
  });

  // -- Wishlist (book id array) ------------------------------
  const [wishlist,    setWishlist]    = useState([]);

  // -- Orders ------------------------------------------------
  const [orders,      setOrders]      = useState([]);
  const [ordLoading,  setOrdLoading]  = useState(false);

  // -- Search state ------------------------------------------
  const [searchQuery,    setSearchQuery]    = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAuthor,   setFilterAuthor]   = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterMinRating,setFilterMinRating]= useState(0);
  const [searchResults,  setSearchResults]  = useState([]);
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [searchError,    setSearchError]    = useState('');

  // -- Quick-view modal --------------------------------------
  const [qv, setQv] = useState(null);

  // -- Checkout ----------------------------------------------
  const [showCheckout,  setShowCheckout]  = useState(false);
  const [placingOrder,  setPlacingOrder]  = useState(false);
  const [checkoutProfile, setCheckoutProfile] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    addressLine: user.addressLine || '',
    city: user.city || '',
    postalCode: user.postalCode || '',
    country: user.country || 'India',
  });

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  function friendlyErrorMessage(error, fallback) {
    const message = error?.message || fallback;
    if (/Failed to fetch/i.test(message)) {
      return 'Unable to reach the backend. Please check your connection and deployed API URL.';
    }
    return message || fallback;
  }

  // ------------------------------------------------------------
  //  Data loading
  // ------------------------------------------------------------

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

  useEffect(() => {
    if (!user.email) return;
    let alive = true;

    fetch(`${API}/api/profile?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(d => {
        if (!alive || !d) return;
        setCheckoutProfile(current => ({
          ...current,
          name: d.name || current.name || user.name || '',
          email: d.email || current.email || user.email || '',
          phone: d.phone || current.phone || '',
          addressLine: d.addressLine || current.addressLine || '',
          city: d.city || current.city || '',
          postalCode: d.postalCode || current.postalCode || '',
          country: d.country || current.country || 'India',
        }));
      })
      .catch(() => {});

    return () => { alive = false; };
  }, [user.email, user.name]);

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    let alive = true;

    if (!debouncedQuery) {
      setSearchResults([]);
      setSearchError('');
      setSearchLoading(false);
      return () => {
        alive = false;
      };
    }

    setSearchLoading(true);
    setSearchError('');

    fetch(`${API}/api/books?search=${encodeURIComponent(debouncedQuery)}`)
      .then(async response => {
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data.error || 'Search failed.');
        }
        return data;
      })
      .then(data => {
        if (!alive) return;
        setSearchResults(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error('Book search failed:', error);
        if (!alive) return;
        setSearchResults([]);
        setSearchError(friendlyErrorMessage(error, 'Search is unavailable right now.'));
      })
      .finally(() => {
        if (alive) {
          setSearchLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [debouncedQuery]);

  // ------------------------------------------------------------
  //  Derived data
  // ------------------------------------------------------------

  const categories  = ['All', ...Array.from(new Set(books.flatMap(book => getBookCategories(book))))];
  const cartCount   = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal   = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // ------------------------------------------------------------
  //  Cart helpers
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  //  Wishlist helpers
  // ------------------------------------------------------------

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
      toast(inList ? 'Removed from wishlist' : 'Saved to wishlist', inList ? '' : 'success');
    } catch { toast('Failed to update wishlist', 'error'); }
  }

  // ------------------------------------------------------------
  //  Rating
  // ------------------------------------------------------------

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
      toast(`Rated ${stars} ?`, 'success');
    } catch { toast('Failed to save rating', 'error'); }
  }

  // ------------------------------------------------------------
  //  Search
  // ------------------------------------------------------------

  function applyClientFilters(list) {
    return list.filter(b => {
      if (filterCategory !== 'All' && !getBookCategories(b).includes(filterCategory)) return false;
      if (filterAuthor && !b.author.toLowerCase().includes(filterAuthor.toLowerCase())) return false;
      if (filterMinPrice !== '' && b.price < parseFloat(filterMinPrice)) return false;
      if (filterMaxPrice !== '' && b.price > parseFloat(filterMaxPrice)) return false;
      if (filterMinRating > 0 && (b.rating || 0) < filterMinRating) return false;
      return true;
    });
  }

  const baseSearchResults = debouncedQuery ? searchResults : books;
  const filteredSearchResults = useMemo(
    () => applyClientFilters(baseSearchResults),
    [baseSearchResults, filterAuthor, filterCategory, filterMaxPrice, filterMinPrice, filterMinRating]
  );
  const homeResults = useMemo(
    () => {
      const source = debouncedQuery ? searchResults : books;
      return selCat === 'All' ? source : source.filter(book => getBookCategories(book).includes(selCat));
    },
    [books, debouncedQuery, searchResults, selCat]
  );

  function clearSearch() {
    setSearchQuery('');
    setFilterCategory('All');
    setFilterAuthor('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterMinRating(0);
    setSearchResults([]);
    setSearchError('');
  }

  // ------------------------------------------------------------
  //  Order placement
  // ------------------------------------------------------------

  async function placeOrderWithPayment(formValues) {
    if (!cart.length) return;
    if (!RAZORPAY_KEY) {
      toast('VITE_RAZORPAY_KEY is not configured.', 'error');
      return;
    }

    const items = cart.map(i => ({
      id: i.id,
      title: i.title,
      price: Number(i.price),
      quantity: i.qty,
      image: i.image,
    }));

    setPlacingOrder(true);
    try {
      await loadRazorpayCheckout();

      const paymentOrder = await requestJson(`${API}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          amount: cartTotal,
          user: {
            name: formValues.name,
            email: formValues.email,
            phone: formValues.phone,
            address: formValues.addressLine,
          },
          items,
        }),
      });

      const options = {
        key: RAZORPAY_KEY,
        amount: paymentOrder.amount,
        currency: 'INR',
        order_id: paymentOrder.id,
        name: 'Bookify',
        description: `${cart.length} item${cart.length > 1 ? 's' : ''} in checkout`,
        prefill: {
          name: formValues.name,
          email: formValues.email,
          contact: `+91${formValues.phone}`,
        },
        notes: {
          address: formValues.addressLine,
        },
        theme: {
          color: '#5b9bd6',
        },
        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
          },
        },
        handler: async response => {
          try {
            const result = await requestJson(`${API}/api/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type':'application/json' },
              body: JSON.stringify({
                ...response,
                email: formValues.email,
                name: formValues.name,
                phone: formValues.phone,
                address: formValues.addressLine,
                city: formValues.city,
                postalCode: formValues.postalCode,
                country: formValues.country,
                items,
                shipping: 0,
                amount: paymentOrder.amount / 100,
                currency: 'INR',
              }),
            });

            setCheckoutProfile(current => ({
              ...current,
              name: result.profile?.name || current.name,
              email: result.profile?.email || current.email,
              phone: result.profile?.phone || current.phone,
              addressLine: result.profile?.addressLine || current.addressLine,
              city: result.profile?.city || current.city,
              postalCode: result.profile?.postalCode || current.postalCode,
              country: result.profile?.country || current.country,
            }));

            if (result.profile) {
              updateSession(result.profile);
            }

            setOrders(prev => [result.order, ...prev]);
            setCart([]);
            setShowCheckout(false);
            setPanel('orders');
            toast('Payment successful! Order placed.', 'success');
          } catch (error) {
            toast(error.message || 'Payment verification failed.', 'error');
          } finally {
            setPlacingOrder(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', failure => {
        setPlacingOrder(false);
        toast(failure?.error?.description || 'Payment failed. Please try again.', 'error');
      });
      razorpay.open();
    } catch (error) {
      setPlacingOrder(false);
      toast(error.message || 'Failed to start Razorpay checkout.', 'error');
    }
  }

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
      toast('? Order placed successfully!', 'success');
    } catch { toast('Failed to place order. Try again.', 'error'); }
    finally { setPlacingOrder(false); }
  }

  // ------------------------------------------------------------
  //  Logout
  // ------------------------------------------------------------

  function handleLogout() {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;

    clearSession();
    localStorage.removeItem('pt_cart');
    toast('Logged out', 'info');
    navigate('/login', { replace: true });
  }

  // ------------------------------------------------------------
  //  Sidebar nav
  // ------------------------------------------------------------

  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Browse Books' },
    { id: 'search', icon: <SearchIcon />, label: 'Search' },
    { id: 'cart', icon: <CartIcon />, label: 'Cart', badge: cartCount },
    { id: 'orders', icon: <BoxIcon />, label: 'My Orders' },
    { id: 'wishlist', icon: <HeartIcon />, label: 'Wishlist', badge: wishlist.length },
  ];

  const panelTitle = {
    home: 'Browse Books',
    search: 'Search and Filter',
    cart: 'My Cart',
    orders: 'My Orders',
    wishlist: 'My Wishlist',
  };

  // ------------------------------------------------------------
  //  Book Card sub-component
  // ------------------------------------------------------------

  function handleTopbarSearchChange(event) {
    const nextValue = event.target.value;
    setSearchQuery(nextValue);
    if (nextValue.trim() && panel !== 'search') {
      setPanel('search');
    }
  }

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
          type="button"
        >
          <HeartIcon />
        </button>

        {/* Cover */}
        <div className="book-cover" onClick={() => setQv(book)}>
          <img
            src={book.image || 'https://via.placeholder.com/160x220/1e2535/7b879f?text=No+Cover'}
            alt={book.title || book.name}
            loading="lazy"
          />
          <div className="cover-overlay">
            <span>Quick View</span>
          </div>
        </div>

        {/* Info */}
        <div className="book-info">
          <p className="book-cat">{getBookCategories(book).join(' • ')}</p>
          <h3 className="book-title" title={book.title || book.name}>{book.title || book.name}</h3>
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
            <span className="book-price">Rs. {Number(book.price).toFixed(0)}</span>
            <button className="add-cart-btn" onClick={() => addToCart(book)}>+ Cart</button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  //  Panel renderers
  // ------------------------------------------------------------

  // -- HOME panel --------------------------------------------
  function HomePanel() {
    return (
      <div className="page-body">
        <h2 className="section-title">Browse <span>Books</span></h2>

        {debouncedQuery && (
          <div className="card" style={{ marginBottom:24 }}>
            <p style={{ color:'var(--text-muted)', fontSize:'.82rem', marginBottom:6 }}>
              Live results for <strong style={{ color:'var(--cream)' }}>&quot;{debouncedQuery}&quot;</strong>
            </p>
            <p style={{ color:'var(--text-muted)', fontSize:'.8rem' }}>
              Use the sticky search bar above to keep filtering without leaving the page.
            </p>
          </div>
        )}

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
        {searchError && debouncedQuery && <p className="err-msg">{searchError}</p>}
        {loading ? (
          <div className="loading-grid">
            {[...Array(8)].map((_, i) => <div key={i} className="book-card-skeleton" />)}
          </div>
        ) : searchLoading ? (
          <div className="empty-state">
            <div className="spinner" style={{ margin:'0 auto 14px' }} />
            <p>Searching books...</p>
          </div>
        ) : homeResults.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">BK</div>
            <p>{debouncedQuery ? `No books found for "${debouncedQuery}".` : 'No books in this category yet.'}</p>
          </div>
        ) : (
          <div className="books-grid">
            {homeResults.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </div>
    );
  }

  // -- SEARCH panel -----------------------------------------
  function SearchPanel() {
    return (
      <div className="page-body">
        <h2 className="section-title">Search <span>&amp; Filter</span></h2>

        {/* Search form */}
        <div className="card" style={{ marginBottom:24 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <input
                className="input-field"
                style={{ flex:1 }}
                placeholder="Search by title or author"
                value={searchQuery}
                onChange={handleTopbarSearchChange}
              />
              <button type="button" className="btn-secondary" onClick={clearSearch}>Clear</button>
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
                <label className="form-label">Min Price (?)</label>
                <input
                  className="input-field"
                  type="number" min="0"
                  placeholder="0"
                  value={filterMinPrice}
                  onChange={e => setFilterMinPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Max Price (?)</label>
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

          </div>
        </div>

        {/* Results */}
        <p style={{ marginBottom:16, fontSize:'.85rem', color:'var(--text-muted)' }}>
          {debouncedQuery
            ? `Searching for "${debouncedQuery}" • ${filteredSearchResults.length} result${filteredSearchResults.length !== 1 ? 's' : ''}`
            : `${filteredSearchResults.length} books ready to browse`}
        </p>
        {searchError && debouncedQuery && <p className="err-msg">{searchError}</p>}
        {searchLoading ? (
          <div className="empty-state">
            <div className="spinner" style={{ margin:'0 auto 14px' }} />
            <p>Searching books...</p>
          </div>
        ) : filteredSearchResults.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">SR</div><p>No books match your filters.</p></div>
        ) : (
          <motion.div
            key={`${debouncedQuery || 'all'}-${filterCategory}-${filterAuthor}-${filterMinPrice}-${filterMaxPrice}-${filterMinRating}`}
            animate={{ opacity: 1, y: 0 }}
            className="books-grid"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
          >
            {filteredSearchResults.map(book => <BookCard key={book.id} book={book} />)}
          </motion.div>
        )}
      </div>
    );
  }

  // -- CART panel --------------------------------------------
  function CartPanel() {
    return (
      <div className="page-body">
        <h2 className="section-title">Shopping <span>Cart</span></h2>
        {cart.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">CT</div>
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
                    <p className="cart-price">Rs. {Number(item.price).toFixed(0)} each</p>
                  </div>
                  <div className="cart-qty-wrap">
                    <button className="qty-btn" onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
                    <span className="qty-val">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <div className="cart-line-total">Rs. {(item.price * item.qty).toFixed(0)}</div>
                  <button className="cart-remove" onClick={() => removeFromCart(item.id)} title="Remove">?</button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="cart-summary card">
              <div className="summary-row"><span>Subtotal</span><span>Rs. {cartTotal.toFixed(0)}</span></div>
              <div className="summary-row"><span>Shipping</span><span style={{ color:'var(--success)' }}>Free</span></div>
              <div className="summary-row total"><span>Total</span><span>Rs. {cartTotal.toFixed(0)}</span></div>
              <button className="btn-primary" style={{ width:'100%', marginTop:16, padding:'13px' }}
                onClick={() => setShowCheckout(true)}>
                Proceed to Checkout
              </button>
            </div>
          </>
        )}

        {/* Checkout modal */}
        {false && showCheckout && (
          <div className="modal-backdrop" onClick={() => setShowCheckout(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 style={{ fontFamily:'var(--font-display)', marginBottom:16 }}>Confirm Order</h3>
              <p style={{ color:'var(--text-muted)', marginBottom:8, fontSize:'.875rem' }}>
                {cart.length} item{cart.length > 1 ? 's' : ''} · Total Rs. {cartTotal.toFixed(0)}
              </p>
              {cart.map(i => (
                <div key={i.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'.85rem', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                  <span>{i.title} × {i.qty}</span>
                  <span style={{ color:'var(--gold)' }}>Rs. {(i.price * i.qty).toFixed(0)}</span>
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

  // -- ORDERS panel -----------------------------------------
  function OrdersPanel() {
    return (
      <div className="page-body">
        <h2 className="section-title">My <span>Orders</span></h2>
        {ordLoading ? (
          <p style={{ color:'var(--text-muted)' }}>Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">OD</div>
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
                      <span style={{ color:'var(--gold)' }}>Rs. {(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:8, display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'.85rem', color:'var(--text-muted)' }}>Total</span>
                  <strong style={{ color:'var(--gold)' }}>Rs. {Number(order.total).toFixed(0)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -- WISHLIST panel ----------------------------------------
  function WishlistPanel() {
    const wishBooks = books.filter(b => wishlist.includes(b.id));
    return (
      <div className="page-body">
        <h2 className="section-title">My <span>Wishlist</span></h2>
        {wishBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">WL</div>
            <p>Your wishlist is empty. Browse books and tap ? to save.</p>
          </div>
        ) : (
          <div className="books-grid">
            {wishBooks.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------
  return (
    <Layout
      activeItem={panel}
      items={navItems}
      onLogout={handleLogout}
      onSearchChange={handleTopbarSearchChange}
      onSelectItem={setPanel}
      searchLoading={searchLoading}
      searchPlaceholder="Search books or authors"
      searchValue={searchQuery}
      showSidebarIcons
      title={panelTitle[panel] || 'Browse Books'}
      user={user}
    >
      {panel === 'home' && HomePanel()}
      {panel === 'search' && SearchPanel()}
      {panel === 'cart' && CartPanel()}
      {panel === 'orders' && OrdersPanel()}
      {panel === 'wishlist' && WishlistPanel()}

      <CheckoutModal
        cartCount={cartCount}
        initialValues={checkoutProfile}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSubmit={placeOrderWithPayment}
        submitting={placingOrder}
        total={cartTotal}
      />

      {/* Quick-view modal */}
      {qv && (
        <div className="modal-backdrop" onClick={() => setQv(null)}>
          <div className="modal-box qv-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setQv(null)}>x</button>
            <div className="qv-inner">
              <img
                src={qv.image || 'https://via.placeholder.com/180x250/1e2535/7b879f?text=Book'}
                alt={qv.title}
                className="qv-img"
              />
              <div className="qv-details">
                <p className="book-cat">{getBookCategories(qv).join(' • ')}</p>
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
                  Rs. {Number(qv.price).toFixed(0)}
                </p>

                <div style={{ display:'flex', gap:12 }}>
                  <button className="btn-primary" style={{ flex:1 }} onClick={() => { addToCart(qv); setQv(null); }}>
                    Add to Cart
                  </button>
                  <button
                    className={`btn-secondary ${wishlist.includes(qv.id) ? 'wish-active' : ''}`}
                    onClick={() => toggleWishlist(qv)}
                  >
                    {wishlist.includes(qv.id) ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
