# Backend Integration Guide for React Tools

This guide shows you how to integrate each tool with your backend API.

## 📋 Table of Contents

1. [Setup API Client](#setup-api-client)
2. [Environment Configuration](#environment-configuration)
3. [Integration Examples](#integration-examples)
4. [Error Handling](#error-handling)
5. [Testing](#testing)

---

## Setup API Client

### Create an API utility file

`/apps/frontend/src/utils/api.ts`

```typescript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = localStorage.getItem('auth_token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API error: ${response.statusText}`);
    }

    return response.json();
  },

  get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
```

---

## Environment Configuration

### Create `.env` file in frontend root

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENVIRONMENT=development
```

### Production `.env.production`

```env
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_ENVIRONMENT=production
```

---

## Integration Examples

### 1. Consultation Form Integration

**Before:**
```typescript
// ConsultationFormPage.tsx (lines ~175-185)
try {
  // TODO: Integrate with backend API
  const response = await fetch('/api/consultations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
```

**After:**
```typescript
import { apiClient } from '../utils/api';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setLoading(true);
  try {
    await apiClient.post('/consultations', formData);
    setSubmitted(true);
    setTimeout(() => navigate('/admin'), 3000);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Submission failed');
  } finally {
    setLoading(false);
  }
};
```

---

### 2. Opportunities Tool Integration

**Replace sample data:**

```typescript
// Before: OpportunitiesToolPage.tsx
const sampleOpportunities: Opportunity[] = [
  { id: '1', title: 'Hip-Hop Beat Production', ... },
  // ... more hardcoded data
];

useEffect(() => {
  const timer = setTimeout(() => {
    setOpportunities(sampleOpportunities);
    setLoading(false);
  }, 500);
  return () => clearTimeout(timer);
}, []);
```

**After:**
```typescript
import { apiClient } from '../utils/api';

useEffect(() => {
  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (genreFilter) params.append('genre', genreFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      
      const data = await apiClient.get(
        `/opportunities?${params.toString()}`
      );
      setOpportunities(data.opportunities);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  fetchOpportunities();
}, [statusFilter, genreFilter, priorityFilter, searchTerm]);
```

---

### 3. Publishing Tracker Integration

**Fetch producer data:**

```typescript
// PublishingTrackerPage.tsx

const [producers, setProducers] = useState<Producer[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchProducers = async () => {
    try {
      const data = await apiClient.get('/producers');
      setProducers(data.producers);
    } catch (err) {
      console.error('Failed to load producers:', err);
      // Keep sample data as fallback
    } finally {
      setLoading(false);
    }
  };

  fetchProducers();
}, []);
```

---

### 4. Royalty Portal Integration

**Fetch user royalty stats:**

```typescript
// RoyaltyPortalPage.tsx

const [stats, setStats] = useState(currentStats);
const [statements, setStatements] = useState<RoyaltyStatement[]>([]);

useEffect(() => {
  const fetchRoyaltyData = async () => {
    try {
      const [statsData, statementsData] = await Promise.all([
        apiClient.get('/royalties/stats'),
        apiClient.get('/royalties/statements'),
      ]);
      
      setStats(statsData);
      setStatements(statementsData.statements);
    } catch (err) {
      console.error('Failed to load royalty data:', err);
    }
  };

  fetchRoyaltyData();
}, []);
```

**Handle withdrawal:**

```typescript
const handleWithdraw = async () => {
  setLoading(true);
  try {
    const result = await apiClient.post('/royalties/withdraw', {
      amount: currentStats.accountBalance,
      method: paymentMethod,
    });
    
    alert('Withdrawal initiated! You will receive funds within 5-7 business days.');
    // Refresh stats
    const updatedStats = await apiClient.get('/royalties/stats');
    setStats(updatedStats);
  } catch (err) {
    alert('Withdrawal failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    setLoading(false);
  }
};
```

---

## Error Handling

### Create Error Boundary Component

`/apps/frontend/src/components/ErrorBoundary.tsx`

```typescript
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-900/20 text-white">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
            <p className="mb-6 text-slate-300">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Testing

### Example: Test Consultation Form

```typescript
// ConsultationFormPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConsultationFormPage from './ConsultationFormPage';
import * as api from '../utils/api';

jest.mock('../utils/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('ConsultationFormPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits form with valid data', async () => {
    (api.apiClient.post as jest.Mock).mockResolvedValue({ success: true });

    render(<ConsultationFormPage />);

    // Fill in form
    fireEvent.change(screen.getByPlaceholderText('Your company name'), {
      target: { value: 'Test Company' },
    });
    // ... fill other fields

    // Submit
    fireEvent.click(screen.getByText('Submit Consultation Request'));

    await waitFor(() => {
      expect(api.apiClient.post).toHaveBeenCalledWith(
        '/consultations',
        expect.any(Object)
      );
    });
  });

  it('shows error on failed submission', async () => {
    (api.apiClient.post as jest.Mock).mockRejectedValue(
      new Error('Server error')
    );

    render(<ConsultationFormPage />);

    // Fill and submit...
    // Check error message
    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
    });
  });
});
```

---

## Common API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "user@example.com"
  },
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is invalid",
    "fields": {
      "email": "Please provide a valid email address"
    }
  }
}
```

---

## Authentication Flow

### 1. Store Token After Login

```typescript
const handleLogin = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  localStorage.setItem('auth_token', response.token);
  // Redirect to dashboard
};
```

### 2. Include Token in All Requests

The `apiClient` already does this automatically (see Setup API Client section)

### 3. Handle Token Expiration

```typescript
apiClient.request = async (endpoint, options = {}) => {
  try {
    return await this.request(endpoint, options);
  } catch (err) {
    if (err.status === 401) {
      // Token expired
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    throw err;
  }
};
```

---

## Performance Tips

1. **Debounce Filters**: Avoid fetching on every filter change
```typescript
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useCallback(
  debounce((term) => fetchOpportunities(term), 500),
  []
);
```

2. **Pagination**: For large datasets
```typescript
const [page, setPage] = useState(1);
const { data, total } = await apiClient.get(
  `/opportunities?page=${page}&limit=20`
);
```

3. **Caching**: Cache non-changing data
```typescript
const [cache, setCache] = useState({});
const getCachedData = (key) => cache[key] || fetch();
```

---

## Deployment Checklist

- [ ] All API endpoints implemented and tested
- [ ] Authentication tokens configured
- [ ] Environment variables set for production
- [ ] Error handling works correctly
- [ ] Loading states display properly
- [ ] Form validation matches backend
- [ ] Rate limiting implemented
- [ ] CORS configured correctly
- [ ] API documentation complete
- [ ] Performance testing passed

---

**Questions?** Check the component implementations in `/apps/frontend/src/pages/`