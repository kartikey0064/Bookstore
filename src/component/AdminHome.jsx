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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddBookModal from '../components/AddBookModal';
import AdminForm from '../components/AdminForm';
import ChartCard from '../components/admin/ChartCard';
import DashboardFilter from '../components/admin/DashboardFilter';
import { BooksIcon, RatingIcon, RevenueIcon, UsersIcon } from '../components/admin/DashboardIcons';
import OrdersTable from '../components/admin/OrdersTable';
import { BarTrendChart, LineTrendChart } from '../components/admin/SimpleCharts';
import StatCard from '../components/admin/StatCard';
import Sidebar    from './Sidebar';
import StarRating from './StarRating';
import { toast }  from './Toast';
import { clearSession, getSession } from '../lib/session';
import './AdminHome.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Blank form for add/edit book
const EMPTY_ADMIN_FORM = { name:'', dob:'', email:'', password:'', confirmPassword:'' };

const panelMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const ADMIN_STEPS = [
  { label: 'About Admin', fields: ['name', 'dob'] },
  { label: 'Contact', fields: ['email'] },
  { label: 'Security', fields: ['password', 'confirmPassword'] },
];

const ORDER_STATUS_OPTIONS = ['Processing', 'Processed'];
const ORDER_STATUS_STORAGE_KEY = 'bookify_admin_order_statuses';
const DASHBOARD_FILTER_PRESETS = {
  '7d': 7,
  '30d': 30,
};

const adminValidators = {
  name: value =>
    !value.trim()
      ? 'Full name is required'
      : value.trim().length < 2
        ? 'Name must be at least 2 characters'
        : '',
  dob: value => {
    if (!value) return 'Date of birth is required';
    const age = (Date.now() - new Date(value)) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 18) return 'Admin must be at least 18 years old';
    if (age > 120) return 'Enter a valid date of birth';
    return '';
  },
  email: value =>
    !value
      ? 'Email is required'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? 'Enter a valid email address'
        : '',
  password: value => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'At least 8 characters required';
    if (!/[A-Z]/.test(value)) return 'Add at least one uppercase letter';
    if (!/[0-9]/.test(value)) return 'Add at least one number';
    return '';
  },
  confirmPassword: (value, password) =>
    !value ? 'Please confirm the password' : value !== password ? 'Passwords do not match' : '',
};

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', '#e05757', '#e0a050', '#5b9bd6', '#4caf8a'];

