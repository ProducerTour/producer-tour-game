import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: any) =>
    api.post('/auth/register', data),

  me: () =>
    api.get('/auth/me'),
};

export const dashboardApi = {
  getSummary: () =>
    api.get('/dashboard/summary'),

  getSongs: (params?: { limit?: number; offset?: number }) =>
    api.get('/dashboard/songs', { params }),

  getTimeline: (params?: { months?: number }) =>
    api.get('/dashboard/timeline', { params }),

  getStats: () =>
    api.get('/dashboard/stats'),
};

export const statementApi = {
  list: (params?: any) =>
    api.get('/statements', { params }),

  get: (id: string) =>
    api.get(`/statements/${id}`),

  upload: (file: File, proType: string) => {
    const formData = new FormData();
    formData.append('statement', file);
    formData.append('proType', proType);
    return api.post('/statements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  publish: (id: string) =>
    api.post(`/statements/${id}/publish`),

  delete: (id: string) =>
    api.delete(`/statements/${id}`),
};

export const userApi = {
  list: (params?: any) =>
    api.get('/users', { params }),

  create: (data: any) =>
    api.post('/users', data),

  update: (id: string, data: any) =>
    api.put(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/users/${id}`),
};

export const opportunityApi = {
  list: (params?: any) =>
    api.get('/opportunities', { params }),

  create: (data: any) =>
    api.post('/opportunities', data),

  update: (id: string, data: any) =>
    api.put(`/opportunities/${id}`, data),

  delete: (id: string) =>
    api.delete(`/opportunities/${id}`),
};

export const applicationApi = {
  submit: (data: any) =>
    api.post('/applications', data),

  list: (params?: any) =>
    api.get('/applications', { params }),

  update: (id: string, data: any) =>
    api.put(`/applications/${id}`, data),
};

export const toolsApi = {
  publishingSimulator: (data: any) =>
    api.post('/tools/publishing-simulator', data),
};
