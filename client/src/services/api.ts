import { User } from '../types';

export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://civiclens-ez72.onrender.com/api';

export const API = {
  getToken: (): string | null => localStorage.getItem('civiclens_token'),

  setAuth: (token: string, user: User, role: string = 'citizen') => {
    localStorage.setItem('civiclens_token', token);
    localStorage.setItem('civiclens_user', JSON.stringify(user));
    localStorage.setItem('civiclens_role', role);
  },

  getUser: (): User | null => {
    const user = localStorage.getItem('civiclens_user');
    return user ? JSON.parse(user) : null;
  },

  getRole: (): string | null => localStorage.getItem('civiclens_role'),

  logout: () => {
    localStorage.removeItem('civiclens_token');
    localStorage.removeItem('civiclens_user');
    localStorage.removeItem('civiclens_role');
    window.location.href = '/';
  },

  // Ping backend health check to keep Render awake
  pingHealth: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  },

  request: async (endpoint: string, method: string = 'GET', data: any = null, isFormData: boolean = false) => {
    const headers: Record<string, string> = {};
    const token = API.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
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
};
