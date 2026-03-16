// dashboard.js — Dashboard Page Module

const DashboardModule = {
  render(container) {
    const txns    = DB.getTransactions();
    const profile = DB.getProfile();
    const now     = new Date();
    const curMonth = fmt.monthKey(now);

    // Compute stats
    const thisMonthTxns = txns.filter(t => t.date.startsWith(curMonth));
    const income  = thisMonthTxns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
    const expense = thisMonthTxns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
    const balance = income - expense;
    const net     = txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0)
                  - txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);

    // Last 5 transactions
    const recent = txns.slice(0, 5);

    // Category breakdown this month
    const catMap = {};
    thisMonthTxns.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const topCats = Object.entries(catMap).sort((a,b) => b[1]-a[1]).slice(0,4);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Good ${getGreeting()}, ${profile.name} ${profile.avatar}</div>
          <div class="page-subtitle">${now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</div>
        </div>
        <button class="btn btn-primary btn-sm" id="dash-add-btn">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add
        </button>
      </div>

      <!-- Balance Hero -->
      <div class="balance-hero mb-3">
        <div class="balance-label">Net Balance (all time)</div>
        <div class="balance-amount ${net >= 0 ? 'text-accent' : 'text-danger'}">${fmt.currency(net, profile.currency || '₹')}</div>
        <div class="balance-sub">${net >= 0 ? '▲ Positive balance' : '▼ Negative balance'}</div>
      </div>

      <!-- Stats -->
      <div class="grid-3 mb-3">
        <div class="stat-card">
          <div class="stat-label">This Month Income</div>
          <div class="stat-value positive">${fmt.currency(income, profile.currency || '₹')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">This Month Spent</div>
          <div class="stat-value negative">${fmt.currency(expense, profile.currency || '₹')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">This Month Saved</div>
          <div class="stat-value ${balance >= 0 ? 'positive' : 'negative'}">${fmt.currency(balance, profile.currency || '₹')}</div>
        </div>
      </div>

      <!-- Top Spending Categories -->
      ${topCats.length ? `
      <div class="mb-3">
        <div class="section-label">Top Spending This Month</div>
        <div class="card card-sm">
          ${topCats.map(([cat, amt]) => {
            const info = getCatInfo(cat);
            const pct = expense > 0 ? Math.round(amt/expense*100) : 0;
            return `
            <div style="margin-bottom:10px;">
              <div class="flex-between mb-1">
                <span style="font-size:13px;font-weight:500;">${info.emoji} ${info.label}</span>
                <span style="font-size:13px;font-weight:700;">${fmt.currency(amt, profile.currency || '₹')} <span class="text-muted">${pct}%</span></span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${pct}%"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Recent Transactions -->
      <div class="flex-between mb-2">
        <div class="section-label" style="margin-bottom:0">Recent Transactions</div>
        <button class="btn btn-ghost btn-sm" id="dash-view-all">View All</button>
      </div>
      <div class="card card-sm">
        ${recent.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">💸</div>
            <div class="empty-title">No transactions yet</div>
            <div class="empty-desc">Add your first transaction to get started</div>
          </div>
        ` : `
          <div class="txn-list">
            ${recent.map(t => renderTxnRow(t, profile.currency || '₹', false)).join('')}
          </div>
        `}
      </div>
    `;

    container.querySelector('#dash-add-btn')?.addEventListener('click', () => {
      if (window.TransactionsModule) window.TransactionsModule.showAddModal();
    });
    container.querySelector('#dash-view-all')?.addEventListener('click', () => {
      Router.navigate('transactions');
    });
  }
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function renderTxnRow(t, currency, showActions = true) {
  const info = getCatInfo(t.category, t.type);
  return `
    <div class="txn-item" data-id="${t.id}">
      <div class="txn-icon ${info.cls}">${info.emoji}</div>
      <div class="txn-info">
        <div class="txn-note">${t.note || info.label}</div>
        <div class="txn-meta">${info.label} · ${fmt.relativeDate(t.date)}</div>
      </div>
      ${showActions ? `
      <div class="txn-actions">
        <button class="txn-edit-btn" data-id="${t.id}" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="txn-del-btn" data-id="${t.id}" title="Delete">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
      ` : ''}
      <div class="txn-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt.currency(t.amount, currency)}</div>
    </div>
  `;
}

window.renderTxnRow = renderTxnRow;
window.DashboardModule = DashboardModule;

// Register after Router is available
document.addEventListener('DOMContentLoaded', () => {
  Router.register('dashboard', DashboardModule);
});
