const Officer = {
  activeReports: [],

  init() {
    const user = Auth.currentUser;
    if (!user) return;

    document.getElementById('officerTitle').textContent = `${user.name}`;
    document.getElementById('officerSub').textContent = `Official Queue Manager | Department: ${user.department_id ? 'Assigned' : 'All Departments'}`;
    
    this.loadQueue();
  },

  async loadQueue() {
    const filter = document.getElementById('officerStatusFilter').value;
    const grid = document.getElementById('officerQueueGrid');
    grid.innerHTML = `<div class="spinner"></div>`;

    try {
      let endpoint = '/api/officer/reports';
      if (filter) endpoint += `?status_filter=${filter}`;

      const reports = await apiFetch(endpoint);
      this.activeReports = reports;

      if (reports.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">No complaints currently in queue for this status.</div>`;
        return;
      }

      grid.innerHTML = reports.map(r => `
        <div class="complaint-card">
          <img src="${r.image_url}" class="complaint-card-img" alt="Evidence">
          <div class="complaint-card-body">
            <div class="complaint-card-header">
              <span class="badge badge-info">${r.department_code}</span>
              <span class="badge badge-${r.status === 'VERIFIED' || r.status === 'RESOLVED' ? 'success' : r.status === 'FAKE_REPORT' ? 'danger' : 'warning'}">${r.status}</span>
            </div>
            
            <div class="complaint-card-title">${r.category}</div>
            
            <div style="font-size:0.8rem; color:var(--text-muted); margin:8px 0; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px;">
              <strong>Citizen:</strong> ${r.citizen_name} (${r.citizen_mobile})<br>
              <strong>Trust Status:</strong> <span class="badge badge-outline">${r.citizen_status}</span>
            </div>

            <p style="font-size:0.8rem; color:var(--text-muted);">${r.user_description.substring(0, 90)}...</p>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:12px; margin-top:12px;">
              <span style="font-size:0.75rem; color:var(--text-dim);"><i class="fa-solid fa-phone"></i> Calls: ${r.verification_logs ? r.verification_logs.length : 0}/3</span>
              <button class="btn btn-primary btn-outline-sm" onclick="Officer.openVerificationModal(${r.id})">
                <i class="fa-solid fa-clipboard-check"></i> Process & Verify
              </button>
            </div>
          </div>
        </div>
      `).join('');

    } catch (err) {
      grid.innerHTML = `<div style="grid-column:1/-1; color:var(--accent-danger);">Error loading department queue.</div>`;
    }
  },

  openVerificationModal(reportId) {
    const report = this.activeReports.find(r => r.id === reportId);
    if (!report) return;

    const modal = document.getElementById('officerModal');
    const body = document.getElementById('officerModalBody');

    const logsHtml = (report.verification_logs || []).map(l => `
      <div style="font-size:0.8rem; background:rgba(0,0,0,0.2); padding:6px 10px; border-radius:4px; margin-bottom:4px;">
        <strong>Call ${l.call_attempt}:</strong> ${l.call_status} (${l.officer_name}) - <em>${l.notes || 'No notes'}</em>
      </div>
    `).join('') || '<p style="font-size:0.8rem; color:var(--text-muted);">No phone call attempts recorded yet.</p>';

    body.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
        <div>
          <img src="${report.image_url}" style="width:100%; border-radius:8px; max-height:280px; object-fit:cover;">
          <div style="margin-top:10px; font-size:0.85rem;">
            <strong>Tracking ID:</strong> ${report.tracking_id}<br>
            <strong>Category:</strong> ${report.category}<br>
            <strong>GPS Location:</strong> ${report.location_address}<br>
            <strong>AI Confidence:</strong> ${(report.ai_confidence * 100).toFixed(0)}%
          </div>
        </div>

        <div>
          <h4>Citizen Contact Details</h4>
          <p style="font-size:0.9rem; margin-bottom:12px;">
            <strong>Name:</strong> ${report.citizen_name}<br>
            <strong>Phone:</strong> <a href="tel:${report.citizen_mobile}" style="color:var(--accent-info);">${report.citizen_mobile}</a><br>
            <strong>Trust Level:</strong> ${report.citizen_status}
          </p>

          <hr style="border-color:var(--border-color); margin:12px 0;">

          <h4><i class="fa-solid fa-phone"></i> Log Verification Call Attempt</h4>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <select id="callAttemptNum" style="width:110px;">
              <option value="1">Call #1</option>
              <option value="2">Call #2</option>
              <option value="3">Call #3</option>
            </select>
            <select id="callStatusVal" style="flex:1;">
              <option value="ANSWERED">Answered & Details Verified</option>
              <option value="UNANSWERED">Unanswered / Ringing</option>
              <option value="BUSY">Line Busy</option>
              <option value="INVALID">Invalid / Disconnected</option>
            </select>
          </div>
          <input type="text" id="callNotes" placeholder="Call notes / summary" style="margin-top:8px; width:100%;">
          <button class="btn btn-primary btn-block margin-top-sm" onclick="Officer.submitCallLog(${report.id})">
            <i class="fa-solid fa-square-plus"></i> Record Call Log
          </button>

          <div style="margin-top:12px;">
            <h5>Call Log History:</h5>
            ${logsHtml}
          </div>
        </div>
      </div>

      <hr style="border-color:var(--border-color); margin:20px 0;">

      <h4><i class="fa-solid fa-gavel"></i> Update Formal Verification Status</h4>
      <p style="font-size:0.8rem; color:var(--text-muted);">Note: Confirming FAKE_REPORT permanently logs a strike against the user account (3 strikes = Blacklisted).</p>
      
      <div style="margin-top:10px;">
        <input type="text" id="statusRemarks" placeholder="Official remarks / reason for status update" style="width:100%; margin-bottom:10px;">
        
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-success" onclick="Officer.changeStatus(${report.id}, 'VERIFIED')"><i class="fa-solid fa-check"></i> Mark VERIFIED</button>
          <button class="btn btn-warning" onclick="Officer.changeStatus(${report.id}, 'SITE_VISIT_REQUIRED')"><i class="fa-solid fa-person-walking-luggage"></i> Site Visit Required</button>
          <button class="btn btn-danger" onclick="Officer.changeStatus(${report.id}, 'FAKE_REPORT')"><i class="fa-solid fa-triangle-exclamation"></i> Flag FAKE REPORT</button>
          <button class="btn btn-primary" onclick="Officer.changeStatus(${report.id}, 'RESOLVED')"><i class="fa-solid fa-circle-check"></i> Mark RESOLVED</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  closeModal() {
    document.getElementById('officerModal').classList.remove('active');
  },

  async submitCallLog(reportId) {
    const attempt = parseInt(document.getElementById('callAttemptNum').value);
    const status = document.getElementById('callStatusVal').value;
    const notes = document.getElementById('callNotes').value;

    try {
      await apiFetch(`/api/officer/reports/${reportId}/log-call`, {
        method: 'POST',
        body: JSON.stringify({
          call_attempt: attempt,
          call_status: status,
          notes: notes
        })
      });

      showToast(`Call attempt ${attempt} logged cleanly!`, 'success');
      this.closeModal();
      this.loadQueue();
    } catch (err) {
      // Toast shown
    }
  },

  async changeStatus(reportId, newStatus) {
    const remarks = document.getElementById('statusRemarks').value;

    if (newStatus === 'FAKE_REPORT') {
      if (!confirm("WARNING: Are you sure you want to flag this complaint as a FAKE REPORT? This will record a official strike against the citizen's profile.")) {
        return;
      }
    }

    try {
      await apiFetch(`/api/officer/reports/${reportId}/update-status`, {
        method: 'POST',
        body: JSON.stringify({
          status: newStatus,
          remarks: remarks || `Status updated to ${newStatus}`
        })
      });

      showToast(`Status updated to ${newStatus}!`, 'success');
      this.closeModal();
      this.loadQueue();
    } catch (err) {
      // Toast shown
    }
  }
};
