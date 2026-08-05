const Citizen = {
  selectedFile: null,
  currentAnalysis: null,
  currentCoords: { lat: 12.9716, lng: 77.5946, address: 'Bengaluru Central, Karnataka' },
  map: null,
  mapMarker: null,

  init() {
    const user = Auth.currentUser;
    if (!user) return;

    // Set user headers
    document.getElementById('welcomeUser').textContent = `Welcome, ${user.name}`;
    this.renderTrustBadge(user);

    // Auto-detect GPS
    this.detectGPS();
  },

  renderTrustBadge(user) {
    const box = document.getElementById('trustBadgeBox');
    let badgeClass = 'badge-success';
    let label = 'TRUSTED CITIZEN';
    let icon = 'fa-shield-check';

    if (user.status === 'WARNING') {
      badgeClass = 'badge-warning';
      label = 'WARNING (1 Strike)';
      icon = 'fa-triangle-exclamation';
    } else if (user.status === 'FINAL_WARNING') {
      badgeClass = 'badge-danger';
      label = 'FINAL WARNING (2 Strikes)';
      icon = 'fa-circle-exclamation';
    } else if (user.status === 'BLACKLISTED') {
      badgeClass = 'badge-danger';
      label = 'ACCOUNT BLACKLISTED';
      icon = 'fa-user-slash';
    }

    box.innerHTML = `
      <span class="badge ${badgeClass}" style="font-size:0.85rem; padding:8px 14px;">
        <i class="fa-solid ${icon}"></i> ${label} (${user.fake_reports_count || 0}/3 Strikes)
      </span>
    `;
  },

  switchTab(tabName) {
    document.querySelectorAll('#citizenDashboard .dash-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#citizenDashboard .dash-tab-content').forEach(c => c.classList.remove('active'));

    if (tabName === 'newReport') {
      document.querySelectorAll('#citizenDashboard .dash-tab')[0].classList.add('active');
      document.getElementById('tabNewReport').classList.add('active');
    } else if (tabName === 'track') {
      document.querySelectorAll('#citizenDashboard .dash-tab')[1].classList.add('active');
      document.getElementById('tabTrack').classList.add('active');
    } else if (tabName === 'history') {
      document.querySelectorAll('#citizenDashboard .dash-tab')[2].classList.add('active');
      document.getElementById('tabHistory').classList.add('active');
      this.loadHistory();
    } else if (tabName === 'profile') {
      document.querySelectorAll('#citizenDashboard .dash-tab')[3].classList.add('active');
      document.getElementById('tabProfile').classList.add('active');
      this.loadProfile();
    }
  },

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP)', 'warning');
      return;
    }

    this.selectedFile = file;

    // Render Preview
    const reader = new FileReader();
    reader.onload = (evt) => {
      document.getElementById('previewImg').src = evt.target.result;
      document.getElementById('dropzoneContent').style.display = 'none';
      document.getElementById('imagePreviewBox').style.display = 'block';
      document.getElementById('btnAnalyzeImage').disabled = false;
    };
    reader.readAsDataURL(file);
  },

  resetUpload(e) {
    if (e) e.stopPropagation();
    this.selectedFile = null;
    this.currentAnalysis = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('dropzoneContent').style.display = 'block';
    document.getElementById('imagePreviewBox').style.display = 'none';
    document.getElementById('btnAnalyzeImage').disabled = true;

    document.getElementById('aiResultBox').style.display = 'none';
    document.getElementById('aiPlaceholder').style.display = 'block';
  },

  detectGPS() {
    const statusText = document.getElementById('gpsStatusText');
    statusText.textContent = 'Locating...';

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentCoords.lat = pos.coords.latitude;
          this.currentCoords.lng = pos.coords.longitude;
          this.currentCoords.address = `GPS Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`;

          statusText.className = 'badge badge-success';
          statusText.textContent = 'GPS Verified';
          document.getElementById('locationAddress').value = this.currentCoords.address;
        },
        (err) => {
          statusText.className = 'badge badge-warning';
          statusText.textContent = 'GPS Unavailable (Using Default/Map)';
          document.getElementById('locationAddress').value = this.currentCoords.address;
        },
        { timeout: 8000 }
      );
    } else {
      statusText.className = 'badge badge-warning';
      statusText.textContent = 'Manual Map Selection';
      document.getElementById('locationAddress').value = this.currentCoords.address;
    }
  },

  openMapModal() {
    document.getElementById('mapModal').classList.add('active');
    
    setTimeout(() => {
      if (!this.map) {
        this.map = L.map('leafletMap').setView([this.currentCoords.lat, this.currentCoords.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(this.map);

        this.mapMarker = L.marker([this.currentCoords.lat, this.currentCoords.lng], { draggable: true }).addTo(this.map);
        
        this.map.on('click', (e) => {
          this.mapMarker.setLatLng(e.latlng);
        });
      } else {
        this.map.invalidateSize();
      }
    }, 200);
  },

  closeMapModal() {
    document.getElementById('mapModal').classList.remove('active');
  },

  confirmMapLocation() {
    if (this.mapMarker) {
      const pos = this.mapMarker.getLatLng();
      this.currentCoords.lat = pos.lat;
      this.currentCoords.lng = pos.lng;
      this.currentCoords.address = `Map Selected Pin (Lat: ${pos.lat.toFixed(4)}, Lng: ${pos.lng.toFixed(4)})`;
      document.getElementById('locationAddress').value = this.currentCoords.address;
      
      const statusText = document.getElementById('gpsStatusText');
      statusText.className = 'badge badge-purple';
      statusText.textContent = 'Manual Pin Set';
    }
    this.closeMapModal();
  },

  async analyzeImage() {
    if (!this.selectedFile) {
      showToast('Please select a photo first', 'warning');
      return;
    }

    const loader = document.getElementById('aiLoader');
    const placeholder = document.getElementById('aiPlaceholder');
    const resultBox = document.getElementById('aiResultBox');

    placeholder.style.display = 'none';
    resultBox.style.display = 'none';
    loader.style.display = 'block';

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    try {
      const analysis = await apiFetch('/api/citizen/analyze-image', {
        method: 'POST',
        body: formData
      });

      this.currentAnalysis = analysis;
      loader.style.display = 'none';

      if (!analysis.is_valid_civic_issue) {
        showToast(`Image Rejection: ${analysis.rejection_reason}`, 'danger');
        placeholder.innerHTML = `<div class="badge badge-danger">Image Rejected</div><p style="margin-top:10px;">${analysis.rejection_reason}</p>`;
        placeholder.style.display = 'block';
        return;
      }

      // Populate AI Preview
      document.getElementById('aiDeptBadge').innerHTML = `<i class="fa-solid fa-building"></i> ${analysis.department_name} (${analysis.department_code})`;
      document.getElementById('aiConfidenceBadge').textContent = `AI Confidence: ${(analysis.confidence * 100).toFixed(0)}%`;
      document.getElementById('aiCategory').textContent = analysis.category;
      document.getElementById('aiDescriptionText').textContent = analysis.ai_description;
      document.getElementById('userDescription').value = analysis.ai_description;

      resultBox.style.display = 'block';
      showToast('AI Vision classification completed!', 'success');

    } catch (err) {
      loader.style.display = 'none';
      placeholder.style.display = 'block';
    }
  },

  async submitFinalReport() {
    if (!this.currentAnalysis) {
      showToast('Please run AI analysis first.', 'warning');
      return;
    }

    const userDesc = document.getElementById('userDescription').value;
    if (!userDesc || userDesc.trim().length < 5) {
      showToast('Please provide a valid description of the issue.', 'warning');
      return;
    }

    const payload = {
      temp_image_name: this.currentAnalysis.temp_image_name,
      latitude: this.currentCoords.lat,
      longitude: this.currentCoords.lng,
      location_address: this.currentCoords.address,
      department_code: this.currentAnalysis.department_code,
      category: this.currentAnalysis.category,
      ai_description: this.currentAnalysis.ai_description,
      user_description: userDesc,
      ai_confidence: this.currentAnalysis.confidence
    };

    try {
      const report = await apiFetch('/api/citizen/submit-report', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showToast(`Complaint Submitted! Tracking ID: ${report.tracking_id}`, 'success');
      this.resetUpload();
      
      // Auto switch to tracking view
      this.switchTab('track');
      document.getElementById('trackInput').value = report.tracking_id;
      this.renderTimeline(report);

    } catch (err) {
      // Toast already shown
    }
  },

  async trackById() {
    const id = document.getElementById('trackInput').value.trim();
    if (!id) {
      showToast('Enter a tracking ID to search.', 'warning');
      return;
    }

    try {
      const report = await apiFetch(`/api/citizen/track/${id}`);
      this.renderTimeline(report);
    } catch (err) {
      // Handled
    }
  },

  renderTimeline(report) {
    const container = document.getElementById('trackResultContainer');
    container.style.display = 'block';

    const getStepStatus = (stepName) => {
      const status = report.status;
      if (stepName === 'SUBMITTED') return 'completed';
      if (stepName === 'AI_ANALYSIS') return 'completed';
      if (stepName === 'ROUTED') return 'completed';
      
      if (stepName === 'PENDING') {
        return (status === 'PENDING_VERIFICATION') ? 'active' : 'completed';
      }
      if (stepName === 'CALLS') {
        if (report.verification_logs.length > 0) return 'completed';
        if (status === 'PENDING_VERIFICATION') return 'active';
        return 'completed';
      }
      if (stepName === 'SITE_VISIT') {
        if (status === 'SITE_VISIT_REQUIRED') return 'active';
        if (status === 'VERIFIED' || status === 'RESOLVED' || status === 'FAKE_REPORT') return 'completed';
        return '';
      }
      if (stepName === 'FINAL') {
        if (status === 'VERIFIED') return 'completed';
        if (status === 'RESOLVED') return 'completed';
        if (status === 'FAKE_REPORT') return 'failed';
        return '';
      }
      return '';
    };

    container.innerHTML = `
      <div class="glass-panel" style="padding:20px; border-radius:var(--radius-md);">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
          <div>
            <h2>${report.tracking_id}</h2>
            <span class="badge badge-info">${report.department_name} (${report.department_code})</span>
          </div>
          <div>
            <span class="badge badge-${report.status === 'VERIFIED' || report.status === 'RESOLVED' ? 'success' : report.status === 'FAKE_REPORT' ? 'danger' : 'warning'}" style="font-size:0.9rem; padding:8px 14px;">
              STATUS: ${report.status}
            </span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 220px 1fr; gap:20px; margin-top:20px;">
          <div>
            <img src="${report.image_url}" style="width:100%; border-radius:8px; border:1px solid var(--border-color);">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:8px;">
              <i class="fa-solid fa-location-dot"></i> ${report.location_address || 'GPS verified'}
            </div>
          </div>

          <div>
            <h4>Official Audit Timeline</h4>
            <div class="timeline">
              <div class="timeline-step completed">
                <div class="timeline-title">1. Complaint Submitted</div>
                <div class="timeline-time">${new Date(report.created_at).toLocaleString()}</div>
                <div class="timeline-desc">Registered by ${report.citizen_name}</div>
              </div>

              <div class="timeline-step completed">
                <div class="timeline-title">2. AI Vision Analysis & Department Auto-Routing</div>
                <div class="timeline-desc">Assigned to ${report.department_name} (Confidence: ${(report.ai_confidence*100).toFixed(0)}%)</div>
              </div>

              <div class="timeline-step ${getStepStatus('CALLS')}">
                <div class="timeline-title">3. Department Verification Calls (${report.verification_logs.length}/3 Attempts)</div>
                <div class="timeline-desc">
                  ${report.verification_logs.length > 0 
                    ? report.verification_logs.map(l => `<div>Call ${l.call_attempt}: ${l.call_status} (${l.officer_name})</div>`).join('')
                    : 'Awaiting call attempt by department officer.'}
                </div>
              </div>

              <div class="timeline-step ${getStepStatus('SITE_VISIT')}">
                <div class="timeline-title">4. Physical Site Visit Inspection</div>
                <div class="timeline-desc">Field officer physical site verification if call details are unclear.</div>
              </div>

              <div class="timeline-step ${getStepStatus('FINAL')}">
                <div class="timeline-title">5. Final Status Outcome</div>
                <div class="timeline-desc">Current Official Status: <strong>${report.status}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async loadHistory() {
    const grid = document.getElementById('historyGrid');
    grid.innerHTML = `<div class="spinner"></div>`;

    try {
      const reports = await apiFetch('/api/citizen/my-reports');
      if (reports.length === 0) {
        grid.innerHTML = `<p style="color:var(--text-muted);">You have not submitted any complaints yet.</p>`;
        return;
      }

      grid.innerHTML = reports.map(r => `
        <div class="complaint-card">
          <img src="${r.image_url}" class="complaint-card-img" alt="Report">
          <div class="complaint-card-body">
            <div class="complaint-card-header">
              <span class="badge badge-info">${r.department_code}</span>
              <span class="badge badge-${r.status === 'VERIFIED' || r.status === 'RESOLVED' ? 'success' : r.status === 'FAKE_REPORT' ? 'danger' : 'warning'}">${r.status}</span>
            </div>
            <div class="complaint-card-title">${r.category}</div>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:6px 0;">${r.user_description.substring(0, 90)}...</p>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-dim); border-top:1px solid var(--border-color); padding-top:10px; margin-top:10px;">
              <span>${r.tracking_id}</span>
              <button class="btn btn-outline-sm" onclick="Citizen.quickTrack('${r.tracking_id}')">Track <i class="fa-solid fa-arrow-right"></i></button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      grid.innerHTML = `<p style="color:var(--accent-danger);">Failed to load history.</p>`;
    }
  },

  quickTrack(trackingId) {
    this.switchTab('track');
    document.getElementById('trackInput').value = trackingId;
    this.trackById();
  },

  loadProfile() {
    const user = Auth.currentUser;
    if (!user) return;

    const box = document.getElementById('profileDetailsBox');
    box.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" value="${user.name}" readonly>
        </div>
        <div class="form-group">
          <label>Mobile Number</label>
          <input type="text" value="${user.mobile_number}" readonly>
        </div>
        <div class="form-group">
          <label>Account Role</label>
          <input type="text" value="${user.role}" readonly>
        </div>
        <div class="form-group">
          <label>Account Verification Trust Level</label>
          <input type="text" value="${user.status} (${user.fake_reports_count || 0}/3 Fake Strikes Recorded)" readonly>
        </div>
      </div>
      <div class="glass-panel" style="padding:16px; margin-top:20px; border-left:4px solid var(--accent-info);">
        <h4><i class="fa-solid fa-shield-halved"></i> Anti-Fake Report Policy Notice</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
          Citizens receive up to 3 confirmed fake report strikes. 3 confirmed fake reports lead to permanent account BLACKLISTING from the system to preserve municipal emergency resources.
        </p>
      </div>
    `;
  }
};
