/* app.js — Core: Storage, State, Router, Utilities */

// ── Storage Layer ────────────────────────────────────────────
const DB = {
  KEY_TXN:     'fynix_transactions',
  KEY_BUDGETS: 'fynix_budgets',
  KEY_GOALS:   'fynix_goals',
  KEY_PROFILE: 'fynix_profile',

  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  getObj(key, def = {}) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch { return def; }
  },

  // Transactions
  getTransactions()        { return this.get(this.KEY_TXN); },
  saveTransactions(arr)    { this.set(this.KEY_TXN, arr); },
  addTransaction(txn)      {
    const arr = this.getTransactions();
    arr.unshift({ ...txn, id: Date.now().toString(36) + Math.random().toString(36).slice(2,6) });
    this.saveTransactions(arr);
    return arr[0];
  },
  updateTransaction(id, data) {
    const arr = this.getTransactions().map(t => t.id === id ? { ...t, ...data } : t);
    this.saveTransactions(arr);
  },
  deleteTransaction(id)    {
    this.saveTransactions(this.getTransactions().filter(t => t.id !== id));
  },

  // Budgets
  getBudgets()             { return this.get(this.KEY_BUDGETS); },
  saveBudgets(arr)         { this.set(this.KEY_BUDGETS, arr); },
  addBudget(b)             {
    const arr = this.getBudgets();
    arr.push({ ...b, id: Date.now().toString(36) });
    this.saveBudgets(arr);
  },
  updateBudget(id, data)   {
    this.saveBudgets(this.getBudgets().map(b => b.id === id ? { ...b, ...data } : b));
  },
  deleteBudget(id)         {
    this.saveBudgets(this.getBudgets().filter(b => b.id !== id));
  },

  // Goals
  getGoals()               { return this.get(this.KEY_GOALS); },
  saveGoals(arr)           { this.set(this.KEY_GOALS, arr); },
  addGoal(g)               {
    const arr = this.getGoals();
    arr.push({ ...g, id: Date.now().toString(36) });
    this.saveGoals(arr);
  },
  updateGoal(id, data)     {
    this.saveGoals(this.getGoals().map(g => g.id === id ? { ...g, ...data } : g));
  },
  deleteGoal(id)           {
    this.saveGoals(this.getGoals().filter(g => g.id !== id));
  },

  // Profile
  getProfile()             { return this.getObj(this.KEY_PROFILE, { name: 'User', avatar: '💰', currency: '₹' }); },
  saveProfile(p)           { this.set(this.KEY_PROFILE, p); },
};

// ── Utility Helpers ──────────────────────────────────────────
const fmt = {
  currency(n, symbol = '₹') {
    const abs = Math.abs(n);
    if (abs >= 1e7) return symbol + (n/1e7).toFixed(1) + 'Cr';
    if (abs >= 1e5) return symbol + (n/1e5).toFixed(1) + 'L';
    return symbol + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  },
  date(str) {
    const d = new Date(str);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },
  dateShort(str) {
    const d = new Date(str);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  },
  monthYear(str) {
    const d = new Date(str);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  },
  monthKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  },
  relativeDate(str) {
    const d = new Date(str);
    const today = new Date();
    const diff = Math.floor((today - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return `${diff} days ago`;
    return fmt.dateShort(str);
  }
};

const CATEGORIES = {
  expense: [
    { id: 'food',       label: 'Food & Dining',  emoji: '🍔', cls: 'cat-food' },
    { id: 'transport',  label: 'Transport',       emoji: '🚗', cls: 'cat-transport' },
    { id: 'shopping',   label: 'Shopping',        emoji: '🛍️', cls: 'cat-shopping' },
    { id: 'health',     label: 'Health',          emoji: '💊', cls: 'cat-health' },
    { id: 'bills',      label: 'Bills & Utilities',emoji: '💡', cls: 'cat-bills' },
    { id: 'entertain',  label: 'Entertainment',   emoji: '🎬', cls: 'cat-entertain' },
    { id: 'education',  label: 'Education',       emoji: '📚', cls: 'cat-education' },
    { id: 'other',      label: 'Other',           emoji: '📦', cls: 'cat-other' },
  ],
  income: [
    { id: 'salary',    label: 'Salary',      emoji: '💼', cls: 'cat-salary' },
    { id: 'freelance', label: 'Freelance',   emoji: '💻', cls: 'cat-freelance' },
    { id: 'gift',      label: 'Gift',        emoji: '🎁', cls: 'cat-other' },
    { id: 'other',     label: 'Other',       emoji: '💰', cls: 'cat-salary' },
  ]
};

function getCatInfo(id, type = 'expense') {
  const list = [...CATEGORIES.expense, ...CATEGORIES.income];
  return list.find(c => c.id === id) || { label: id, emoji: '💰', cls: 'cat-other' };
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Modal ────────────────────────────────────────────────────
const Modal = {
  show(title, html, onOpen) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
    if (onOpen) onOpen(document.getElementById('modal-body'));
  },
  hide() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  }
};

// ── Router ───────────────────────────────────────────────────
const Router = {
  current: 'dashboard',
  pages: ['dashboard', 'transactions', 'analytics', 'budgets', 'goals', 'profile'],
  pageModules: {},

  register(name, module) {
    this.pageModules[name] = module;
  },

  navigate(page) {
    if (!this.pages.includes(page)) page = 'dashboard';
    this.current = page;
    location.hash = page;

    // Update page visibility
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');

    // Update nav active states
    document.querySelectorAll('[data-page]').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Render page
    if (this.pageModules[page]) {
      this.pageModules[page].render(document.getElementById(`page-${page}`));
    }
  },

  init() {
    // Click handlers for nav links
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(el.dataset.page);
      });
    });

    // Hash change
    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1);
      if (hash && this.pages.includes(hash)) this.navigate(hash);
    });

    // Initial route
    const init = location.hash.slice(1);
    this.navigate(this.pages.includes(init) ? init : 'dashboard');
  }
};

// ── Theme ────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('fynix_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('fynix_theme', next);
  });
}

// ── Modal close ──────────────────────────────────────────────
document.getElementById('modal-close').addEventListener('click', () => Modal.hide());
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target.id === 'modal-overlay') Modal.hide();
});

// ── FAB ──────────────────────────────────────────────────────
document.getElementById('fab').addEventListener('click', () => {
  // Show add transaction modal from transactions module
  if (window.TransactionsModule) window.TransactionsModule.showAddModal();
});

// ── Boot ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Expose globals
  window.DB       = DB;
  window.fmt      = fmt;
  window.CATEGORIES = CATEGORIES;
  window.getCatInfo = getCatInfo;
  window.showToast = showToast;
  window.Modal     = Modal;
  window.Router    = Router;
});
