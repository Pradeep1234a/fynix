// transactions.js — Transactions Page Module

const TransactionsModule = {
  filter: 'all',   // all | income | expense
  search: '',

  render(container) {
    const profile = DB.getProfile();
    const currency = profile.currency || '₹';
    let txns = DB.getTransactions();

    // Apply filter
    if (this.filter !== 'all') txns = txns.filter(t => t.type === this.filter);

    // Apply search
    if (this.search) {
      const q = this.search.toLowerCase();
      txns = txns.filter(t =>
        (t.note || '').toLowerCase().includes(q) ||
        (getCatInfo(t.category).label || '').toLowerCase().includes(q)
      );
    }

    // Compute totals from filtered
    const income  = txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Transactions</div>
          <div class="page-subtitle">Your complete money history</div>
        </div>
        <button class="btn btn-primary btn-sm" id="txn-add-btn">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add
        </button>
      </div>

      <!-- Summary strip -->
      <div class="summary-strip">
        <div class="summary-item">
          <div class="summary-item-label">Income</div>
          <div class="summary-item-val text-accent">${fmt.currency(income, currency)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-item-label">Expenses</div>
          <div class="summary-item-val text-danger">${fmt.currency(expense, currency)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-item-label">Net</div>
          <div class="summary-item-val ${income-expense >= 0 ? 'text-accent' : 'text-danger'}">${fmt.currency(income-expense, currency)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-item-label">Count</div>
          <div class="summary-item-val">${txns.length}</div>
        </div>
      </div>

      <!-- Search -->
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="form-input" id="txn-search" placeholder="Search transactions…" value="${this.search}" />
      </div>

      <!-- Filter chips -->
      <div class="filter-bar mb-3">
        <button class="filter-chip ${this.filter==='all'?'active':''}" data-filter="all">All</button>
        <button class="filter-chip ${this.filter==='expense'?'active':''}" data-filter="expense">Expenses</button>
        <button class="filter-chip ${this.filter==='income'?'active':''}" data-filter="income">Income</button>
      </div>

      <!-- Transaction List -->
      <div id="txn-list-wrap">
        ${this.renderList(txns, currency)}
      </div>
    `;

    // Events
    container.querySelector('#txn-add-btn').addEventListener('click', () => this.showAddModal());

    container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.filter;
        this.render(container);
      });
    });

    container.querySelector('#txn-search').addEventListener('input', e => {
      this.search = e.target.value;
      // Re-render list only
      const wrap = container.querySelector('#txn-list-wrap');
      let filtered = DB.getTransactions();
      if (this.filter !== 'all') filtered = filtered.filter(t => t.type === this.filter);
      if (this.search) {
        const q = this.search.toLowerCase();
        filtered = filtered.filter(t =>
          (t.note || '').toLowerCase().includes(q) ||
          (getCatInfo(t.category).label || '').toLowerCase().includes(q)
        );
      }
      wrap.innerHTML = this.renderList(filtered, currency);
      this.bindListActions(container);
    });

    this.bindListActions(container);
  },

  renderList(txns, currency) {
    if (txns.length === 0) return `
      <div class="card">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">No transactions found</div>
          <div class="empty-desc">Add a transaction or change your filters</div>
        </div>
      </div>
    `;

    // Group by date
    const groups = {};
    txns.forEach(t => {
      const d = t.date.slice(0,10);
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });

    let html = '<div class="card card-sm"><div class="txn-list">';
    Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(date => {
      const label = fmt.relativeDate(date);
      html += `<div class="txn-date-sep">${label}</div>`;
      groups[date].forEach(t => {
        html += renderTxnRow(t, currency, true);
      });
    });
    html += '</div></div>';
    return html;
  },

  bindListActions(container) {
    container.querySelectorAll('.txn-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this transaction?')) {
          DB.deleteTransaction(btn.dataset.id);
          showToast('Transaction deleted');
          this.render(container);
          // Refresh dashboard if needed
        }
      });
    });
    container.querySelectorAll('.txn-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const txn = DB.getTransactions().find(t => t.id === btn.dataset.id);
        if (txn) this.showEditModal(txn, container);
      });
    });
  },

  showAddModal(onDone) {
    const profile = DB.getProfile();
    Modal.show('Add Transaction', this.formHTML(), (body) => {
      this.bindForm(body, null, () => {
        Modal.hide();
        showToast('Transaction added ✓');
        // Re-render current page if on transactions
        const tp = document.getElementById('page-transactions');
        if (tp && tp.classList.contains('active')) this.render(tp);
        const dp = document.getElementById('page-dashboard');
        if (dp && dp.classList.contains('active')) DashboardModule.render(dp);
        if (onDone) onDone();
      });
    });
  },

  showEditModal(txn, container) {
    Modal.show('Edit Transaction', this.formHTML(txn), (body) => {
      this.bindForm(body, txn, () => {
        Modal.hide();
        showToast('Transaction updated ✓');
        if (container) this.render(container);
        const dp = document.getElementById('page-dashboard');
        if (dp && dp.classList.contains('active')) DashboardModule.render(dp);
      });
    });
  },

  formHTML(txn = null) {
    const type = txn?.type || 'expense';
    const expCats = CATEGORIES.expense.map(c =>
      `<option value="${c.id}" ${txn?.category === c.id ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('');
    const incCats = CATEGORIES.income.map(c =>
      `<option value="${c.id}" ${txn?.category === c.id ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('');

    const today = new Date().toISOString().slice(0,10);

    return `
      <div class="tab-toggle">
        <button type="button" data-type="expense" class="${type==='expense'?'active':''}">💸 Expense</button>
        <button type="button" data-type="income"  class="${type==='income'?'active':''}">💰 Income</button>
      </div>

      <div class="form-group">
        <label class="form-label">Amount (₹)</label>
        <input class="form-input" type="number" id="f-amount" placeholder="0.00" min="0" step="0.01"
          value="${txn?.amount || ''}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="f-category">
          <optgroup label="Expenses" id="exp-cats" ${type==='income'?'style="display:none"':''}>
            ${expCats}
          </optgroup>
          <optgroup label="Income" id="inc-cats" ${type==='expense'?'style="display:none"':''}>
            ${incCats}
          </optgroup>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Note (optional)</label>
        <input class="form-input" type="text" id="f-note" placeholder="What was it for?"
          value="${txn?.note || ''}" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="form-input" type="date" id="f-date"
            value="${txn?.date || today}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Payment</label>
          <select class="form-select" id="f-payment">
            ${['UPI','Cash','Card','Net Banking','Other'].map(p =>
              `<option ${txn?.paymentMethod === p ? 'selected' : ''}>${p}</option>`
            ).join('')}
          </select>
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="f-save">
        ${txn ? 'Update Transaction' : 'Save Transaction'}
      </button>
    `;
  },

  bindForm(body, existing, onSuccess) {
    let curType = existing?.type || 'expense';

    // Tab toggle
    body.querySelectorAll('.tab-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        curType = btn.dataset.type;
        body.querySelectorAll('.tab-toggle button').forEach(b => b.classList.toggle('active', b === btn));
        body.querySelector('#exp-cats').style.display = curType === 'expense' ? '' : 'none';
        body.querySelector('#inc-cats').style.display = curType === 'income' ? '' : 'none';
        // Reset category to first of new type
        const cats = CATEGORIES[curType];
        body.querySelector('#f-category').value = cats[0].id;
      });
    });

    body.querySelector('#f-save').addEventListener('click', () => {
      const amount = parseFloat(body.querySelector('#f-amount').value);
      const category = body.querySelector('#f-category').value;
      const note = body.querySelector('#f-note').value.trim();
      const date = body.querySelector('#f-date').value;
      const paymentMethod = body.querySelector('#f-payment').value;

      if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
      if (!date) { showToast('Enter a date', 'error'); return; }

      const data = { type: curType, amount, category, note, date, paymentMethod };

      if (existing) {
        DB.updateTransaction(existing.id, data);
      } else {
        DB.addTransaction(data);
      }
      onSuccess();
    });
  }
};

window.TransactionsModule = TransactionsModule;

document.addEventListener('DOMContentLoaded', () => {
  Router.register('transactions', TransactionsModule);
});