function strengthScore(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function getFriendlyErrorMessage(error, fallback) {
  const message = error?.message || fallback;
  if (/Failed to fetch/i.test(message)) {
    return 'Unable to reach the server. Please check your internet or backend URL.';
  }
  return message;
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(0)}`;
}

function formatShortDate(value) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getBookCategories(book) {
  if (Array.isArray(book?.categories) && book.categories.length) {
    return book.categories.filter(Boolean);
  }
  return book?.category ? [book.category] : [];
}

function calculateTrendPercent(currentTotal, previousTotal) {
  if (!previousTotal) {
    return currentTotal ? 100 : 0;
  }
  return Number((((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1));
}

function toDateInputValue(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value || Date.now());
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function getRelativeDateInput(daysBack) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysBack);
  return toDateInputValue(date);
}

function getPresetDashboardRange(filterType) {
  const days = DASHBOARD_FILTER_PRESETS[filterType] || DASHBOARD_FILTER_PRESETS['7d'];
  return {
    startDate: getRelativeDateInput(days - 1),
    endDate: getRelativeDateInput(0),
  };
}

function getDashboardRangeMeta(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const rangeDays = Math.max(Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1, 1);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - rangeDays + 1);

  return {
    rangeDays,
    previousStartDate: toDateInputValue(previousStart),
    previousEndDate: toDateInputValue(previousEnd),
  };
}

function getDateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function buildDateSeries(startDate, endDate) {
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const limit = new Date(`${endDate}T00:00:00`);

  while (cursor <= limit) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function getMonthStart(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getMonthKey(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function getMonthLabel(value) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function buildMonthSeries(startDate, endDate) {
  const months = [];
  const cursor = getMonthStart(startDate);
  const limit = getMonthStart(endDate);
  while (cursor <= limit) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function buildDashboardFallbackData({ books, orders, startDate, endDate }) {
  const currentDays = buildDateSeries(startDate, endDate);
  const { previousStartDate, previousEndDate, rangeDays } = getDashboardRangeMeta(startDate, endDate);
  const previousDays = buildDateSeries(previousStartDate, previousEndDate);
  const revenueMap = new Map(currentDays.map(day => [toDateInputValue(day), 0]));
  const ordersMap = new Map(currentDays.map(day => [toDateInputValue(day), 0]));
  const previousSet = new Set(previousDays.map(day => toDateInputValue(day)));
  const monthSeries = buildMonthSeries(startDate, endDate);
  const monthRevenueMap = new Map(monthSeries.map(month => [getMonthKey(month), 0]));
  const monthUsersMap = new Map(monthSeries.map(month => [getMonthKey(month), 0]));
  const monthBooksMap = new Map(monthSeries.map(month => [getMonthKey(month), 0]));
  const monthRatingsMap = new Map(monthSeries.map(month => [getMonthKey(month), { sum: 0, count: 0 }]));

  let currentRevenue = 0;
  let previousRevenue = 0;
  const filteredOrders = [];

  orders.forEach(order => {
    const key = getDateKey(order.createdAt);
    const total = Number(order.total || 0);
    if (!key) return;

    if (revenueMap.has(key)) {
      revenueMap.set(key, revenueMap.get(key) + total);
      ordersMap.set(key, ordersMap.get(key) + 1);
      monthRevenueMap.set(getMonthKey(key), (monthRevenueMap.get(getMonthKey(key)) || 0) + total);
      currentRevenue += total;
      filteredOrders.push(order);
    } else if (previousSet.has(key)) {
      previousRevenue += total;
    }
  });

  const filteredBooks = books.filter(book => {
    const createdKey = getDateKey(book.createdAt || book.created_at);
    return createdKey ? createdKey >= startDate && createdKey <= endDate : false;
  });

  const usersByMonth = new Set();
  filteredOrders.forEach(order => {
    const orderKey = getDateKey(order.createdAt);
    const email = String(order.userEmail || '').trim().toLowerCase();
    if (!orderKey || !email) return;
    usersByMonth.add(`${getMonthKey(orderKey)}:${email}`);
  });
  usersByMonth.forEach(entry => {
    const [monthKey] = entry.split(':');
    monthUsersMap.set(monthKey, (monthUsersMap.get(monthKey) || 0) + 1);
  });

  filteredBooks.forEach(book => {
    const createdKey = getDateKey(book.createdAt || book.created_at);
    if (!createdKey) return;
    const monthKey = getMonthKey(createdKey);
    monthBooksMap.set(monthKey, (monthBooksMap.get(monthKey) || 0) + 1);
    const rating = Number(book.rating || 0);
    if (rating > 0) {
      const current = monthRatingsMap.get(monthKey) || { sum: 0, count: 0 };
      monthRatingsMap.set(monthKey, { sum: current.sum + rating, count: current.count + 1 });
    }
  });

  const revenueOverTime = currentDays.map(day => {
    const key = toDateInputValue(day);
    return { label: formatShortDate(day), value: Number((revenueMap.get(key) || 0).toFixed(2)) };
  });

  const ordersOverTime = currentDays.map(day => {
    const key = toDateInputValue(day);
    return { label: formatShortDate(day), value: ordersMap.get(key) || 0 };
  });

  const categoryMap = filteredBooks.reduce((accumulator, book) => {
    const categories = getBookCategories(book);
    const normalizedCategories = categories.length ? categories : ['Uncategorized'];
    normalizedCategories.forEach(category => {
      const key = String(category || 'Uncategorized').trim() || 'Uncategorized';
      accumulator[key] = (accumulator[key] || 0) + 1;
    });
    return accumulator;
  }, {});

  const ratedBooks = filteredBooks
    .map(book => Number(book.rating || 0))
    .filter(value => value > 0);

  const trendPercent = calculateTrendPercent(currentRevenue, previousRevenue);
  const totalUsers = new Set(
    filteredOrders.map(order => String(order.userEmail || '').trim().toLowerCase()).filter(Boolean),
  ).size;
  const usersOverTime = monthSeries.map(month => ({
    label: getMonthLabel(month),
    value: monthUsersMap.get(getMonthKey(month)) || 0,
  }));
  const booksOverTime = monthSeries.map(month => ({
    label: getMonthLabel(month),
    value: monthBooksMap.get(getMonthKey(month)) || 0,
  }));
  const ratingsOverTime = monthSeries.map(month => {
    const current = monthRatingsMap.get(getMonthKey(month)) || { sum: 0, count: 0 };
    return {
      label: getMonthLabel(month),
      value: current.count ? Number((current.sum / current.count).toFixed(1)) : 0,
    };
  });
  const revenueByMonth = monthSeries.map(month => ({
    label: getMonthLabel(month),
    value: Number((monthRevenueMap.get(getMonthKey(month)) || 0).toFixed(2)),
  }));

  return {
    meta: {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      spanDays: rangeDays,
      hasData: Boolean(filteredOrders.length || filteredBooks.length || totalUsers),
    },
    metrics: {
      totalUsers,
      totalBooks: filteredBooks.length,
      totalOrders: filteredOrders.length,
      averageRating: ratedBooks.length
        ? Number((ratedBooks.reduce((sum, value) => sum + value, 0) / ratedBooks.length).toFixed(1))
        : 0,
      totalRevenue: Number(currentRevenue.toFixed(2)),
      revenueTrendPercent: Math.abs(trendPercent),
      revenueTrendDirection: trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'flat',
    },
    charts: {
      revenueOverTime,
      ordersOverTime,
      usersOverTime,
      booksOverTime,
      ratingsOverTime,
      revenueByMonth,
      booksByCategory: Object.entries(categoryMap)
        .sort(([, leftValue], [, rightValue]) => rightValue - leftValue)
        .map(([label, value]) => ({ label, value })),
    },
    recentOrders: filteredOrders.slice(0, 8),
  };
}

function UserPlusNavIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}

export default function AdminHome() {
  const navigate = useNavigate();
  const user     = getSession() || {};

  function mergeOrderStatuses(orders, overrides) {
    return orders.map(order => (
      overrides[order.id]
        ? { ...order, status: overrides[order.id] }
        : order
    ));
  }

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
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [editBook,    setEditBook]    = useState(null);   // book being edited
  const [deleteId,    setDeleteId]    = useState(null);   // confirm-delete id
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Orders ────────────────────────────────────────────────
  const [allOrders,   setAllOrders]   = useState([]);
  const [ordersLoad,  setOrdersLoad]  = useState(false);
  const [orderStatusSaving, setOrderStatusSaving] = useState({});
  const [appliedOrderSearch, setAppliedOrderSearch] = useState('');
  const [appliedOrderSearchBy, setAppliedOrderSearchBy] = useState('all');
  const [appliedOrderStatusFilter, setAppliedOrderStatusFilter] = useState('all');
  const [appliedOrderDateFrom, setAppliedOrderDateFrom] = useState('');
  const [appliedOrderDateTo, setAppliedOrderDateTo] = useState('');
  const [orderStatusOverrides, setOrderStatusOverrides] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(window.localStorage.getItem(ORDER_STATUS_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  });

  // ── Revenue ───────────────────────────────────────────────
  const [revenue, setRevenue] = useState(null);
  const defaultDashboardRange = getPresetDashboardRange('7d');
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoad, setDashboardLoad] = useState(false);
  const [dashboardErr, setDashboardErr] = useState('');
  const [dashboardFilterType, setDashboardFilterType] = useState('7d');
  const [dashboardCustomStart, setDashboardCustomStart] = useState(defaultDashboardRange.startDate);
  const [dashboardCustomEnd, setDashboardCustomEnd] = useState(defaultDashboardRange.endDate);
  const [dashboardRange, setDashboardRange] = useState(defaultDashboardRange);
  const [dashboardFilterErr, setDashboardFilterErr] = useState('');
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM);
  const [adminFormLoading, setAdminFormLoading] = useState(false);
  const [adminStep, setAdminStep] = useState(0);
  const [adminErrors, setAdminErrors] = useState({});
  const [adminTouched, setAdminTouched] = useState({});
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [showAdminConf, setShowAdminConf] = useState(false);
  const [adminServerErr, setAdminServerErr] = useState('');
  const orderSearchRef = useRef(null);
  const orderSearchByRef = useRef(null);
  const orderStatusFilterRef = useRef(null);
  const orderDateFromRef = useRef(null);
  const orderDateToRef = useRef(null);
  const dashboardCacheRef = useRef({});

  // ════════════════════════════════════════════════════════════
  //  Data loading
  // ════════════════════════════════════════════════════════════

  const loadBooks = useCallback(async () => {
    setBooksLoad(true);
    try {
      const response = await fetch(`${API}/api/books`);
      const data = await response.json();
      setBooks(Array.isArray(data) ? data : []);
      setBooksErr('');
    } catch {
      setBooksErr('Failed to load books');
    } finally {
      setBooksLoad(false);
    }
  }, []);

  // Books
  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ORDER_STATUS_STORAGE_KEY, JSON.stringify(orderStatusOverrides));
  }, [orderStatusOverrides]);

  // All orders (admin)
  useEffect(() => {
    if (panel !== 'orders' && panel !== 'home') return;
    setOrdersLoad(true);
    fetch(`${API}/api/admin/orders`)
      .then(r => r.json())
      .then(d => setAllOrders(Array.isArray(d) ? mergeOrderStatuses(d, orderStatusOverrides) : []))
      .catch(() => {})
      .finally(() => setOrdersLoad(false));
  }, [panel, orderStatusOverrides]);

  // Revenue
  useEffect(() => {
    if (panel !== 'revenue' && panel !== 'home') return;
    fetch(`${API}/api/admin/revenue`)
      .then(r => r.json())
      .then(d => setRevenue(d.totalRevenue ?? 0))
      .catch(() => {});
  }, [panel]);

  function applyDashboardPreset(filterType) {
    const nextRange = getPresetDashboardRange(filterType);
    setDashboardFilterType(filterType);
    setDashboardRange(nextRange);
    setDashboardCustomStart(nextRange.startDate);
    setDashboardCustomEnd(nextRange.endDate);
    setDashboardFilterErr('');
  }

  function applyDashboardCustomRange(startDate, endDate) {
    if (!startDate || !endDate) {
      setDashboardFilterErr('Select both dates before applying a custom range.');
      return;
    }

    if (endDate < startDate) {
      setDashboardFilterErr('End date cannot be earlier than the start date.');
      return;
    }

    setDashboardFilterType('custom');
    setDashboardRange({ startDate, endDate });
    setDashboardFilterErr('');
  }

  useEffect(() => {
    if (panel !== 'home') return;

    let isActive = true;
    setDashboardLoad(true);
    const { startDate, endDate } = dashboardRange;
    const cacheKey = `${startDate}:${endDate}`;
    const cached = dashboardCacheRef.current[cacheKey];

    if (cached) {
      setDashboardData(cached);
      setDashboardErr('');
      setDashboardLoad(false);
      return () => {
        isActive = false;
      };
    }

    const params = new URLSearchParams({
      startDate,
      endDate,
    });

    fetch(`${API}/api/admin/dashboard?${params.toString()}`)
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load dashboard');
        }
        if (!isActive) return;
        dashboardCacheRef.current[cacheKey] = data;
        setDashboardData(data);
        setDashboardErr('');
      })
      .catch(error => {
        if (!isActive) return;
        setDashboardData(null);
        setDashboardErr(getFriendlyErrorMessage(error, 'Showing live fallback data while the dashboard API is unavailable.'));
      })
      .finally(() => {
        if (isActive) setDashboardLoad(false);
      });

    return () => {
      isActive = false;
    };
  }, [dashboardRange, panel]);

  // ════════════════════════════════════════════════════════════
  //  Inventory helpers
  // ════════════════════════════════════════════════════════════

  function openAddForm() { setShowAddBookModal(true); }
  function openEditForm(book) { setEditBook(book); }

  function handleBookSaved(savedBook, context = {}) {
    const mode = context.mode || 'create';

    if (mode === 'edit') {
      setBooks(prev => prev.map(book => (book.id === savedBook.id ? savedBook : book)));
      setInvResults(prev => (
        Array.isArray(prev)
          ? prev.map(book => (book.id === savedBook.id ? savedBook : book))
          : prev
      ));
      setEditBook(null);
      return;
    }

    setInvResults(null);
    setInvSearch('');
    setBooks(prev => [savedBook, ...prev]);
  }

  async function handleDelete(id) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API}/api/books/${id}`, { method:'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete book');
      setBooks(prev => prev.filter(b => b.id !== id));
      setInvResults(prev => Array.isArray(prev) ? prev.filter(b => b.id !== id) : prev);
      setDeleteId(null);
      if (editBook?.id === id) {
        setEditBook(null);
      }
      toast('Book deleted', 'info');
    } catch (err) {
      toast(getFriendlyErrorMessage(err, 'Failed to delete book'), 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleOrderStatusChange(orderId, status) {
    setAllOrders(current => current.map(order => (
      order.id === orderId ? { ...order, status } : order
    )));
    setOrderStatusOverrides(current => ({ ...current, [orderId]: status }));
    setOrderStatusSaving(current => ({ ...current, [orderId]: true }));
    try {
      const res = await fetch(`${API}/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ status }),
      });
      const updated = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(updated.error || 'Failed to update order status');
      }

      setAllOrders(current => current.map(order => (
        order.id === orderId ? updated : order
      )));
      setOrderStatusOverrides(current => ({ ...current, [orderId]: updated.status || status }));
      toast(`Order marked as ${updated.status || status}`, 'success');
    } catch (err) {
      const message = getFriendlyErrorMessage(err, 'Failed to update order status');
      toast(`${message}. Saved locally for now.`, 'info');
    } finally {
      setOrderStatusSaving(current => ({ ...current, [orderId]: false }));
    }
  }

  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
      const idValue = String(order.id || '').toLowerCase();
      const customerValue = String(order.userEmail || '').toLowerCase();
      const searchValue = appliedOrderSearch.trim().toLowerCase();
      const createdDate = order.createdAt ? String(order.createdAt).slice(0, 10) : '';
      const normalizedStatus = String(order.status || '').toLowerCase();

      if (searchValue) {
        const matchesSearch = (
          appliedOrderSearchBy === 'id'
            ? idValue.includes(searchValue)
            : appliedOrderSearchBy === 'customer'
              ? customerValue.includes(searchValue)
              : idValue.includes(searchValue) || customerValue.includes(searchValue)
        );

        if (!matchesSearch) return false;
      }

      if (appliedOrderStatusFilter !== 'all' && normalizedStatus !== appliedOrderStatusFilter) {
        return false;
      }

      if (appliedOrderDateFrom && (!createdDate || createdDate < appliedOrderDateFrom)) {
        return false;
      }

      if (appliedOrderDateTo && (!createdDate || createdDate > appliedOrderDateTo)) {
        return false;
      }

      return true;
    });
  }, [allOrders, appliedOrderDateFrom, appliedOrderDateTo, appliedOrderSearch, appliedOrderSearchBy, appliedOrderStatusFilter]);

  const fallbackDashboardData = useMemo(
    () => buildDashboardFallbackData({
      books,
      orders: allOrders,
      startDate: dashboardRange.startDate,
      endDate: dashboardRange.endDate,
    }),
    [allOrders, books, dashboardRange.endDate, dashboardRange.startDate],
  );

  const dashboardSnapshot = useMemo(() => {
    const source = dashboardData?.metrics ? dashboardData : fallbackDashboardData;
    return {
      meta: source.meta || fallbackDashboardData.meta,
      metrics: source.metrics || fallbackDashboardData.metrics,
      charts: source.charts || fallbackDashboardData.charts,
      recentOrders: mergeOrderStatuses(
        Array.isArray(source.recentOrders) ? source.recentOrders : fallbackDashboardData.recentOrders,
        orderStatusOverrides,
      ),
    };
  }, [dashboardData, fallbackDashboardData, orderStatusOverrides]);

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
        (b.name || b.title).toLowerCase().includes(invSearch.toLowerCase()) ||
        b.author.toLowerCase().includes(invSearch.toLowerCase()) ||
        b.id === invSearch
      ));
    }
  }

  function adminFieldState(name) {
    if (!adminTouched[name]) return '';
    return adminErrors[name] ? 'error' : 'ok';
  }

  function validateAdminField(name, value, currentForm = adminForm) {
    if (name === 'confirmPassword') {
      return adminValidators.confirmPassword(value, currentForm.password);
    }
    return adminValidators[name]?.(value) ?? '';
  }

  function handleAdminFormChange(e) {
    const { name, value } = e.target;
    const nextForm = { ...adminForm, [name]: value };
    setAdminForm(nextForm);
    setAdminServerErr('');

    if (adminTouched[name]) {
      setAdminErrors(current => ({
        ...current,
        [name]: validateAdminField(name, value, nextForm),
      }));
    }

    if (name === 'password' && adminTouched.confirmPassword) {
      setAdminErrors(current => ({
        ...current,
        confirmPassword: adminValidators.confirmPassword(nextForm.confirmPassword, value),
      }));
    }
  }

  function handleAdminBlur(e) {
    const { name, value } = e.target;
    setAdminTouched(current => ({ ...current, [name]: true }));
    setAdminErrors(current => ({
      ...current,
      [name]: validateAdminField(name, value),
    }));
  }

  function validateAdminStep() {
    const fields = ADMIN_STEPS[adminStep].fields;
    const nextErrors = {};

    fields.forEach(field => {
      nextErrors[field] = validateAdminField(field, adminForm[field]);
    });

    setAdminErrors(current => ({ ...current, ...nextErrors }));
    setAdminTouched(current => {
      const nextTouched = { ...current };
      fields.forEach(field => {
        nextTouched[field] = true;
      });
      return nextTouched;
    });

    return fields.every(field => !nextErrors[field]);
  }

  function resetAdminForm() {
    setAdminForm(EMPTY_ADMIN_FORM);
    setAdminStep(0);
    setAdminErrors({});
    setAdminTouched({});
    setAdminServerErr('');
    setShowAdminPwd(false);
    setShowAdminConf(false);
  }

  function handleAdminNext(e) {
    e.preventDefault();
    if (validateAdminStep()) {
      setAdminStep(current => current + 1);
    }
  }

  function handleAdminBack() {
    setAdminStep(current => current - 1);
  }

  async function handleAdminCreate(e) {
    e.preventDefault();
    if (!validateAdminStep()) {
      return;
    }

    setAdminFormLoading(true);
    setAdminServerErr('');

    try {
      const res = await fetch(`${API}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          name: adminForm.name.trim(),
          dob: adminForm.dob,
          email: adminForm.email.trim().toLowerCase(),
          password: adminForm.password,
          requesterEmail: user.email,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create admin user');
      }

      resetAdminForm();
      toast(data.message || 'Admin user created successfully.', 'success');
    } catch (err) {
      const message = getFriendlyErrorMessage(err, 'Failed to create admin user');
      setAdminServerErr(message);
      toast(message, 'error');
    } finally {
      setAdminFormLoading(false);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  Logout
  // ════════════════════════════════════════════════════════════

  function handleLogout() {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;

    clearSession();
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
    { id:'admins',    icon:'ðŸ‘¤', label:'Add Admin' },
  ];
  const sidebarItems = navItems.map(item => (
    item.id === 'admins'
      ? { ...item, icon: <UserPlusNavIcon /> }
      : item
  ));

  // ════════════════════════════════════════════════════════════
  //  Panel: HOME (dashboard)
  // ════════════════════════════════════════════════════════════

  function DashboardPanel() {
    const meta = dashboardSnapshot.meta || {};
    const metrics = dashboardSnapshot.metrics || {};
    const charts = dashboardSnapshot.charts || {};
    const recentOrders = dashboardSnapshot.recentOrders || [];
    const revenueSeries = charts.revenueByMonth || charts.revenueOverTime || [];
    const usersSeries = charts.usersOverTime || [];
    const booksSeries = charts.booksOverTime || [];
    const ratingsSeries = charts.ratingsOverTime || [];
    const rangeLabel = dashboardFilterType === 'custom'
      ? `${formatShortDate(meta.startDate || dashboardRange.startDate)} to ${formatShortDate(meta.endDate || dashboardRange.endDate)}`
      : dashboardFilterType === '30d'
        ? 'Last 30 days'
        : 'Last 7 days';
    const comparisonLabel = `${meta.spanDays || 7} day${(meta.spanDays || 7) === 1 ? '' : 's'}`;
    const hasDashboardData = Boolean(meta.hasData);

    return (
      <div className="page-body dashboard-panel">
        <div className="dashboard-head">
          <div>
            <h2 className="section-title">Admin <span>Dashboard</span></h2>
            <p className="dashboard-section-copy">Track revenue, order activity, and catalog movement for {rangeLabel.toLowerCase()}.</p>
          </div>
          <DashboardFilter
            activeFilter={dashboardFilterType}
            customEndDate={dashboardCustomEnd}
            customStartDate={dashboardCustomStart}
            error={dashboardFilterErr}
            loading={dashboardLoad}
            onCustomEndChange={value => {
              setDashboardCustomEnd(value);
              setDashboardFilterErr('');
            }}
            onCustomStartChange={value => {
              setDashboardCustomStart(value);
              setDashboardFilterErr('');
            }}
            onFilterChange={applyDashboardCustomRange}
            onPresetSelect={filterType => {
              if (filterType === 'custom') {
                setDashboardFilterType('custom');
                setDashboardFilterErr('');
                return;
              }
              applyDashboardPreset(filterType);
            }}
          />
        </div>

        {dashboardErr ? <p className="dashboard-inline-note">{dashboardErr}</p> : null}
        {!hasDashboardData ? <p className="dashboard-empty-note">No dashboard data is available for the selected range yet.</p> : null}

        <div className="dashboard-stat-grid">
          <StatCard
            accent="users"
            icon={<UsersIcon />}
            subtitle={`Active customers across ${comparisonLabel}`}
            title="Total Users"
            value={metrics.totalUsers ?? 0}
          />
          <StatCard
            accent="books"
            icon={<BooksIcon />}
            subtitle={`Books tracked inside ${rangeLabel.toLowerCase()}`}
            title="Total Books"
            value={metrics.totalBooks ?? 0}
          />
          <StatCard
            accent="rating"
            icon={<RatingIcon />}
            ratingValue={Number(metrics.averageRating || 0)}
            subtitle={`Average rating from books added in ${rangeLabel.toLowerCase()}`}
            title="Average Rating"
            value={Number(metrics.averageRating || 0).toFixed(1)}
          />
          <StatCard
            accent="revenue"
            icon={<RevenueIcon />}
            sparkline={revenueSeries}
            subtitle={`${
              metrics.revenueTrendDirection === 'down'
                ? 'Down'
                : metrics.revenueTrendDirection === 'flat'
                  ? 'Flat'
                  : 'Up'
            } versus the previous ${comparisonLabel}`}
            title="Total Revenue"
            trendDirection={metrics.revenueTrendDirection || 'flat'}
            trendPercent={Number(metrics.revenueTrendPercent || 0)}
            value={formatCurrency(metrics.totalRevenue || 0)}
          />
        </div>

        <div className="dashboard-chart-grid">
          <ChartCard
            subtitle={`Monthly revenue bars within ${rangeLabel.toLowerCase()}`}
            title="Total Revenue By Month"
          >
            <BarTrendChart
              data={revenueSeries}
              emptyMessage="No monthly revenue data available"
              valueFormatter={value => formatCurrency(value)}
            />
          </ChartCard>

          <ChartCard
            subtitle="Monthly user growth across the selected range"
            title="Total Users By Month"
          >
            <LineTrendChart data={usersSeries} emptyMessage="No monthly user data available" />
          </ChartCard>

          <ChartCard
            subtitle="Monthly catalog additions inside the selected range"
            title="Total Books By Month"
          >
            <LineTrendChart data={booksSeries} emptyMessage="No monthly book data available" />
          </ChartCard>

          <ChartCard
            subtitle="Average monthly book rating based on books in range"
            title="Average Rating By Month"
          >
            <LineTrendChart data={ratingsSeries} emptyMessage="No monthly rating data available" />
          </ChartCard>
        </div>

        <div className="dashboard-table-section">
          <div className="dashboard-section-head">
            <div>
              <h3 className="section-title" style={{ marginBottom: 6 }}>Recent Orders</h3>
              <p className="dashboard-section-copy">Latest purchases captured inside the selected date window.</p>
            </div>
          </div>

          {ordersLoad && !recentOrders.length ? (
            <p style={{ color:'var(--text-muted)' }}>Loading...</p>
          ) : (
            <OrdersTable
              compactIdLength={8}
              emptyMessage="No recent orders yet."
              orders={recentOrders}
              showSubtotal={false}
            />
          )}
        </div>
      </div>
    );
  }

  function InventoryPanel() {
    const displayBooks = invResults !== null ? invResults : books;

    return (
      <div className="page-body">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <h2 className="section-title" style={{ marginBottom:0 }}>Book <span>Inventory</span></h2>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-2 font-semibold text-slate-950 transition duration-200 hover:bg-yellow-600"
            onClick={openAddForm}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add Book
          </button>
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
                        src={book.imageUrl || book.image || 'https://via.placeholder.com/40x54/1e2535/7b879f?text=B'}
                        alt={book.name || book.title}
                        style={{ width:40, height:54, objectFit:'cover', borderRadius:4, background:'var(--surface2)' }}
                      />
                    </td>
                    <td style={{ fontWeight:600, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {book.name || book.title}
                    </td>
                    <td style={{ color:'var(--text-muted)', fontSize:'.85rem' }}>{book.author}</td>
                    <td>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {getBookCategories(book).map(category => (
                          <span key={`${book.id}-${category}`} className="cat-tag">{category}</span>
                        ))}
                      </div>
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
                        <button className="icon-btn edit" onClick={() => openEditForm(book)} title="Edit" type="button">✏️</button>
                        <button className="icon-btn del"  onClick={() => setDeleteId(book.id)} title="Delete" type="button">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AddBookModal
          onClose={() => setShowAddBookModal(false)}
          onSaved={handleBookSaved}
          open={showAddBookModal}
        />

        <AddBookModal
          book={editBook}
          mode="edit"
          onClose={() => setEditBook(null)}
          onSaved={handleBookSaved}
          open={Boolean(editBook)}
        />

        {/* Delete confirm modal */}
        {deleteId && (
          <div className="modal-backdrop" onClick={() => setDeleteId(null)}>
            <div className="modal-box" style={{ maxWidth:380, textAlign:'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>⚠️</div>
              <h3 style={{ fontFamily:'var(--font-display)', marginBottom:8 }}>Delete this book?</h3>
              <p style={{ color:'var(--text-muted)', fontSize:'.875rem', marginBottom:20 }}>This action cannot be undone.</p>
              <div style={{ display:'flex', gap:12 }}>
                <button className="btn-secondary" style={{ flex:1 }} onClick={() => setDeleteId(null)} type="button">Cancel</button>
                <button className="btn-danger" disabled={deleteLoading} style={{ flex:1 }} onClick={() => handleDelete(deleteId)} type="button">
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
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
        <form
          className="orders-filter-bar"
          onSubmit={event => {
            event.preventDefault();
            setAppliedOrderSearch(orderSearchRef.current?.value || '');
            setAppliedOrderSearchBy(orderSearchByRef.current?.value || 'all');
            setAppliedOrderStatusFilter(orderStatusFilterRef.current?.value || 'all');
            setAppliedOrderDateFrom(orderDateFromRef.current?.value || '');
            setAppliedOrderDateTo(orderDateToRef.current?.value || '');
          }}
        >
          <input
            className="input-field"
            defaultValue={appliedOrderSearch}
            placeholder="Search orders..."
            ref={orderSearchRef}
            style={{ flex:1, minWidth:220 }}
          />
          <select
            className="input-field"
            defaultValue={appliedOrderSearchBy}
            ref={orderSearchByRef}
            style={{ width:170 }}
          >
            <option value="all">All Fields</option>
            <option value="id">By Order ID</option>
            <option value="customer">By Customer</option>
          </select>
          <select
            className="input-field"
            defaultValue={appliedOrderStatusFilter}
            ref={orderStatusFilterRef}
            style={{ width:170 }}
          >
            <option value="all">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="processed">Processed</option>
          </select>
          <label className="orders-date-field">
            <span>From</span>
            <input
              className="input-field"
              defaultValue={appliedOrderDateFrom}
              ref={orderDateFromRef}
              type="date"
            />
          </label>
          <label className="orders-date-field">
            <span>Till</span>
            <input
              className="input-field"
              defaultValue={appliedOrderDateTo}
              ref={orderDateToRef}
              type="date"
            />
          </label>
          <button type="submit" className="btn-primary">Search</button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (orderSearchRef.current) orderSearchRef.current.value = '';
              if (orderSearchByRef.current) orderSearchByRef.current.value = 'all';
              if (orderStatusFilterRef.current) orderStatusFilterRef.current.value = 'all';
              if (orderDateFromRef.current) orderDateFromRef.current.value = '';
              if (orderDateToRef.current) orderDateToRef.current.value = '';
              setAppliedOrderSearch('');
              setAppliedOrderSearchBy('all');
              setAppliedOrderStatusFilter('all');
              setAppliedOrderDateFrom('');
              setAppliedOrderDateTo('');
            }}
          >
            Clear
          </button>
        </form>
        {ordersLoad ? <p style={{ color:'var(--text-muted)' }}>Loading...</p> : (
          <OrdersTable
            compactIdLength={10}
            emptyMessage="No orders placed yet."
            onStatusChange={handleOrderStatusChange}
            orders={filteredOrders}
            showStatusControl
            statusOptions={ORDER_STATUS_OPTIONS}
            statusSaving={orderStatusSaving}
          />
        )}
      </div>
    );
  }

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
            <div className="stat-value">₹{revenue != null ? Number(revenue).toFixed(0) : '—'}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{allOrders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              ₹{allOrders.length ? (Number(revenue || 0) / allOrders.length).toFixed(0) : '—'}
            </div>
            <div className="stat-label">Avg Order Value</div>
          </div>
          <div className="stat-card">
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

  function AdminUsersPanel() {
    return <AdminForm />;
  }

  const panelTitle = {
    home:      'Dashboard',
    inventory: 'Inventory',
    orders:    'All Orders',
    revenue:   'Revenue',
    admins:    'Add Admin',
  };
  const headerTitle = panel === 'admins' ? 'Add Admin' : panelTitle[panel] || 'Admin';

  return (
    <div className="shell">
      <Sidebar
        items={sidebarItems}
        active={panel}
        onSelect={setPanel}
        onLogout={handleLogout}
        user={user}
      />

      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{headerTitle}</span>
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
        {panel === 'admins'    && <AdminUsersPanel />}
      </div>
    </div>
  );
}
