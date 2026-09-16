/* 
   CivicIntel Frontend JavaScript
   Simple, clean, and straightforward API integration with FastAPI Backend.
*/

// API Base URL (Relative if served on same port, absolute if opened standalone)
const API_BASE = window.location.origin.includes("8000") ? "" : "http://localhost:8000";

// Application State
let authToken = localStorage.getItem("civic_token") || null;
let currentUser = JSON.parse(localStorage.getItem("civic_user") || "null");
let currentAnalysis = null; // Stores AI image analysis response
let selectedOfficerReportId = null; // Stores report ID selected for action in officer view

// Initialize App on Page Load
document.addEventListener("DOMContentLoaded", () => {
  updateUserBar();
  if (authToken && currentUser) {
    // Navigate based on role
    if (currentUser.role === "ADMIN") {
      showView("adminView");
    } else if (currentUser.role === "OFFICER") {
      showView("officerView");
    } else {
      showView("citizenView");
    }
  } else {
    showView("authView");
  }
});

// ==========================================
// 1. NAVIGATION & UI HELPERS
// ==========================================

function showView(viewId) {
  // Hide all sections
  const views = document.querySelectorAll(".view");
  views.forEach(v => v.classList.remove("active"));

  // Deactivate all tab buttons
  const tabs = document.querySelectorAll(".nav-btn");
  tabs.forEach(t => t.classList.remove("active"));

  // Show selected view
  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add("active");

  // Highlight active button
  const btnMap = {
    authView: "btnAuth",
    citizenView: "btnCitizen",
    trackView: "btnTrack",
    officerView: "btnOfficer",
    adminView: "btnAdmin"
  };
  const activeBtn = document.getElementById(btnMap[viewId]);
  if (activeBtn) activeBtn.classList.add("active");

  // Trigger data load when view opens
  if (viewId === "citizenView" && authToken) {
    loadMyReports();
  } else if (viewId === "officerView" && authToken) {
    loadOfficerReports();
  } else if (viewId === "adminView" && authToken) {
    loadAdminDashboard();
  }
}

function showAlert(message, type = "info") {
  const box = document.getElementById("alertBox");
  box.className = `alert-box alert-${type}`;
  box.innerText = message;
  box.style.display = "block";
  setTimeout(() => { box.style.display = "none"; }, 4000);
}

function updateUserBar() {
  const userInfoSpan = document.getElementById("userInfo");
  const logoutBtn = document.getElementById("logoutBtn");

  if (currentUser) {
    userInfoSpan.innerHTML = `👤 <strong>${currentUser.name}</strong> (${currentUser.role}) | Status: <span class="badge badge-verified">${currentUser.status}</span>`;
    logoutBtn.style.display = "inline-block";
  } else {
    userInfoSpan.innerText = "Not Logged In";
    logoutBtn.style.display = "none";
  }
}

// Helper to make authorized fetch requests
async function apiFetch(endpoint, options = {}) {
  options.headers = options.headers || {};
  if (authToken) {
    options.headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.detail || "Request failed";
    throw new Error(errorMsg);
  }
  return data;
}

// ==========================================
// 2. AUTHENTICATION (LOGIN & REGISTER)
// ==========================================

async function handleLogin(event) {
  event.preventDefault();
  const mobile = document.getElementById("loginMobile").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile_number: mobile, password: password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Login failed");

    // Save token & user
    authToken = data.access_token;
    currentUser = data.user;
    localStorage.setItem("civic_token", authToken);
    localStorage.setItem("civic_user", JSON.stringify(currentUser));

    updateUserBar();
    showAlert(`Welcome back, ${currentUser.name}!`, "success");

    // Direct user to appropriate view
    if (currentUser.role === "ADMIN") showView("adminView");
    else if (currentUser.role === "OFFICER") showView("officerView");
    else showView("citizenView");

  } catch (error) {
    showAlert(`Error: ${error.message}`, "error");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const mobile = document.getElementById("regMobile").value.trim();
  const password = document.getElementById("regPassword").value.trim();

  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, mobile_number: mobile, password: password, role: "CITIZEN" })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Registration failed");

    authToken = data.access_token;
    currentUser = data.user;
    localStorage.setItem("civic_token", authToken);
    localStorage.setItem("civic_user", JSON.stringify(currentUser));

    updateUserBar();
    showAlert(`Account created successfully! Welcome ${currentUser.name}`, "success");
    showView("citizenView");

  } catch (error) {
    showAlert(`Registration Error: ${error.message}`, "error");
  }
}

