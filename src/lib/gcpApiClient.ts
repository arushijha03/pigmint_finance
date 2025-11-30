const API_BASE_URL = import.meta.env.VITE_PIGMINT_API_BASE_URL || 'https://pigmint-api-gateway-ugzdkpfc7q-uc.a.run.app';

export interface User {
  user_id: string;
  email: string;
  total_saved: number;
}

export interface Goal {
  goal_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
}

export interface Transaction {
  transaction_id: number;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  timestamp: string;
  pigmint_action_total: number;
}

export interface Recommendation {
  id: number;
  title: string;
  message: string;
  category: string;
  created_at: string;
}

export interface CategorySpend {
  category: string;
  total: number;
}

export interface DashboardOverview {
  total_saved: number;
  goals: Goal[];
  latest_recommendation: Recommendation | null;
}

export interface RulesState {
  rules: {
    roundup: {
      is_active: boolean;
      config: Record<string, unknown>;
    };
  };
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error('CORS Error: Unable to connect to backend. Please ensure CORS is enabled on the GCP API Gateway.');
    }
    throw error;
  }
}

export const gcpApi = {
  health: {
    check: () => fetchApi<string>('/ready'),
  },

  user: {
    getMe: () => fetchApi<User>('/api/me'),
  },

  dashboard: {
    getOverview: () => fetchApi<DashboardOverview>('/api/dashboard/overview'),
  },

  transactions: {
    getRecent: (limit: number = 20) =>
      fetchApi<{ transactions: Transaction[] }>(`/api/transactions/recent?limit=${limit}`),

    simulate: (data: {
      amount: number;
      merchant?: string;
      category?: string;
      timestamp?: string;
    }) =>
      fetchApi<{ status: string; message_id: string }>('/api/transactions/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  goals: {
    getAll: () => fetchApi<{ goals: Goal[] }>('/api/goals'),

    create: (data: { name: string; target_amount: number }) =>
      fetchApi<{ goal_id: number; status: string }>('/api/goals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  rules: {
    getAll: () => fetchApi<RulesState>('/api/rules'),

    toggleRoundup: (enabled: boolean) =>
      fetchApi<{ rule: string; enabled: boolean }>('/api/rules/roundup', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      }),
  },

  recommendations: {
    getLatest: () =>
      fetchApi<{ recommendation: Recommendation | null }>('/api/recommendations/latest'),
  },

  spending: {
    getByCategory: (period: 'this_month' | 'this_week' | 'all' = 'this_month') =>
      fetchApi<{ user_id: string; period: string; categories: CategorySpend[] }>(
        `/api/spend/categories?period=${period}`
      ),
  },
};
