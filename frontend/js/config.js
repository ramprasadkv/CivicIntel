const CONFIG = {
  API_BASE_URL: window.location.origin.includes('http') ? window.location.origin : 'http://localhost:8000',
  TOKEN_KEY: 'civicintel_token',
  USER_KEY: 'civicintel_user'
};

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'danger') icon = 'fa-triangle-exclamation';
  if (type === 'warning') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  const headers = options.headers || {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  options.headers = headers;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.detail || 'API Request Failed');
    }
    return data;
  } catch (err) {
    showToast(err.message, 'danger');
    throw err;
  }
}