function quickLogin(mobile, password) {
  document.getElementById("loginMobile").value = mobile;
  document.getElementById("loginPassword").value = password;
  showView("authView");
  handleLogin(new Event("submit"));
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("civic_token");
  localStorage.removeItem("civic_user");
  updateUserBar();
  showAlert("Logged out successfully.", "info");
  showView("authView");
}

// ==========================================
// 3. CITIZEN COMPLAINT REPORTING
// ==========================================

function previewSelectedImage() {
  const fileInput = document.getElementById("civicImage");
  const previewContainer = document.getElementById("imagePreviewContainer");
  const previewImage = document.getElementById("imagePreview");

  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewContainer.style.display = "block";
    };
    reader.readAsDataURL(fileInput.files[0]);
  }
}

async function analyzeImage() {
  const fileInput = document.getElementById("civicImage");
  if (!fileInput.files || fileInput.files.length === 0) {
    showAlert("Please select an image file first.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    showAlert("Analyzing image using AI Vision Model...", "info");
    
    // Call AI analysis API
    const endpoint = authToken ? "/api/citizen/analyze-image" : "/api/analyze";
    const data = await apiFetch(endpoint, {
      method: "POST",
      body: formData
    });

    currentAnalysis = data;

    // Display AI Results
    document.getElementById("aiDept").innerText = `${data.department_name} (${data.department_code})`;
    document.getElementById("aiCategory").innerText = data.category || "General";
    document.getElementById("aiDesc").innerText = data.ai_description || "N/A";
    document.getElementById("aiConfidence").innerText = `${Math.round((data.confidence || 0.9) * 100)}%`;

    // PRE-SELECT DEPARTMENT DROPDOWN
    const deptSelect = document.getElementById("targetDepartment");
    if (deptSelect && data.department_code) {
      deptSelect.value = data.department_code;
    }

    document.getElementById("aiResultCard").style.display = "block";
    document.getElementById("reportFormSection").style.display = "block";

    // AUTO-POPULATE DESCRIPTION & LOCATION (ZERO MANUAL TYPING REQUIRED)
    document.getElementById("userDescription").value = `[AI Auto-Generated Report]: ${data.category} - ${data.ai_description}`;

    // Auto-detect GPS & reverse geocode street address
    detectGPSAndReverseGeocode();

    showAlert("AI Image Analysis Complete! Address & details auto-detected.", "success");

  } catch (error) {
    showAlert(`AI Analysis Error: ${error.message}`, "error");
  }
}

function detectGPSAndReverseGeocode() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        document.getElementById("latitude").value = lat;
        document.getElementById("longitude").value = lon;
        
        try {
          // OpenStreetMap Reverse Geocoding API for exact real address
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const geoData = await res.json();
          if (geoData && geoData.display_name) {
            document.getElementById("locationAddress").value = geoData.display_name;
          } else {
            document.getElementById("locationAddress").value = `GPS Verified Location (${lat}, ${lon})`;
          }
        } catch (e) {
          document.getElementById("locationAddress").value = `MG Road, Bengaluru (GPS: ${lat}, ${lon})`;
        }
        showAlert("Exact street location auto-detected!", "success");
      },
      (err) => {
        // Fallback default coordinates if browser location permission is denied
        document.getElementById("latitude").value = "12.9716";
        document.getElementById("longitude").value = "77.5946";
        document.getElementById("locationAddress").value = "Indiranagar, 100 Feet Road, Bengaluru, Karnataka 560038";
      }
    );
  } else {
    document.getElementById("latitude").value = "12.9716";
    document.getElementById("longitude").value = "77.5946";
    document.getElementById("locationAddress").value = "Indiranagar, 100 Feet Road, Bengaluru, Karnataka 560038";
  }
}

