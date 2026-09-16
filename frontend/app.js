/* 
   CivicIntel Frontend JavaScript
   Simple, clean, and straightforward API integration with FastAPI Backend.
*/

// API Base URL (Dynamic host detection with fallback)
const API_BASE = (window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file:")) 
  ? window.location.origin 
  : "http://127.0.0.1:8000";

// Application State
let authToken = localStorage.getItem("civic_token") || null;
let currentUser = JSON.parse(localStorage.getItem("civic_user") || "null");
let currentAnalysis = null; // Stores AI image analysis response
let selectedOfficerReportId = null; // Stores report ID selected for action in officer view

// Initialize App on Page Load
document.addEventListener("DOMContentLoaded", () => {
  updateUserBar();
  if (authToken && currentUser) {
    if (currentUser.role === "ADMIN") {
      showView("adminView");
    } else if (currentUser.role === "OFFICER") {
      showView("officerView");
    } else {
      showView("citizenView");
    }
  } else {
    showView("citizenView"); // Default to Citizen Issue Reporting on initial page load
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
  if (window.alertTimer) clearTimeout(window.alertTimer);
  const duration = (type === "error" || type === "success") ? 10000 : 4000;
  window.alertTimer = setTimeout(() => { box.style.display = "none"; }, duration);
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

  // If body is FormData, delete Content-Type header so browser automatically sets boundary
  if (options.body instanceof FormData) {
    delete options.headers["Content-Type"];
    delete options.headers["content-type"];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);

  if (response.status === 401 && authToken) {
    // Clear stale session
    authToken = null;
    currentUser = null;
    localStorage.removeItem("civic_token");
    localStorage.removeItem("civic_user");
    updateUserBar();
  }

  let data;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (e) {
      data = { detail: "Invalid JSON response from server" };
    }
  } else {
    const text = await response.text();
    data = { detail: text || `HTTP ${response.status} ${response.statusText}` };
  }

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    if (typeof data.detail === "string") {
      errorMsg = data.detail;
    } else if (Array.isArray(data.detail)) {
      errorMsg = data.detail.map(err => `${err.loc ? err.loc.join("->") : ""}: ${err.msg}`).join("; ");
    } else if (data.message) {
      errorMsg = data.message;
    }
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

function togglePasswordVisibility(fieldId, btnElement) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (btnElement) btnElement.innerText = "🙈";
  } else {
    input.type = "password";
    if (btnElement) btnElement.innerText = "👁️";
  }
}

async function handleRegister(event) {
  if (event) event.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const mobile = document.getElementById("regMobile").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const confirmPasswordInput = document.getElementById("regConfirmPassword");
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : password;

  if (password !== confirmPassword) {
    showAlert("Passwords do not match! Please enter matching passwords in both fields.", "error");
    return;
  }

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

function toggleForgotPasswordCard(event) {
  if (event) event.preventDefault();
  const card = document.getElementById("forgotPasswordCard");
  if (card) {
    card.style.display = (card.style.display === "none" || !card.style.display) ? "block" : "none";
  }
}

async function handleResetPassword(event) {
  if (event) event.preventDefault();
  const mobile = document.getElementById("resetMobile").value.trim();
  const newPassword = document.getElementById("resetNewPassword").value.trim();

  if (!mobile || !newPassword) {
    showAlert("Please enter your mobile number and new password.", "error");
    return;
  }

  try {
    const data = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile_number: mobile, new_password: newPassword })
    });

    showAlert(data.message || "Password reset successfully! Please log in with your new password.", "success");
    toggleForgotPasswordCard(null);
    document.getElementById("loginMobile").value = mobile;
    document.getElementById("loginPassword").value = newPassword;
  } catch (err) {
    showAlert(`Reset Failed: ${err.message}`, "error");
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

async function compressImageIfNeeded(file) {
  return new Promise((resolve) => {
    if (!file || file.size < 1 * 1024 * 1024) {
      resolve(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) {
          const resizedFile = new File([blob], file.name || "photo.jpg", { type: "image/jpeg" });
          resolve(resizedFile);
        } else {
          resolve(file);
        }
      }, "image/jpeg", 0.85);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

async function handleSingleClickSubmit(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const fileInput = document.getElementById("civicImage");
  if (!fileInput.files || fileInput.files.length === 0) {
    showAlert("Please select an image file first.", "error");
    return false;
  }

  const btn = document.getElementById("btnSubmitPhoto");
  btn.disabled = true;
  btn.innerText = "⏳ AI Analyzing & Routing Complaint...";

  // Cache preview image data URL before input reset
  const previewImg = document.getElementById("imagePreview");
  const currentPreviewData = previewImg ? previewImg.src : "";

  try {
    showAlert("1. Detecting GPS location & reverse geocoding address...", "info");
    
    // 1. Auto-detect GPS & Street Address with 1.5s max timeout
    let lat = 12.9716, lon = 77.5946;
    let address = "Indiranagar, 100 Feet Road, Bengaluru, Karnataka 560038";

    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("GPS Timeout")), 1500);
          navigator.geolocation.getCurrentPosition(
            (p) => { clearTimeout(timer); resolve(p); },
            (err) => { clearTimeout(timer); reject(err); },
            { timeout: 1500, enableHighAccuracy: false }
          );
        });
        lat = pos.coords.latitude.toFixed(6);
        lon = pos.coords.longitude.toFixed(6);

        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { signal: controller.signal });
        clearTimeout(fetchTimer);
        const geoData = await res.json();
        if (geoData && geoData.display_name) {
          address = geoData.display_name;
        }
      } catch (geoErr) {
        address = `MG Road, Indiranagar, Bengaluru (GPS: ${lat}, ${lon})`;
      }
    }

    showAlert("2. Running AI Vision Analysis & Department Taxonomy Mapping...", "info");

    // 2. Upload and Analyze Image with AI (with client-side optimization & fallback)
    const rawFile = fileInput.files[0];
    const fileToUpload = await compressImageIfNeeded(rawFile);
    const formData = new FormData();
    formData.append("file", fileToUpload);

    let analysis;
    try {
      const analyzeEndpoint = authToken ? "/api/citizen/analyze-image" : "/api/analyze";
      analysis = await apiFetch(analyzeEndpoint, { method: "POST", body: formData });
    } catch (err) {
      if (authToken) {
        authToken = null;
        currentUser = null;
        localStorage.removeItem("civic_token");
        localStorage.removeItem("civic_user");
        updateUserBar();
        analysis = await apiFetch("/api/analyze", { method: "POST", body: formData });
      } else {
        throw err;
      }
    }

    showAlert("3. Creating official complaint record & assigning officers...", "info");

    // 3. Auto-Submit Complaint to Primary & Linked Department
    const submitPayload = {
      temp_image_name: analysis.temp_image_name,
      department_code: analysis.department_code,
      sub_category: analysis.sub_category || "General Maintenance",
      linked_department_code: analysis.linked_department_code || null,
      category: analysis.category || "Civic Issue",
      ai_description: analysis.ai_description || "",
      user_description: `[Automated AI Report]: ${analysis.category} - ${analysis.ai_description}`,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      location_address: address,
      ai_confidence: analysis.confidence || 0.95
    };

    let reportData;
    try {
      const submitEndpoint = authToken ? "/api/citizen/submit-report" : "/api/reports";
      reportData = await apiFetch(submitEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitPayload)
      });
    } catch (err) {
      if (authToken) {
        authToken = null;
        currentUser = null;
        localStorage.removeItem("civic_token");
        localStorage.removeItem("civic_user");
        updateUserBar();
        reportData = await apiFetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitPayload)
        });
      } else {
        throw err;
      }
    }

    // 4. Render Submission Result Card & Display Analyzed Image
    const resImg = document.getElementById("resImageDisplay");
    if (resImg) {
      if (reportData.image_url) {
        resImg.src = reportData.image_url.startsWith("http") ? reportData.image_url : `${API_BASE}${reportData.image_url}`;
      } else {
        resImg.src = currentPreviewData;
      }
    }

    document.getElementById("resTrackingId").innerText = reportData.tracking_id;
    document.getElementById("aiDept").innerText = `${reportData.department_name} (${reportData.department_code})`;
    document.getElementById("aiSubCategory").innerText = reportData.sub_category || analysis.sub_category || "General";
    
    if (reportData.linked_department_code || analysis.linked_department_code) {
      const linkedCode = reportData.linked_department_code || analysis.linked_department_code;
      const linkedName = reportData.linked_department_name || analysis.linked_department_name || linkedCode;
      document.getElementById("aiLinkedDept").innerText = `${linkedName} (${linkedCode})`;
      document.getElementById("linkedDeptRow").style.display = "block";
    } else {
      document.getElementById("linkedDeptRow").style.display = "none";
    }

    document.getElementById("aiAddress").innerText = address;
    document.getElementById("aiDesc").innerText = analysis.ai_description;
    document.getElementById("aiConfidence").innerText = `${Math.round((analysis.confidence || 0.95) * 100)}%`;

    document.getElementById("aiResultCard").style.display = "block";
    document.getElementById("aiResultCard").scrollIntoView({ behavior: "smooth" });

    // Reset upload form fields so user isn't left staring at the raw input
    fileInput.value = "";
    document.getElementById("imagePreviewContainer").style.display = "none";

    showAlert(`🎉 Complaint Submitted & Routed Successfully! Tracking ID: ${reportData.tracking_id}`, "success");

    loadMyReports();

  } catch (error) {
    showAlert(`Submission Error: ${error.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.innerText = "🚀 Submit Photo";
  }
  return false;
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
          <p><strong>Primary Department:</strong> ${data.department_name} (${data.department_code})</p>
          <p><strong>Sub-Category:</strong> ${data.sub_category || "General Maintenance"}</p>
          ${data.linked_department_code ? `<p><strong>Linked Foreign Department:</strong> <span style="color:#d97706; font-weight:600;">${data.linked_department_name || data.linked_department_code} (${data.linked_department_code})</span></p>` : ""}
          <p><strong>Issue Title:</strong> ${data.category}</p>
          <p><strong>Current Status:</strong> <span class="badge badge-${data.status.toLowerCase().split('_')[0]}">${data.status}</span></p>
          <p><strong>Location:</strong> ${data.location_address}</p>
          <p><strong>Submitted By:</strong> ${data.citizen_name} (${data.citizen_mobile})</p>
          <p><strong>AI Custom Description:</strong> ${data.ai_description}</p>
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
