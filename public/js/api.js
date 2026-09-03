// CivicLens API Configuration
// Replace with your Render Backend URL after deployment (e.g., https://civiclens-backend.onrender.com)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api'; // Relative in production or replace with Render backend URL

const API = {
  // Get Stored Token
  getToken: () => localStorage.getItem('civiclens_token'),

  // Set Auth Data
  setAuth: (token, user, role = 'citizen') => {
    localStorage.setItem('civiclens_token', token);
    localStorage.setItem('civiclens_user', JSON.stringify(user));
    localStorage.setItem('civiclens_role', role);
  },

  // Get Current User
  getUser: () => {
    const user = localStorage.getItem('civiclens_user');
    return user ? JSON.parse(user) : null;
  },

  // Get Current Role
  getRole: () => localStorage.getItem('civiclens_role'),

  // Logout
  logout: () => {
    localStorage.removeItem('civiclens_token');
    localStorage.removeItem('civiclens_user');
    localStorage.removeItem('civiclens_role');
    window.location.href = '/index.html';
  },

  // Generic Request Helper
  request: async (endpoint, method = 'GET', data = null, isFormData = false) => {
    const headers = {};
    const token = API.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      method,
      headers,
    };

    if (data) {
      config.body = isFormData ? data : JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'API request failed');
      }

      return resData;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  // Toast notification helper
  showToast: (message, type = 'info') => {
    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600',
      error: 'bg-rose-600',
      info: 'bg-blue-600',
      warning: 'bg-amber-600',
    };
    const icon = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠',
    };

    toast.className = `fixed bottom-5 right-5 z-50 flex items-center space-x-3 px-5 py-3.5 text-white rounded-xl shadow-2xl transition-all transform translate-y-2 opacity-0 text-sm font-medium ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `<span class="font-bold">${icon[type] || 'ℹ'}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 50);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};
