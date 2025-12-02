import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Helper to get token from the correct storage (handles Remember Me feature)
export const getAuthToken = (): string | null => {
  // Check sessionStorage first (for non-remembered sessions), then localStorage
  return sessionStorage.getItem('token') || localStorage.getItem('token');
};

// Request interceptor - add auth token and content type
api.interceptors.request.use(
  (config) => {
    // Don't add token to public auth endpoints (login/register/password reset)
    const isAuthEndpoint = config.url?.includes('/auth/login') ||
                           config.url?.includes('/auth/register') ||
                           config.url?.includes('/auth/forgot-password') ||
                           config.url?.includes('/auth/reset-password');

    if (!isAuthEndpoint) {
      const token = getAuthToken();
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
      // Prevent redirect loop - only redirect if not already on login page
      const isLoginPage = window.location.pathname === '/login';
      const isPublicPage = ['/login', '/forgot-password', '/reset-password', '/apply', '/pricing', '/'].includes(window.location.pathname);

      if (!isLoginPage && !isPublicPage) {
        // Clear tokens from both storages
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        // Clear auth storage to prevent stale state
        localStorage.removeItem('auth-storage');
        sessionStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
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

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),

  // Admin: Impersonate another user
  impersonate: (userId: string) =>
    api.post('/auth/impersonate', { userId }),
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

  getPlatformBreakdown: () =>
    api.get('/dashboard/platform-breakdown'),

  getOrganizationBreakdown: () =>
    api.get('/dashboard/organization-breakdown'),

  getTerritoryBreakdown: () =>
    api.get('/dashboard/territory-breakdown'),

  getMlcAnalytics: () =>
    api.get('/dashboard/mlc-analytics'),

  getBmiAnalytics: () =>
    api.get('/dashboard/bmi-analytics'),
};

export type WriterAssignment = {
  userId: string;
  writerIpiNumber?: string;
  publisherIpiNumber?: string;
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

  queuePayment: (id: string) =>
    api.post(`/statements/${id}/queue-payment`),

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

  // Export methods
  exportCSV: (id: string) => {
    const token = getAuthToken();
    window.open(`${API_URL}/api/statements/${id}/export/csv?token=${token}`, '_blank');
  },

  exportQuickBooks: (id: string) => {
    const token = getAuthToken();
    window.open(`${API_URL}/api/statements/${id}/export/quickbooks?token=${token}`, '_blank');
  },

  exportUnpaidSummary: () => {
    const token = getAuthToken();
    window.open(`${API_URL}/api/statements/export/unpaid-summary?token=${token}`, '_blank');
  },

  // Writer methods - access own statement data
  getMyStatementItems: (id: string) =>
    api.get(`/statements/my/${id}/items`),

  exportMyStatement: (id: string) => {
    const token = getAuthToken();
    window.open(`${API_URL}/api/statements/my/${id}/export?token=${token}`, '_blank');
  },
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

  // Search for writers by name, IPI, or email - used for collaborator linking
  searchWriters: (query: string) =>
    api.get('/users/search-writers', { params: { q: query } }),
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

  // Check if a song title already exists in Manage Placements
  checkDuplicate: (title: string) =>
    api.get('/placements/check-duplicate', { params: { title } }),
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
    placementId?: string;
    tags?: string[];
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', metadata.category);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.visibility) formData.append('visibility', metadata.visibility);
    if (metadata.relatedUserId) formData.append('relatedUserId', metadata.relatedUserId);
    if (metadata.statementId) formData.append('statementId', metadata.statementId);
    if (metadata.placementId) formData.append('placementId', metadata.placementId);
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

// Settings API - Producer Tour Publishers
export const settingsApi = {
  publishers: {
    list: () => api.get('/settings/publishers'),
    create: (data: { ipiNumber: string; publisherName: string; notes?: string }) =>
      api.post('/settings/publishers', data),
    update: (id: string, data: { ipiNumber: string; publisherName: string; notes?: string; isActive?: boolean }) =>
      api.put(`/settings/publishers/${id}`, data),
    delete: (id: string) => api.delete(`/settings/publishers/${id}`),
  },
};

// Payment API - Stripe integration
export const paymentApi = {
  // Get payment/Stripe account status
  getStatus: () => api.get('/payments/status'),

  // Create Stripe onboarding link
  createOnboardingLink: (returnUrl: string, refreshUrl: string) =>
    api.post('/payments/onboard', { returnUrl, refreshUrl }),

  // Get Stripe dashboard link
  getDashboardLink: () => api.post('/payments/dashboard-link'),

  // Get payment history
  getHistory: () => api.get('/payments/history'),
};

// Payout API - Writer withdrawals
export const payoutApi = {
  // Get wallet balance
  getBalance: () => api.get('/payouts/balance'),

  // Request a payout/withdrawal
  requestPayout: (amount: number) => api.post('/payouts/request', { amount }),

  // Get payout request history
  getHistory: () => api.get('/payouts/history'),

  // Get pending payout requests (Admin only)
  getPending: () => api.get('/payouts/pending'),

  // Get all payout requests with optional status filter (Admin only)
  getAll: (status?: string) => api.get('/payouts/all', { params: { status } }),

  // Approve a payout request (Admin only)
  approvePayout: (payoutId: string, adminNotes?: string) =>
    api.post(`/payouts/${payoutId}/approve`, { adminNotes }),

  // Cancel a payout request
  cancelPayout: (payoutId: string) => api.post(`/payouts/${payoutId}/cancel`),
};

// User preferences API
export const preferencesApi = {
  // Update notification preferences
  updatePreferences: (preferences: {
    emailNotificationsEnabled?: boolean;
    statementNotificationsEnabled?: boolean;
    monthlySummaryEnabled?: boolean;
  }) => api.patch('/users/preferences', preferences),
};

// Chat settings API
export const chatSettingsApi = {
  // Get chat settings
  getSettings: () => api.get('/users/chat-settings'),

  // Update chat settings
  updateSettings: (settings: {
    chatSoundEnabled?: boolean;
    chatVisibilityStatus?: 'online' | 'away' | 'invisible' | 'do_not_disturb';
    chatShowOnlineStatus?: boolean;
    chatShowTypingIndicator?: boolean;
    chatMessagePreview?: boolean;
    chatDesktopNotifications?: boolean;
  }) => api.patch('/users/chat-settings', settings),
};

// System settings API (Admin only)
export const systemSettingsApi = {
  // Get system settings
  getSettings: () => api.get('/settings/system'),

  // Update system settings
  updateSettings: (settings: {
    minimumWithdrawalAmount?: number;
  }) => api.patch('/settings/system', settings),
};

// Placement Deal API (Admin only)
export const placementDealApi = {
  // Get all placement deals with optional filters
  getAll: (params?: { status?: string; dealType?: string; search?: string }) =>
    api.get('/placement-deals', { params }),

  // Get a single placement deal by ID
  getById: (id: string) => api.get(`/placement-deals/${id}`),

  // Create a new placement deal
  create: (data: any) => api.post('/placement-deals', data),

  // Update a placement deal
  update: (id: string, data: any) => api.put(`/placement-deals/${id}`, data),

  // Delete a placement deal
  delete: (id: string) => api.delete(`/placement-deals/${id}`),

  // Generate invoice for a deal
  generateInvoice: (id: string) => api.post(`/placement-deals/${id}/generate-invoice`),

  // Create a billing invoice (FEE type) for a placement deal - appears in Billing Hub
  createBillingInvoice: (id: string, data: {
    grossAmount: string | number;
    description?: string;
    billingClientName?: string;
    billingLabelName?: string;
    billingBillToEmail?: string;
    billingBillToContact?: string;
  }) => api.post(`/placement-deals/${id}/create-billing-invoice`, data),

  // Get summary statistics
  getStats: () => api.get('/placement-deals/stats/summary'),
};

// Gamification API - Producer Tour Miles
export const gamificationApi = {
  // Get user gamification stats
  getStats: () => api.get('/gamification/stats'),

  // Get user referral stats
  getReferralStats: () => api.get('/gamification/referral/stats'),

  // Perform daily check-in
  checkIn: () => api.post('/gamification/check-in'),

  // Get leaderboard
  getLeaderboard: (params?: { limit?: number; tier?: string }) =>
    api.get('/gamification/leaderboard', { params }),

  // Get available rewards
  getRewards: () => api.get('/gamification/rewards'),

  // Redeem a reward
  redeemReward: (rewardId: string) => api.post(`/gamification/rewards/${rewardId}/redeem`),

  // Track social share
  trackSocialShare: (platform: string) => api.post('/gamification/social-share', { platform }),

  // Tool Access
  checkToolAccess: (toolId: string) => api.get(`/gamification/tools/${toolId}/access`),
  getUserToolAccess: () => api.get('/gamification/tools/access'),
  getToolReward: (toolId: string) => api.get(`/gamification/tools/${toolId}/reward`),

  // Monthly Payout Access
  checkMonthlyPayoutAccess: () => api.get('/gamification/payout/monthly-access'),

  // Admin Affiliate Management
  getAffiliateStats: () => api.get('/gamification/admin/affiliates/stats'),

  getAffiliates: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get('/gamification/admin/affiliates', { params }),

  getAffiliateDetail: (userId: string) =>
    api.get(`/gamification/admin/affiliates/${userId}`),

  getAffiliateOrders: (params?: { page?: number; limit?: number }) =>
    api.get('/gamification/admin/affiliates/orders', { params }),

  // === BADGE SYSTEM ===
  // Get all available badges
  getBadges: () => api.get('/gamification/badges'),

  // Get user's badge collection with ownership status
  getBadgeCollection: () => api.get('/gamification/badges/collection'),

  // Equip a badge (display on profile)
  equipBadge: (badgeId: string) => api.post(`/gamification/badges/${badgeId}/equip`),

  // Unequip current badge
  unequipBadge: () => api.post('/gamification/badges/unequip'),

  // === BORDER SYSTEM ===
  // Get all available borders
  getBorders: () => api.get('/gamification/borders'),

  // Get user's border collection with ownership status
  getBorderCollection: () => api.get('/gamification/borders/collection'),

  // Equip a border (display on profile)
  equipBorder: (borderId: string) => api.post(`/gamification/borders/${borderId}/equip`),

  // Unequip current border
  unequipBorder: () => api.post('/gamification/borders/unequip'),

  // === CUSTOMIZATIONS (badge + border combined) ===
  // Get current user's equipped customizations
  getCustomizations: () => api.get('/gamification/customizations'),

  // Get another user's equipped customizations
  getUserCustomizations: (userId: string) => api.get(`/gamification/customizations/${userId}`),

  // === ADMIN BADGE/BORDER MANAGEMENT ===
  adminGetBadges: () => api.get('/gamification/admin/badges'),
  adminCreateBadge: (data: any) => api.post('/gamification/admin/badges', data),
  adminUpdateBadge: (badgeId: string, data: any) => api.put(`/gamification/admin/badges/${badgeId}`, data),
  adminDeleteBadge: (badgeId: string) => api.delete(`/gamification/admin/badges/${badgeId}`),
  adminGrantBadge: (badgeId: string, userId: string) =>
    api.post(`/gamification/admin/badges/${badgeId}/grant`, { userId }),

  adminGetBorders: () => api.get('/gamification/admin/borders'),
  adminCreateBorder: (data: any) => api.post('/gamification/admin/borders', data),
  adminUpdateBorder: (borderId: string, data: any) => api.put(`/gamification/admin/borders/${borderId}`, data),
  adminDeleteBorder: (borderId: string) => api.delete(`/gamification/admin/borders/${borderId}`),
  adminGrantBorder: (borderId: string, userId: string) =>
    api.post(`/gamification/admin/borders/${borderId}/grant`, { userId }),

  // === ADMIN TOOL PERMISSIONS ===
  // Get list of available tools
  adminGetAvailableTools: () => api.get('/gamification/admin/tools/available'),

  // Get all tool permissions across users
  adminGetToolPermissions: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    toolId?: string;
    type?: string;
  }) => api.get('/gamification/admin/tools/permissions', { params }),

  // Get a specific user's tool permissions
  adminGetUserTools: (userId: string) => api.get(`/gamification/admin/users/${userId}/tools`),

  // Grant tool access to a user
  adminGrantToolAccess: (userId: string, data: {
    toolId: string;
    reason?: string;
    expiresInDays?: number;
  }) => api.post(`/gamification/admin/users/${userId}/tools/grant`, data),

  // Revoke tool access from a user
  adminRevokeToolAccess: (userId: string, data: {
    toolId?: string;
    permissionId?: string;
  }) => api.post(`/gamification/admin/users/${userId}/tools/revoke`, data),

  // Bulk grant tool access to multiple users
  adminBulkGrantToolAccess: (data: {
    userIds: string[];
    toolId: string;
    reason?: string;
    expiresInDays?: number;
  }) => api.post('/gamification/admin/tools/bulk-grant', data),
};

// Shop API - E-commerce products and orders
export const shopApi = {
  // Products
  getProducts: (params?: {
    status?: string;
    type?: string;
    category?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/shop/products', { params }),

  getProduct: (idOrSlug: string) => api.get(`/shop/products/${idOrSlug}`),

  createProduct: (data: any) => api.post('/shop/products', data),

  updateProduct: (id: string, data: any) => api.put(`/shop/products/${id}`, data),

  deleteProduct: (id: string) => api.delete(`/shop/products/${id}`),

  // Product Variations
  createVariation: (productId: string, data: any) =>
    api.post(`/shop/products/${productId}/variations`, data),

  // Product Files
  addProductFile: (productId: string, data: any) =>
    api.post(`/shop/products/${productId}/files`, data),

  // Categories
  getCategories: () => api.get('/shop/categories'),

  createCategory: (data: any) => api.post('/shop/categories', data),

  // Checkout
  createCheckoutSession: (data: {
    items: Array<{ productId: string; variationId?: string; quantity: number }>;
    email?: string;
    successUrl: string;
    cancelUrl: string;
    couponCode?: string;
  }) => api.post('/shop/checkout', data),

  // Orders
  getOrders: (params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/shop/orders', { params }),

  updateOrderStatus: (orderId: string, status: string) =>
    api.put(`/shop/orders/${orderId}/status`, { status }),

  // Subscriptions
  getSubscriptions: () => api.get('/shop/subscriptions'),

  cancelSubscription: (subscriptionId: string, immediately?: boolean) =>
    api.post(`/shop/subscriptions/${subscriptionId}/cancel`, { immediately }),

  // Coupons
  getCoupons: () => api.get('/shop/coupons'),

  createCoupon: (data: any) => api.post('/shop/coupons', data),

  validateCoupon: (code: string, cartTotal: number) =>
    api.post('/shop/coupons/validate', { code, cartTotal }),

  // Stats
  getShopStats: () => api.get('/shop/stats'),
};

// Session Payout API - Recording session payment requests
export const sessionPayoutApi = {
  // Get the next auto-generated work order number
  getNextWorkOrder: () => api.get('/session-payouts/next-work-order'),

  // Submit a new session payout request
  submit: (data: {
    sessionDate: string;
    workOrderNumber?: string;
    artistName: string;
    songTitles: string;
    startTime: string;
    finishTime: string;
    totalHours: number;
    studioName: string;
    trackingEngineer: string;
    assistantEngineer?: string;
    mixEngineer?: string;
    masteringEngineer?: string;
    sessionNotes?: string;
    masterLink: string;
    sessionFilesLink: string;
    beatStemsLink: string;
    beatLink: string;
    sampleInfo?: string;
    midiPresetsLink?: string;
    studioRateType: string;
    studioRate: number;
    engineerRateType: string;
    engineerRate: number;
    paymentSplit: string;
    depositPaid: number;
    studioCost: number;
    engineerFee: number;
    totalSessionCost: number;
    payoutAmount: number;
    submittedByName: string;
    submittedByEmail?: string;
  }) => api.post('/session-payouts', data),

  // Get session payouts (user: own, admin: all)
  getAll: (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/session-payouts', { params }),

  // Get pending session payouts (admin only - for notifications)
  getPending: () => api.get('/session-payouts/pending'),

  // Get a single session payout
  getById: (id: string) => api.get(`/session-payouts/${id}`),

  // Approve a session payout (admin only)
  approve: (id: string, adminNotes?: string) =>
    api.post(`/session-payouts/${id}/approve`, { adminNotes }),

  // Reject a session payout (admin only)
  reject: (id: string, rejectionReason: string, adminNotes?: string) =>
    api.post(`/session-payouts/${id}/reject`, { rejectionReason, adminNotes }),

  // Process Stripe payment for approved payout (admin only)
  processPayment: (id: string) =>
    api.post(`/session-payouts/${id}/process-payment`),
};

// Tool Permissions API - Admin-managed tool access by role
export const toolPermissionsApi = {
  // Get all tool permissions (admin only)
  getAll: () => api.get('/tool-permissions'),

  // Get permissions for current user (returns tool IDs they can access)
  getUserPermissions: () => api.get('/tool-permissions/user'),

  // Update all tool permissions (admin only)
  updateAll: (permissions: Array<{ toolId: string; toolName: string; roles: string[] }>) =>
    api.put('/tool-permissions', { permissions }),

  // Update a single tool's permissions (admin only)
  updateTool: (toolId: string, roles: string[], toolName?: string) =>
    api.patch(`/tool-permissions/${toolId}`, { roles, toolName }),
};

// Invoice API - Unified billing system
export const invoiceApi = {
  // Get the next auto-generated invoice number
  getNextNumber: () => api.get('/invoices/next-number'),

  // Submit a new invoice
  submit: (data: {
    type: 'SESSION' | 'ADVANCE' | 'FEE';
    grossAmount: number;
    description?: string;
    details?: any;
    placementDealId?: string;
    advanceType?: 'FUTURE_ROYALTY' | 'DEAL_ADVANCE';
    submittedByName?: string;
    submittedByEmail?: string;
  }) => api.post('/invoices', data),

  // Get invoices (user: own, admin: all)
  getAll: (params?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/invoices', { params }),

  // Get pending invoices (admin only - for notifications)
  getPending: () => api.get('/invoices/pending'),

  // Get invoice statistics (admin only)
  getStats: () => api.get('/invoices/stats'),

  // Get a single invoice
  getById: (id: string) => api.get(`/invoices/${id}`),

  // Approve an invoice (admin only)
  approve: (id: string, adminNotes?: string) =>
    api.post(`/invoices/${id}/approve`, { adminNotes }),

  // Reject an invoice (admin only)
  reject: (id: string, rejectionReason: string, adminNotes?: string) =>
    api.post(`/invoices/${id}/reject`, { rejectionReason, adminNotes }),

  // Process Stripe payment for approved invoice (admin only)
  processPayment: (id: string) =>
    api.post(`/invoices/${id}/process-payment`),
};
