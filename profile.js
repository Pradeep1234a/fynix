// profile.js — Profile Page Module

const ProfileModule = {
  render(container) {
    const profile  = DB.getProfile();
    const txns     = DB.getTransactions();
    const goals    = DB.getGoals();
    const currency = profile.currency || '₹';

    const totalIncome  = txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
    const totalExpense = txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
    const savings      = totalIncome - totalExpense;
    const savingsRate  = totalIncome > 0 ? Math.round(savings/totalIncome*100) : 0;

    container.innerHTML = `
      <!-- Profile Hero -->
      <div class="profile-hero">
        <div class="profile-avatar">${profile.avatar || '💰'}</div>
        <div style="flex:1">
          <div class="profile-name">${profile.name || 'User'}</div>
          <div class="profile-handle">Personal Finance Tracker</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="edit-profile-btn">Edit</button>
      </div>

      <!-- Stats -->
      <div class="grid-4 mb-3">
        <div class="stat-card">
          <div class="stat-label">Total Earned</div>
          <div class="stat-value positive">${fmt.currency(totalIncome, currency)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Spent</div>
          <div class="stat-value negative">${fmt.currency(totalExpense, currency)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Net Savings</div>
          <div class="stat-value ${savings >= 0 ? 'positive' : 'negative'}">${fmt.currency(savings, currency)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Savings Rate</div>
          <div class="stat-value ${savingsRate >= 0 ? 'positive' : 'negative'}">${savingsRate}%</div>
        </div>
      </div>

      <!-- Quick stats row -->
      <div class="grid-3 mb-3">
        <div class="stat-card">
          <div class="stat-label">Transactions</div>
          <div class="stat-value">${txns.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Goals</div>
          <div class="stat-value">${goals.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Completed Goals</div>
          <div class="stat-value positive">${goals.filter(g => g.savedAmount >= g.targetAmount).length}</div>
        </div>
      </div>

      <!-- Settings list -->
      <div class="section-label mb-2">Settings & Tools</div>
      <div class="settings-list">

        <div class="settings-item" id="export-csv-btn">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span class="settings-item-label">Export Transactions as CSV</span>
          <span class="settings-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>

        <div class="settings-item" id="theme-toggle-btn">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
          <span class="settings-item-label" id="theme-label">Theme: ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'Dark' : 'Light'}</span>
          <span class="settings-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>

        <div class="settings-item" id="clear-data-btn" style="color:var(--danger)">
          <svg viewBox="0 0 24 24" style="color:var(--danger)"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          <span class="settings-item-label">Clear All Data</span>
          <span class="settings-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>

      </div>

      <div class="text-sm text-muted" style="text-align:center;margin-top:32px">
        Fynix v2.0 — Built clean, runs fast
      </div>
    `;

    container.querySelector('#edit-profile-btn').addEventListener('click', () => this.showEditModal(container));
    container.querySelector('#export-csv-btn').addEventListener('click', () => this.exportCSV());
    container.querySelector('#clear-data-btn').addEventListener('click', () => this.clearData(container));
    container.querySelector('#theme-toggle-btn').addEventListener('click', () => {
      document.getElementById('themeToggle').click();
      const newTheme = document.documentElement.getAttribute('data-theme');
      container.querySelector('#theme-label').textContent = `Theme: ${newTheme === 'dark' ? 'Dark' : 'Light'}`;
    });
  },

  showEditModal(container) {
    const profile = DB.getProfile();
    const emojis = ['💰','😊','👤','🦊','🐱','🦁','🐼','🐨','🦋','🌟','🔥','⚡','🎯','🏆'];

    Modal.show('Edit Profile', `
      <div class="form-group">
        <label class="form-label">Avatar</label>
        <div class="emoji-grid" id="avatar-grid">
          ${emojis.map(e =>
            `<button type="button" class="emoji-btn ${e === profile.avatar ? 'selected' : ''}" data-emoji="${e}">${e}</button>`
          ).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Display Name</label>
        <input class="form-input" type="text" id="p-name" value="${profile.name || ''}" placeholder="Your name" />
      </div>
      <div class="form-group">
        <label class="form-label">Currency Symbol</label>
        <select class="form-select" id="p-currency">
          ${['₹','$','€','£','¥','₩','₱'].map(c => `<option ${profile.currency===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-full" id="p-save">Save Profile</button>
    `, body => {
      let selectedAvatar = profile.avatar || '💰';
      body.querySelectorAll('.emoji-btn').forEach(b => {
        b.addEventListener('click', () => {
          selectedAvatar = b.dataset.emoji;
          body.querySelectorAll('.emoji-btn').forEach(x => x.classList.toggle('selected', x === b));
        });
      });
      body.querySelector('#p-save').addEventListener('click', () => {
        const name     = body.querySelector('#p-name').value.trim() || 'User';
        const currency = body.querySelector('#p-currency').value;
        DB.saveProfile({ name, avatar: selectedAvatar, currency });
        Modal.hide();
        showToast('Profile saved ✓');
        this.render(container);
      });
    });
  },

  exportCSV() {
    const txns = DB.getTransactions();
    if (txns.length === 0) { showToast('No transactions to export', 'error'); return; }

    const rows = [
      ['Date', 'Type', 'Category', 'Note', 'Amount', 'Payment Method'],
      ...txns.map(t => [
        t.date,
        t.type,
        getCatInfo(t.category).label,
        `"${(t.note || '').replace(/"/g, '""')}"`,
        t.amount,
        t.paymentMethod || ''
      ])
    ];

    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `fynix-transactions-${fmt.monthKey()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported ✓');
  },

  clearData(container) {
    if (confirm('⚠️ This will delete ALL transactions, budgets, goals, and profile data. Are you sure?')) {
      if (confirm('Last chance — delete everything?')) {
        [DB.KEY_TXN, DB.KEY_BUDGETS, DB.KEY_GOALS, DB.KEY_PROFILE].forEach(k => localStorage.removeItem(k));
        showToast('All data cleared');
        this.render(container);
      }
    }
  }
};

window.ProfileModule = ProfileModule;
document.addEventListener('DOMContentLoaded', () => {
  Router.register('profile', ProfileModule);
  // All modules registered — start the router
  Router.init();
});
