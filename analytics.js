// analytics.js — Analytics Page Module

const AnalyticsModule = {
  period: '1m', // 1m | 3m | 6m | 1y
  charts: {},

  render(container) {
    const profile = DB.getProfile();
    const currency = profile.currency || '₹';

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <div class="page-title">Analytics</div>
          <div class="page-subtitle">Understand your spending patterns</div>
        </div>
      </div>

      <!-- Period filter -->
      <div class="filter-bar mb-3">
        <button class="filter-chip ${this.period==='1m'?'active':''}" data-period="1m">This Month</button>
        <button class="filter-chip ${this.period==='3m'?'active':''}" data-period="3m">3 Months</button>
        <button class="filter-chip ${this.period==='6m'?'active':''}" data-period="6m">6 Months</button>
        <button class="filter-chip ${this.period==='1y'?'active':''}" data-period="1y">1 Year</button>
      </div>

      <!-- Stats row -->
      <div class="grid-3 mb-3" id="analytics-stats"></div>

      <!-- Charts -->
      <div class="grid-2 mb-3">
        <div class="card">
          <div class="section-label">Spending by Category</div>
          <div class="chart-wrap" style="height:220px">
            <canvas id="chart-cat"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="section-label">Income vs Expenses</div>
          <div class="chart-wrap" style="height:220px">
            <canvas id="chart-bar"></canvas>
          </div>
        </div>
      </div>

      <!-- Monthly trend -->
      <div class="card mb-3">
        <div class="section-label">Monthly Trend</div>
        <div class="chart-wrap" style="height:200px">
          <canvas id="chart-trend"></canvas>
        </div>
      </div>

      <!-- Category breakdown table -->
      <div class="card">
        <div class="section-label">Category Breakdown</div>
        <div id="cat-table"></div>
      </div>
    `;

    // Period chips
    container.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.period = btn.dataset.period;
        this.render(container);
      });
    });

    this.drawCharts(container, currency);
  },

  getFilteredTxns() {
    const all = DB.getTransactions();
    const now = new Date();
    let from;
    switch(this.period) {
      case '1m': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case '3m': from = new Date(now.getFullYear(), now.getMonth()-2, 1); break;
      case '6m': from = new Date(now.getFullYear(), now.getMonth()-5, 1); break;
      case '1y': from = new Date(now.getFullYear()-1, now.getMonth()+1, 1); break;
    }
    return all.filter(t => new Date(t.date) >= from);
  },

  drawCharts(container, currency) {
    const txns   = this.getFilteredTxns();
    const income  = txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
    const savings = income - expense;

    // Stats
    container.querySelector('#analytics-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total Income</div>
        <div class="stat-value positive">${fmt.currency(income, currency)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Spent</div>
        <div class="stat-value negative">${fmt.currency(expense, currency)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Net Saved</div>
        <div class="stat-value ${savings >= 0 ? 'positive' : 'negative'}">${fmt.currency(savings, currency)}</div>
      </div>
    `;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const tickColor = isDark ? '#555d76' : '#9aa0b5';
    const textColor = isDark ? '#eef0f5' : '#0d0f14';

    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.color = tickColor;

    // Destroy old charts
    Object.values(this.charts).forEach(c => c?.destroy());
    this.charts = {};

    // ── Category Donut ─────────────────────────────────────
    const catMap = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const catEntries = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
    const catColors  = ['#10d98a','#4ea8ff','#a769ff','#ff4182','#ffc107','#ff8a3c','#20c997','#ff6b35'];

    if (catEntries.length > 0) {
      this.charts.cat = new Chart(container.querySelector('#chart-cat'), {
        type: 'doughnut',
        data: {
          labels: catEntries.map(([id]) => getCatInfo(id).label),
          datasets: [{
            data: catEntries.map(([,v]) => v),
            backgroundColor: catColors,
            borderColor: isDark ? '#161921' : '#fff',
            borderWidth: 3,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 12, boxWidth: 12, font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: ctx => ` ${fmt.currency(ctx.parsed, currency)}  (${Math.round(ctx.parsed/expense*100)}%)`
              }
            }
          }
        }
      });
    } else {
      container.querySelector('#chart-cat').parentElement.innerHTML =
        '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No expense data</div></div>';
    }

    // ── Income vs Expense Bar ──────────────────────────────
    this.charts.bar = new Chart(container.querySelector('#chart-bar'), {
      type: 'bar',
      data: {
        labels: ['Income', 'Expenses', 'Savings'],
        datasets: [{
          data: [income, expense, Math.max(0, savings)],
          backgroundColor: ['#10d98a', '#f04c4c', '#4ea8ff'],
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: {
              callback: v => fmt.currency(v, currency),
              maxTicksLimit: 5
            }
          },
          x: { grid: { display: false } }
        }
      }
    });

    // ── Monthly Trend Line ─────────────────────────────────
    const monthData = this.buildMonthData();
    this.charts.trend = new Chart(container.querySelector('#chart-trend'), {
      type: 'line',
      data: {
        labels: monthData.labels,
        datasets: [
          {
            label: 'Income',
            data: monthData.income,
            borderColor: '#10d98a',
            backgroundColor: 'rgba(16,217,138,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2
          },
          {
            label: 'Expenses',
            data: monthData.expense,
            borderColor: '#f04c4c',
            backgroundColor: 'rgba(240,76,76,0.06)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { boxWidth: 12, padding: 16, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y, currency)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { callback: v => fmt.currency(v, currency), maxTicksLimit: 5 }
          },
          x: { grid: { display: false } }
        }
      }
    });

    // ── Category Table ────────────────────────────────────
    const tableWrap = container.querySelector('#cat-table');
    if (catEntries.length === 0) {
      tableWrap.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No data yet</div></div>';
      return;
    }
    tableWrap.innerHTML = catEntries.map(([id, amt], i) => {
      const info = getCatInfo(id);
      const pct  = expense > 0 ? Math.round(amt/expense*100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i>0?'border-top:1px solid var(--border)':''}">
          <div class="txn-icon ${info.cls}">${info.emoji}</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500;margin-bottom:4px">${info.label}</div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:14px;font-weight:700">${fmt.currency(amt, currency)}</div>
            <div style="font-size:12px;color:var(--text-2)">${pct}%</div>
          </div>
        </div>
      `;
    }).join('');
  },

  buildMonthData() {
    const all = DB.getTransactions();
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(fmt.monthKey(d));
    }
    const income  = months.map(m => all.filter(t => t.type==='income'  && t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0));
    const expense = months.map(m => all.filter(t => t.type==='expense' && t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0));
    const labels  = months.map(m => {
      const [y,mo] = m.split('-');
      return new Date(+y, +mo-1, 1).toLocaleDateString('en-IN', { month:'short' });
    });
    return { labels, income, expense };
  }
};

window.AnalyticsModule = AnalyticsModule;
document.addEventListener('DOMContentLoaded', () => {
  Router.register('analytics', AnalyticsModule);
});