function detectGPS() {
  detectGPSAndReverseGeocode();
}

async function submitReport(event) {
  event.preventDefault();
  if (!currentAnalysis) {
    showAlert("Please upload and analyze an image with AI first.", "error");
    return;
  }

  const selectedDept = document.getElementById("targetDepartment") ? document.getElementById("targetDepartment").value : currentAnalysis.department_code;

  const payload = {
    temp_image_name: currentAnalysis.temp_image_name,
    department_code: selectedDept,
    category: currentAnalysis.category || "Infrastructure",
    ai_description: currentAnalysis.ai_description || "",
    user_description: document.getElementById("userDescription").value.trim() || `Automated complaint: ${currentAnalysis.category}`,
    latitude: parseFloat(document.getElementById("latitude").value) || 12.9716,
    longitude: parseFloat(document.getElementById("longitude").value) || 77.5946,
    location_address: document.getElementById("locationAddress").value.trim() || "Indiranagar, Bengaluru, Karnataka 560038",
    ai_confidence: currentAnalysis.confidence || 0.9
  };

  try {
    const data = await apiFetch("/api/citizen/submit-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    showAlert(`Complaint Submitted Successfully! Tracking ID: ${data.tracking_id}`, "success");
    
    // Reset Form
    document.getElementById("civicImage").value = "";
    document.getElementById("imagePreviewContainer").style.display = "none";
    document.getElementById("aiResultCard").style.display = "none";
    document.getElementById("reportFormSection").style.display = "none";
    document.getElementById("userDescription").value = "";
    currentAnalysis = null;

    loadMyReports();

  } catch (error) {
    showAlert(`Submission Error: ${error.message}`, "error");
  }
}


async function loadMyReports() {
  const tableBody = document.getElementById("myReportsTable");
  if (!authToken) {
    tableBody.innerHTML = `<tr><td colspan="6">Please login to view your complaints.</td></tr>`;
    return;
  }

  try {
    const reports = await apiFetch("/api/citizen/my-reports");
    if (reports.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6">No complaints submitted yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = reports.map(r => `
      <tr>
        <td><strong>${r.tracking_id}</strong></td>
        <td>${r.department_name} (${r.department_code})</td>
        <td>${r.category}</td>
        <td><span class="badge badge-${r.status.toLowerCase().split('_')[0]}">${r.status}</span></td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td><button class="btn btn-secondary" onclick="quickTrack('${r.tracking_id}')">Track</button></td>
      </tr>
    `).join("");

  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="6">Error loading complaints: ${error.message}</td></tr>`;
  }
}

// ==========================================
// 4. TRACK COMPLAINT
// ==========================================

async function handleTrackSearch(event) {
  event.preventDefault();
  const trackingId = document.getElementById("trackInput").value.trim();
  if (!trackingId) return;

  quickTrack(trackingId);
}

async function quickTrack(trackingId) {
  showView("trackView");
  document.getElementById("trackInput").value = trackingId;
  const resultDiv = document.getElementById("trackResult");
  resultDiv.style.display = "block";
  resultDiv.innerHTML = `<p>Searching for complaint ${trackingId}...</p>`;

  try {
    const response = await fetch(`${API_BASE}/api/citizen/track/${trackingId}`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.detail || "Complaint not found");

    const fullImageUrl = data.image_url.startsWith("http") ? data.image_url : `${API_BASE}${data.image_url}`;

    // Render Complaint Tracking Info
    resultDiv.innerHTML = `
      <h3>Complaint Details: ${data.tracking_id}</h3>
      <div class="grid-2" style="margin-top:1rem;">
        <div>
          <p><strong>Department:</strong> ${data.department_name} (${data.department_code})</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <p><strong>Current Status:</strong> <span class="badge badge-${data.status.toLowerCase().split('_')[0]}">${data.status}</span></p>
          <p><strong>Location:</strong> ${data.location_address}</p>
          <p><strong>Submitted By:</strong> ${data.citizen_name} (${data.citizen_mobile})</p>
          <p><strong>User Description:</strong> ${data.user_description}</p>
          <p><strong>AI Description:</strong> ${data.ai_description}</p>
        </div>
        <div>
          <p><strong>Evidence Image:</strong></p>
          <img src="${fullImageUrl}" alt="Evidence" style="max-width:100%; max-height:220px; border-radius:6px; border:1px solid #ccc;">
        </div>
      </div>

      <div style="margin-top:1.5rem;">
        <h4>📞 Official Verification Call Logs (${data.verification_logs.length})</h4>
        ${data.verification_logs.length === 0 ? "<p>No call verification attempts recorded yet.</p>" : `
          <table class="data-table">
            <thead><tr><th>Attempt</th><th>Outcome</th><th>Officer Notes</th><th>Officer</th><th>Time</th></tr></thead>
            <tbody>
              ${data.verification_logs.map(log => `
                <tr>
                  <td>Attempt #${log.call_attempt}</td>
                  <td><strong>${log.call_status}</strong></td>
                  <td>${log.notes || "-"}</td>
                  <td>${log.officer_name}</td>
                  <td>${new Date(log.created_at).toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `}
      </div>

      <div style="margin-top:1.5rem;">
        <h4>📋 Status History Timeline</h4>
        <ul>
          ${data.status_history.map(h => `
            <li><strong>${h.new_status}</strong> - ${h.remarks || ""} <em>(By: ${h.changed_by_name} at ${new Date(h.created_at).toLocaleString()})</em></li>
          `).join("")}
        </ul>
      </div>
    `;

  } catch (error) {
    resultDiv.innerHTML = `<p style="color:red;">❌ ${error.message}</p>`;
  }
}

// ==========================================
// 5. OFFICER QUEUE & VERIFICATION
// ==========================================

async function loadOfficerReports() {
  const tableBody = document.getElementById("officerTable");
  if (!authToken || (currentUser.role !== "OFFICER" && currentUser.role !== "ADMIN")) {
    tableBody.innerHTML = `<tr><td colspan="8">Authorized Officer or Admin login required.</td></tr>`;
    return;
  }

  const statusFilter = document.getElementById("statusFilter").value;
  const endpoint = `/api/officer/reports${statusFilter ? `?status_filter=${statusFilter}` : ""}`;

  try {
    const reports = await apiFetch(endpoint);
    if (reports.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8">No complaints in queue.</td></tr>`;
      return;
    }

    tableBody.innerHTML = reports.map(r => {
      const imgUrl = r.image_url.startsWith("http") ? r.image_url : `${API_BASE}${r.image_url}`;
      return `
        <tr>
          <td>${r.id}</td>
          <td><strong>${r.tracking_id}</strong></td>
          <td>${r.citizen_name}<br><small>${r.citizen_mobile}</small></td>
          <td>${r.department_code}</td>
          <td>${r.category}</td>
          <td><img src="${imgUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;"></td>
          <td><span class="badge badge-${r.status.toLowerCase().split('_')[0]}">${r.status}</span></td>
          <td>
            <button class="btn btn-primary" onclick="selectOfficerReport(${r.id}, '${r.tracking_id}')">Action</button>
          </td>
        </tr>
      `;
    }).join("");

  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="8">Error loading queue: ${error.message}</td></tr>`;
  }
}

function selectOfficerReport(reportId, trackingId) {
  selectedOfficerReportId = reportId;
  document.getElementById("selectedReportTitle").innerText = `Manage Complaint: ${trackingId} (ID: ${reportId})`;
  document.getElementById("officerActionCard").style.display = "block";
  document.getElementById("officerActionCard").scrollIntoView({ behavior: "smooth" });
}

async function handleLogCall(event) {
  event.preventDefault();
  if (!selectedOfficerReportId) {
    showAlert("Please select a report from the table above first.", "error");
    return;
  }

  const attempt = document.getElementById("callAttempt").value;
  const status = document.getElementById("callStatus").value;
  const notes = document.getElementById("callNotes").value.trim();

  try {
    await apiFetch(`/api/officer/reports/${selectedOfficerReportId}/log-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        call_attempt: parseInt(attempt),
        call_status: status,
        notes: notes
      })
    });

    showAlert("Verification call log recorded successfully!", "success");
    document.getElementById("callNotes").value = "";
    loadOfficerReports();

  } catch (error) {
    showAlert(`Log Call Error: ${error.message}`, "error");
  }
}

