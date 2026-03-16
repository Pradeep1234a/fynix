// budgets.js — Budgets Page Module

const BudgetsModule = {
  render(container) {
    const profile  = DB.getProfile();
    const currency = profile.currency || '₹';
    const budgets  = DB.getBudgets();
    const txns     = DB.getTransactions();
    const curMonth = fmt.monthKey();

    // Spending per category this month
    const spent = {};
    txns.filter(t => t.type === 'expense' && t.date.startsWith(curMonth))
        .forEach(t => { spent[t.category] = (spent[t.category] || 0) + t.amount; });

    // Current month budgets
    const monthBudgets = budgets.filter(b => b.month === curMonth);
    const totalBudget = monthBudgets.reduce((s,b) => s + b.amount, 0);
    const totalSpent  = monthBudgets.reduce((s,b) => s + (spent[b.category] || 0), 0);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Budgets</div>
          <div class="page-subtitle">${new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' })}</div>
        </div>
        <button class="btn btn-primary btn-sm" id="budget-add-btn">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Budget
        </button>
      </div>

      ${totalBudget > 0 ? `
      <!-- Overall summary -->
      <div class="card card-lg mb-3">
        <div class="flex-between mb-2">
          <div>
            <div class="section-label" style="margin-bottom:2px">Total Budget</div>
            <div style="font-size:22px;font-weight:700;font-family:var(--font-display)">${fmt.currency(totalBudget, currency)}</div>
          </div>
          <div style="text-align:right">
            <div class="section-label" style="margin-bottom:2px">Spent</div>
            <div style="font-size:22px;font-weight:700;font-family:var(--font-display);color:${totalSpent > totalBudget ? 'var(--danger)' : 'var(--text)'}">${fmt.currency(totalSpent, currency)}</div>
          </div>
        </div>
        <div class="progress-track" style="height:10px">
          <div class="progress-fill ${totalSpent > totalBudget ? 'over' : totalSpent/totalBudget > 0.8 ? 'warning' : ''}"
            style="width:${Math.min(100, totalBudget > 0 ? Math.round(totalSpent/totalBudget*100) : 0)}%"></div>
        </div>
        <div class="text-sm text-muted mt-2">${fmt.currency(Math.max(0, totalBudget-totalSpent), currency)} remaining</div>
      </div>
      ` : ''}

      <!-- Budget list -->
      <div id="budget-list">
        ${this.renderList(monthBudgets, spent, currency)}
      </div>
    `;

    container.querySelector('#budget-add-btn').addEventListener('click', () => this.showAddModal(container, curMonth));

    this.bindActions(container, spent, currency, curMonth);
  },

  renderList(monthBudgets, spent, currency) {
    if (monthBudgets.length === 0) return `
      <div class="card">
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <div class="empty-title">No budgets set</div>
          <div class="empty-desc">Create a budget to track your category spending</div>
        </div>
      </div>
    `;

    return `<div style="display:flex;flex-direction:column;gap:12px">
      ${monthBudgets.map(b => {
        const info  = getCatInfo(b.category);
        const used  = spent[b.category] || 0;
        const pct   = b.amount > 0 ? Math.min(100, Math.round(used/b.amount*100)) : 0;
        const over  = used > b.amount;
        const warn  = !over && pct >= 80;
        return `
        <div class="budget-card" data-id="${b.id}">
          <div class="budget-header">
            <div class="budget-name">
              <span class="txn-icon ${info.cls}" style="width:32px;height:32px;font-size:14px">${info.emoji}</span>
              ${info.label}
              ${over ? '<span class="badge badge-danger">Over</span>' : warn ? '<span class="badge badge-warning">Near limit</span>' : ''}
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm budget-edit-btn" data-id="${b.id}">Edit</button>
              <button class="btn btn-danger btn-sm budget-del-btn" data-id="${b.id}">Delete</button>
            </div>
          </div>
          <div class="budget-amounts">
            <span>${fmt.currency(used, currency)}</span> of ${fmt.currency(b.amount, currency)}
          </div>
          <div class="progress-track">
            <div class="progress-fill ${over ? 'over' : warn ? 'warning' : ''}" style="width:${pct}%"></div>
          </div>
          <div class="flex-between mt-2">
            <span class="text-sm text-muted">${fmt.currency(Math.max(0, b.amount-used), currency)} left</span>
            <span class="budget-pct ${over ? 'text-danger' : warn ? '' : 'text-muted'}">${pct}%</span>
          </div>
        </div>
        `;
      }).join('')}
    </div>`;
  },

  bindActions(container, spent, currency, curMonth) {
    container.querySelectorAll('.budget-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this budget?')) {
          DB.deleteBudget(btn.dataset.id);
          showToast('Budget deleted');
          this.render(container);
        }
      });
    });
    container.querySelectorAll('.budget-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = DB.getBudgets().find(x => x.id === btn.dataset.id);
        if (b) this.showEditModal(b, container);
      });
    });
  },

  showAddModal(container, curMonth) {
    Modal.show('Set Budget', this.formHTML(null, curMonth), body => {
      this.bindForm(body, null, () => {
        Modal.hide();
        showToast('Budget created ✓');
        this.render(container);
      });
    });
  },

  showEditModal(b, container) {
    Modal.show('Edit Budget', this.formHTML(b, b.month), body => {
      this.bindForm(body, b, () => {
        Modal.hide();
        showToast('Budget updated ✓');
        this.render(container);
      });
    });
  },

  formHTML(b, month) {
    const cats = CATEGORIES.expense;
    return `
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="b-cat">
          ${cats.map(c =>
            `<option value="${c.id}" ${b?.category === c.id ? 'selected':''}>${c.emoji} ${c.label}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Monthly Limit (₹)</label>
        <input class="form-input" type="number" id="b-amount" min="0" step="1"
          value="${b?.amount || ''}" placeholder="e.g. 5000" />
      </div>
      <button class="btn btn-primary btn-full" id="b-save">
        ${b ? 'Update Budget' : 'Create Budget'}
      </button>
    `;
  },

  bindForm(body, existing, onSuccess) {
    body.querySelector('#b-save').addEventListener('click', () => {
      const category = body.querySelector('#b-cat').value;
      const amount   = parseFloat(body.querySelector('#b-amount').value);
      if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

      const month = fmt.monthKey();
      const data  = { category, amount, month };

      if (existing) {
        DB.updateBudget(existing.id, data);
      } else {
        // Check for duplicate
        const dup = DB.getBudgets().find(b => b.category === category && b.month === month);
        if (dup) { showToast('Budget for this category already exists', 'error'); return; }
        DB.addBudget(data);
      }
      onSuccess();
    });
  }
};

window.BudgetsModule = BudgetsModule;
document.addEventListener('DOMContentLoaded', () => {
  Router.register('budgets', BudgetsModule);
});
