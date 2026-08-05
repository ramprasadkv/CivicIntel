const Admin = {
  statusChart: null,
  deptChart: null,

  async loadDashboard() {
    try {
      const stats = await apiFetch('/api/admin/dashboard-stats');

      // Update KPI Counter Cards
      document.getElementById('kpiTotal').textContent = stats.total_complaints;
      document.getElementById('kpiPending').textContent = stats.pending_verification;
      document.getElementById('kpiVisit').textContent = stats.site_visit_required;
      document.getElementById('kpiVerified').textContent = stats.verified;
      document.getElementById('kpiResolved').textContent = stats.resolved;
      document.getElementById('kpiFake').textContent = stats.fake_reports;
      document.getElementById('kpiBlacklisted').textContent = stats.blacklisted_users;

      // Render Charts
      this.renderStatusChart(stats);
      this.renderDeptChart(stats.department_stats);

      // Load Blacklist Table
      this.loadBlacklistedUsers();

    } catch (err) {
      showToast('Error loading admin analytics.', 'danger');
    }
  },

  renderStatusChart(stats) {
    const ctx = document.getElementById('statusDoughnutChart').getContext('2d');
    
    if (this.statusChart) {
      this.statusChart.destroy();
    }

    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pending Verification', 'Site Visit Required', 'Verified', 'Resolved', 'Fake Reports'],
        datasets: [{
          data: [
            stats.pending_verification,
            stats.site_visit_required,
            stats.verified,
            stats.resolved,
            stats.fake_reports
          ],
          backgroundColor: [
            '#f59e0b', // Amber
            '#a855f7', // Purple
            '#06b6d4', // Cyan
            '#10b981', // Emerald
            '#ef4444'  // Rose
          ],
          borderWidth: 1,
          borderColor: '#1e293b'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#e2e8f0', font: { family: 'Inter', size: 11 } }
          }
        }
      }
    });
  },

  renderDeptChart(deptStats) {
    const ctx = document.getElementById('deptBarChart').getContext('2d');

    if (this.deptChart) {
      this.deptChart.destroy();
    }

    const labels = deptStats.map(d => d.code);
    const totals = deptStats.map(d => d.total);
    const verifieds = deptStats.map(d => d.verified);
    const fakes = deptStats.map(d => d.fake);

    this.deptChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Reports',
            data: totals,
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: '#6366f1',
            borderWidth: 1
          },
          {
            label: 'Verified',
            data: verifieds,
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: '#10b981',
            borderWidth: 1
          },
          {
            label: 'Fake Reports',
            data: fakes,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: '#ef4444',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#e2e8f0', font: { family: 'Inter', size: 11 } }
          }
        }
      }
    });
  },

  async loadBlacklistedUsers() {
    const tbody = document.getElementById('blacklistTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">Loading audit table...</td></tr>`;

    try {
      const users = await apiFetch('/api/admin/blacklisted-users');
      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No blacklisted users recorded. System is clean.</td></tr>`;
        return;
      }

      tbody.innerHTML = users.map(u => `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${u.name}</strong></td>
          <td>${u.mobile_number}</td>
          <td><span class="badge badge-danger">${u.fake_reports_count}/3 Strikes</span></td>
          <td><span class="badge badge-danger">${u.status}</span></td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-outline-sm btn-success" onclick="Admin.overrideStatus(${u.id}, 'TRUSTED')">
              <i class="fa-solid fa-rotate-left"></i> Restore Trust
            </button>
          </td>
        </tr>
      `).join('');

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--accent-danger);">Failed to load blacklisted users.</td></tr>`;
    }
  },

  async overrideStatus(userId, newStatus) {
    if (!confirm(`Are you sure you want to change user #${userId} status to ${newStatus}?`)) return;

    try {
      await apiFetch(`/api/admin/users/${userId}/override-status?new_status=${newStatus}`, {
        method: 'POST'
      });

      showToast(`User status set to ${newStatus}!`, 'success');
      this.loadDashboard();
    } catch (err) {
      // Handled
    }
  }
};