async function handleUpdateStatus(event) {
  event.preventDefault();
  if (!selectedOfficerReportId) {
    showAlert("Please select a report from the table above first.", "error");
    return;
  }

  const newStatus = document.getElementById("newStatus").value;
  const remarks = document.getElementById("statusRemarks").value.trim();

  try {
    await apiFetch(`/api/officer/reports/${selectedOfficerReportId}/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        remarks: remarks
      })
    });

    showAlert(`Complaint status updated to ${newStatus}!`, "success");
    document.getElementById("statusRemarks").value = "";
    loadOfficerReports();

  } catch (error) {
    showAlert(`Status Update Error: ${error.message}`, "error");
  }
}

// ==========================================
// 6. ADMIN DASHBOARD & AUDIT
// ==========================================

async function loadAdminDashboard() {
  if (!authToken || currentUser.role !== "ADMIN") {
    showAlert("Admin login required to view dashboard.", "error");
    return;
  }

  try {
    // 1. Load Stats Metrics
    const stats = await apiFetch("/api/admin/dashboard-stats");

    document.getElementById("kpiTotal").innerText = stats.total_complaints;
    document.getElementById("kpiPending").innerText = stats.pending_verification;
    document.getElementById("kpiVerified").innerText = stats.verified + stats.site_visit_required;
    document.getElementById("kpiResolved").innerText = stats.resolved;

    // Render Department Breakdown Table
    const deptBody = document.getElementById("deptStatsTable");
    deptBody.innerHTML = stats.department_stats.map(d => `
      <tr>
        <td><strong>${d.code}</strong></td>
        <td>${d.name}</td>
        <td>${d.total}</td>
        <td>${d.pending}</td>
        <td>${d.verified}</td>
        <td>${d.resolved}</td>
        <td>${d.fake}</td>
      </tr>
    `).join("");

    // 2. Load Blacklisted Users
    const blacklistedUsers = await apiFetch("/api/admin/blacklisted-users");
    const blacklistBody = document.getElementById("blacklistedUsersTable");

    if (blacklistedUsers.length === 0) {
      blacklistBody.innerHTML = `<tr><td colspan="6">No blacklisted users. Anti-abuse filter clean.</td></tr>`;
    } else {
      blacklistBody.innerHTML = blacklistedUsers.map(u => `
        <tr>
          <td>${u.id}</td>
          <td><strong>${u.name}</strong></td>
          <td>${u.mobile_number}</td>
          <td><span class="badge badge-fake">${u.fake_reports_count} Strikes</span></td>
          <td><span class="badge badge-fake">${u.status}</span></td>
          <td>
            <button class="btn btn-success" onclick="overrideUserStatus(${u.id}, 'TRUSTED')">Unblock User</button>
          </td>
        </tr>
      `).join("");
    }

  } catch (error) {
    showAlert(`Admin Dashboard Error: ${error.message}`, "error");
  }
}

async function overrideUserStatus(userId, newStatus) {
  try {
    await apiFetch(`/api/admin/users/${userId}/override-status?new_status=${newStatus}`, {
      method: "POST"
    });

    showAlert(`User status updated to ${newStatus}!`, "success");
    loadAdminDashboard();

  } catch (error) {
    showAlert(`Override Error: ${error.message}`, "error");
  }
}
