import { User } from '../types';

export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://civiclens-ez72.onrender.com/api';

export type RoleType = 'citizen' | 'subadmin' | 'superadmin';

const getContextRole = (role?: string): RoleType => {
  if (role === 'subadmin' || role === 'superadmin' || role === 'citizen') {
    return role;
  }
  const path = window.location.pathname;
  if (path.startsWith('/superadmin')) return 'superadmin';
  if (path.startsWith('/admin')) return 'subadmin';
  return 'citizen';
};

export const API = {
  setAuth: (token: string, user: User, role: RoleType = 'citizen') => {
    // Isolated role storage key so citizen site and admin consoles remain completely independent
    localStorage.setItem(`civiclens_${role}_token`, token);
    localStorage.setItem(`civiclens_${role}_user`, JSON.stringify(user));
    localStorage.setItem(`civiclens_${role}_role`, role);

    // Also set active generic session for backward compatibility
    localStorage.setItem('civiclens_token', token);
    localStorage.setItem('civiclens_user', JSON.stringify(user));
    localStorage.setItem('civiclens_role', role);
  },

  getToken: (role?: string): string | null => {
    const targetRole = getContextRole(role);
    const roleToken = localStorage.getItem(`civiclens_${targetRole}_token`);
    if (roleToken) return roleToken;

    const genericToken = localStorage.getItem('civiclens_token');
    const genericRole = localStorage.getItem('civiclens_role');
    if (genericToken && genericRole === targetRole) {
      return genericToken;
    }

    return localStorage.getItem('civiclens_superadmin_token') ||
           localStorage.getItem('civiclens_subadmin_token') ||
           localStorage.getItem('civiclens_citizen_token') ||
           null;
  },

  getUser: (role?: string): User | null => {
    const targetRole = getContextRole(role);
    const userStr = localStorage.getItem(`civiclens_${targetRole}_user`);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }

    const genericUser = localStorage.getItem('civiclens_user');
    const genericRole = localStorage.getItem('civiclens_role');
    if (genericUser && genericRole === targetRole) {
      try {
        return JSON.parse(genericUser);
      } catch {
        return null;
      }
    }
    return null;
  },

  getRole: (role?: string): string | null => {
    const targetRole = getContextRole(role);
    const savedRole = localStorage.getItem(`civiclens_${targetRole}_role`);
    if (savedRole) return savedRole;

    const genericRole = localStorage.getItem('civiclens_role');
    if (genericRole === targetRole) return genericRole;
    return null;
  },

  logout: (role?: string) => {
    const targetRole = getContextRole(role);
    localStorage.removeItem(`civiclens_${targetRole}_token`);
    localStorage.removeItem(`civiclens_${targetRole}_user`);
    localStorage.removeItem(`civiclens_${targetRole}_role`);

    if (localStorage.getItem('civiclens_role') === targetRole) {
      localStorage.removeItem('civiclens_token');
      localStorage.removeItem('civiclens_user');
      localStorage.removeItem('civiclens_role');
    }

    if (targetRole === 'superadmin') {
      window.location.href = '/superadmin/login';
    } else if (targetRole === 'subadmin') {
      window.location.href = '/admin/login';
    } else {
      window.location.href = '/';
    }
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

    let targetRole: string | undefined;
    if (endpoint.includes('superadmin') || window.location.pathname.startsWith('/superadmin')) {
      targetRole = 'superadmin';
    } else if (endpoint.includes('subadmin') || endpoint.startsWith('/admin')) {
      targetRole = localStorage.getItem('civiclens_superadmin_token') ? 'superadmin' : 'subadmin';
    }

    const token = API.getToken(targetRole);

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
