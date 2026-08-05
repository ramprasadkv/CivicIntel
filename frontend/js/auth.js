const Auth = {
  currentUser: null,

  init() {
    const savedUser = localStorage.getItem(CONFIG.USER_KEY);
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    if (savedUser && token) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.logout();
        return;
      }
      this.updateUIForLoggedInUser();
    } else {
      this.updateUIForLoggedOutUser();
    }
  },

  switchTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    if (tabName === 'login') {
      document.querySelectorAll('.auth-tab')[0].classList.add('active');
      document.getElementById('loginForm').classList.add('active');
    } else {
      document.querySelectorAll('.auth-tab')[1].classList.add('active');
      document.getElementById('registerForm').classList.add('active');
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const mobile = document.getElementById('loginMobile').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ mobile_number: mobile, password: password })
      });

      this.saveSession(data.access_token, data.user);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      this.updateUIForLoggedInUser();
    } catch (err) {
      // Toast already shown by apiFetch
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const mobile = document.getElementById('regMobile').value;
    const password = document.getElementById('regPassword').value;

    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name,
          mobile_number: mobile,
          password: password,
          role: 'CITIZEN'
        })
      });

      this.saveSession(data.access_token, data.user);
      showToast('Registration successful!', 'success');
      this.updateUIForLoggedInUser();
    } catch (err) {
      // Toast shown by apiFetch
    }
  },

  async quickLogin(mobile, password) {
    document.getElementById('loginMobile').value = mobile;
    document.getElementById('loginPassword').value = password;
    
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ mobile_number: mobile, password: password })
      });

      this.saveSession(data.access_token, data.user);
      showToast(`Switched account to ${data.user.name} (${data.user.role})`, 'success');
      this.updateUIForLoggedInUser();
    } catch (err) {
      // Error handled
    }
  },

  saveSession(token, user) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    this.currentUser = user;
  },

  logout() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    this.currentUser = null;
    showToast('Logged out successfully.', 'info');
    this.updateUIForLoggedOutUser();
  },

  updateUIForLoggedInUser() {
    const user = this.currentUser;
    const authBox = document.getElementById('authBox');
    
    // Header dropdown / logout
    authBox.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="text-align:right;">
          <div style="font-weight:700; font-size:0.88rem;">${user.name}</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">${user.role} (${user.mobile_number})</div>
        </div>
        <button class="btn btn-outline-sm" onclick="Auth.logout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
      </div>
    `;

    // Hide auth section
    document.getElementById('authSection').classList.remove('active');

    // Show appropriate dashboard based on role
    if (user.role === 'ADMIN') {
      App.showView('adminDashboard');
      Admin.loadDashboard();
    } else if (user.role === 'OFFICER') {
      App.showView('officerDashboard');
      Officer.init();
    } else {
      App.showView('citizenDashboard');
      Citizen.init();
    }
  },

  updateUIForLoggedOutUser() {
    const authBox = document.getElementById('authBox');
    authBox.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted);">Please Sign In</span>`;

    App.showView('authSection');
  }
};
