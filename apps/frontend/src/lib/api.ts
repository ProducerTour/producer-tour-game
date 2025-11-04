import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Request interceptor - add auth token and content type
api.interceptors.request.use(
  (config) => {
    // Don't add token to public auth endpoints (login/register)
    const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');

    if (!isAuthEndpoint) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Set Content-Type to application/json for non-FormData requests
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
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

  getPaymentStatus: () =>
    api.get('/dashboard/payment-status'),
};

export type WriterAssignment = {
  userId: string;
  ipiNumber?: string;
  splitPercentage: number;
};

export type WriterAssignmentsPayload = Record<string, WriterAssignment[]>;

export const statementApi = {
  getStatements: (params?: any) =>
    api.get('/statements', { params }),

  list: (params?: any) =>
    api.get('/statements', { params }),

  get: (id: string) =>
    api.get(`/statements/${id}`),

  upload: (file: File, proType: string) => {
    const formData = new FormData();
    formData.append('statement', file);
    formData.append('proType', proType);
    return api.post('/statements/upload', formData);
  },

  assignWriters: (id: string, assignments: WriterAssignmentsPayload) =>
    api.post(`/statements/${id}/assign-writers`, { assignments }),

  publish: (id: string) =>
    api.post(`/statements/${id}/publish`),

  delete: (id: string) =>
    api.delete(`/statements/${id}`),

  // Payment processing methods
  getUnpaidStatements: () =>
    api.get('/statements/unpaid'),

  getPaymentSummary: (id: string) =>
    api.get(`/statements/${id}/payment-summary`),

  processPayment: (id: string) =>
    api.post(`/statements/${id}/process-payment`),

  smartAssign: (id: string) =>
    api.post(`/statements/${id}/smart-assign`),
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

  // Spotify integration
  spotifySearch: (query: string, limit: number = 10) =>
    api.post('/tools/spotify/search', { query, limit }),

  spotifyLookupISRC: (isrc: string) =>
    api.post('/tools/spotify/isrc', { isrc }),

  spotifyGetTrack: (trackId: string) =>
    api.get(`/tools/spotify/track/${trackId}`),
};

export const placementApi = {
  list: (params?: any) =>
    api.get('/placements', { params }),

  get: (id: string) =>
    api.get(`/placements/${id}`),

  create: (data: any) =>
    api.post('/placements', data),

  update: (id: string, data: any) =>
    api.put(`/placements/${id}`, data),

  delete: (id: string) =>
    api.delete(`/placements/${id}`),

  getAnalytics: () =>
    api.get('/placements/analytics'),
};

export const creditApi = {
  list: (params?: any) =>
    api.get('/credits', { params }),

  get: (id: string) =>
    api.get(`/credits/${id}`),

  create: (data: any) =>
    api.post('/credits', data),

  update: (id: string, data: any) =>
    api.put(`/credits/${id}`, data),

  delete: (id: string) =>
    api.delete(`/credits/${id}`),
};

export const proSubmissionApi = {
  list: (params?: any) =>
    api.get('/pro-submissions', { params }),

  getLatest: () =>
    api.get('/pro-submissions/latest'),

  get: (id: string) =>
    api.get(`/pro-submissions/${id}`),

  create: (data: any) =>
    api.post('/pro-submissions', data),

  update: (id: string, data: any) =>
    api.put(`/pro-submissions/${id}`, data),

  delete: (id: string) =>
    api.delete(`/pro-submissions/${id}`),
};

export const advanceScenarioApi = {
  list: (params?: any) =>
    api.get('/advance-scenarios', { params }),

  get: (id: string) =>
    api.get(`/advance-scenarios/${id}`),

  calculate: (data: any) =>
    api.post('/advance-scenarios/calculate', data),

  create: (data: any) =>
    api.post('/advance-scenarios', data),

  update: (id: string, data: any) =>
    api.put(`/advance-scenarios/${id}`, data),

  delete: (id: string) =>
    api.delete(`/advance-scenarios/${id}`),
};

export const documentApi = {
  list: (params?: any) =>
    api.get('/documents', { params }),

  get: (id: string) =>
    api.get(`/documents/${id}`),

  upload: (file: File, metadata: {
    category: string;
    description?: string;
    visibility?: string;
    relatedUserId?: string;
    statementId?: string;
    tags?: string[];
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', metadata.category);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.visibility) formData.append('visibility', metadata.visibility);
    if (metadata.relatedUserId) formData.append('relatedUserId', metadata.relatedUserId);
    if (metadata.statementId) formData.append('statementId', metadata.statementId);
    if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags));
    return api.post('/documents/upload', formData);
  },

  download: (id: string) =>
    api.get(`/documents/${id}/download`, { responseType: 'blob' }),

  update: (id: string, data: any) =>
    api.put(`/documents/${id}`, data),

  delete: (id: string) =>
    api.delete(`/documents/${id}`),
};

// Commission settings API
export const commissionApi = {
  getSettings: () => api.get('/commission/settings'),
  getHistory: () => api.get('/commission/settings/history'),
  updateSettings: (data: { commissionRate: number; recipientName: string; description?: string }) =>
    api.put('/commission/settings', data),
};
