// goals.js — Goals Page Module

const GoalsModule = {
  render(container) {
    const profile  = DB.getProfile();
    const currency = profile.currency || '₹';
    const goals    = DB.getGoals();

    const totalTarget = goals.reduce((s,g) => s + g.targetAmount, 0);
    const totalSaved  = goals.reduce((s,g) => s + g.savedAmount, 0);
    const completed   = goals.filter(g => g.savedAmount >= g.targetAmount).length;

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Goals</div>
          <div class="page-subtitle">Track your savings targets</div>
        </div>
        <button class="btn btn-primary btn-sm" id="goal-add-btn">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Goal
        </button>
      </div>

      ${goals.length > 0 ? `
      <div class="grid-3 mb-3">
        <div class="stat-card">
          <div class="stat-label">Total Goals</div>
          <div class="stat-value">${goals.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Saved</div>
          <div class="stat-value positive">${fmt.currency(totalSaved, currency)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Completed</div>
          <div class="stat-value positive">${completed}</div>
        </div>
      </div>
      ` : ''}

      <div id="goals-list">
        ${this.renderList(goals, currency)}
      </div>
    `;

    container.querySelector('#goal-add-btn').addEventListener('click', () => this.showAddModal(container));
    this.bindActions(container, currency);
  },

  renderList(goals, currency) {
    if (goals.length === 0) return `
      <div class="card">
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <div class="empty-title">No goals yet</div>
          <div class="empty-desc">Create a savings goal and watch your progress grow</div>
        </div>
      </div>
    `;

    return `<div class="grid-2">
      ${goals.map(g => {
        const pct  = g.targetAmount > 0 ? Math.min(100, Math.round(g.savedAmount/g.targetAmount*100)) : 0;
        const done = g.savedAmount >= g.targetAmount;
        return `
        <div class="goal-card" data-id="${g.id}">
          <div class="goal-header">
            <div class="goal-emoji">${g.emoji}</div>
            <div class="goal-info">
              <div class="goal-name">${g.name} ${done ? '✅' : ''}</div>
              <div class="goal-target">Target: ${fmt.currency(g.targetAmount, currency)}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <button class="btn btn-ghost btn-sm goal-update-btn" data-id="${g.id}">+</button>
              <button class="btn btn-danger btn-sm goal-del-btn" data-id="${g.id}">✕</button>
            </div>
          </div>

          <div>
            <div class="goal-progress-label">
              <span class="goal-saved">${fmt.currency(g.savedAmount, currency)}</span>
              <span class="goal-pct">${pct}%</span>
            </div>
            <div class="progress-track" style="margin-top:6px">
              <div class="progress-fill ${done ? '' : ''}" style="width:${pct}%;${done?'background:var(--accent)':''}"></div>
            </div>
          </div>

          ${g.deadline ? `
          <div class="text-sm text-muted">
            Deadline: ${fmt.date(g.deadline)}
            ${this.daysLeft(g.deadline)}
          </div>` : ''}
        </div>
        `;
      }).join('')}
    </div>`;
  },

  daysLeft(deadline) {
    const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    if (days < 0) return '<span class="badge badge-danger">Overdue</span>';
    if (days < 7) return `<span class="badge badge-warning">${days}d left</span>`;
    return `<span class="text-muted">${days} days left</span>`;
  },

  bindActions(container, currency) {
    container.querySelectorAll('.goal-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this goal?')) {
          DB.deleteGoal(btn.dataset.id);
          showToast('Goal deleted');
          this.render(container);
        }
      });
    });
    container.querySelectorAll('.goal-update-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = DB.getGoals().find(x => x.id === btn.dataset.id);
        if (g) this.showUpdateModal(g, container, currency);
      });
    });
  },

  showAddModal(container) {
    Modal.show('New Goal', this.addFormHTML(), body => {
      const emojis = ['🏠','✈️','🎓','🚗','💍','📱','💻','🏖️','🏋️','🎯','💰','🌍'];
      let selected = emojis[0];

      // Emoji picker
      body.querySelector('#emoji-grid').innerHTML = emojis.map(e =>
        `<button type="button" class="emoji-btn ${e===selected?'selected':''}" data-emoji="${e}">${e}</button>`
      ).join('');

      body.querySelectorAll('.emoji-btn').forEach(b => {
        b.addEventListener('click', () => {
          selected = b.dataset.emoji;
          body.querySelectorAll('.emoji-btn').forEach(x => x.classList.toggle('selected', x === b));
          body.querySelector('#g-preview-emoji').textContent = selected;
        });
      });

      // Live preview
      ['#g-name'].forEach(id => {
        body.querySelector(id)?.addEventListener('input', e => {
          body.querySelector('#g-preview-name').textContent = e.target.value || 'Goal Name';
        });
      });

      body.querySelector('#g-save').addEventListener('click', () => {
        const name        = body.querySelector('#g-name').value.trim();
        const targetAmount = parseFloat(body.querySelector('#g-target').value);
        const savedAmount  = parseFloat(body.querySelector('#g-saved').value) || 0;
        const deadline    = body.querySelector('#g-deadline').value || null;

        if (!name)           { showToast('Enter a goal name', 'error'); return; }
        if (!targetAmount)   { showToast('Enter target amount', 'error'); return; }

        DB.addGoal({ name, emoji: selected, targetAmount, savedAmount, deadline });
        Modal.hide();
        showToast('Goal created ✓');
        this.render(container);
      });
    });
  },

  showUpdateModal(g, container, currency) {
    Modal.show('Update Progress', `
      <div class="form-group">
        <label class="form-label">Amount Saved So Far (₹)</label>
        <input class="form-input" type="number" id="gup-amount" min="0" step="1"
          value="${g.savedAmount}" placeholder="0" />
        <div class="text-sm text-muted mt-2">Target: ${fmt.currency(g.targetAmount, currency)}</div>
      </div>
      <button class="btn btn-primary btn-full" id="gup-save">Update Progress</button>
    `, body => {
      body.querySelector('#gup-save').addEventListener('click', () => {
        const savedAmount = parseFloat(body.querySelector('#gup-amount').value);
        if (isNaN(savedAmount) || savedAmount < 0) { showToast('Invalid amount', 'error'); return; }
        DB.updateGoal(g.id, { savedAmount });
        Modal.hide();
        showToast('Progress updated ✓');
        this.render(container);
      });
    });
  },

  addFormHTML() {
    return `
      <!-- Emoji picker -->
      <div class="form-group">
        <label class="form-label">Pick an Emoji</label>
        <div class="emoji-grid" id="emoji-grid"></div>
      </div>

      <div class="form-group">
        <label class="form-label">Goal Name</label>
        <input class="form-input" type="text" id="g-name" placeholder="e.g. Emergency Fund" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Target (₹)</label>
          <input class="form-input" type="number" id="g-target" min="1" placeholder="100000" />
        </div>
        <div class="form-group">
          <label class="form-label">Saved So Far (₹)</label>
          <input class="form-input" type="number" id="g-saved" min="0" placeholder="0" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Deadline (optional)</label>
        <input class="form-input" type="date" id="g-deadline" />
      </div>

      <!-- Preview -->
      <div class="card card-sm mb-2" style="background:var(--bg-3)">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Preview</div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:24px" id="g-preview-emoji">🎯</span>
          <div>
            <div style="font-weight:600" id="g-preview-name">Goal Name</div>
            <div style="font-size:12px;color:var(--text-2)">0% complete</div>
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="g-save">Create Goal</button>
    `;
  }
};

window.GoalsModule = GoalsModule;
document.addEventListener('DOMContentLoaded', () => {
  Router.register('goals', GoalsModule);
});
