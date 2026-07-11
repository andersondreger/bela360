const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function clearSessionAndRedirect() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  window.location.href = '/';
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) return false;

        const json = await res.json();
        if (!json.success || !json.data?.accessToken) return false;

        localStorage.setItem('accessToken', json.data.accessToken);
        localStorage.setItem('refreshToken', json.data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  });

  if (response.status === 401 && !isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(endpoint, options, true);
    }
    clearSessionAndRedirect();
    throw new Error('Sessão expirada');
  }

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message || 'Erro na requisicao');
  }

  return json.data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

// WhatsApp API
export interface WhatsAppStatus {
  connected: boolean;
  state: string;
  connectedAt: string | null;
}

export interface WhatsAppConnectResult {
  instanceName: string;
  qrcode: string;
  status: string;
}

export const whatsappApi = {
  connect: (businessId: string) =>
    api.post<WhatsAppConnectResult>('/whatsapp/connect', { businessId }),

  getStatus: (businessId: string) =>
    api.get<WhatsAppStatus>(`/whatsapp/status/${businessId}`),

  getQRCode: (businessId: string) =>
    api.get<{ qrcode: string }>(`/whatsapp/qrcode/${businessId}`),

  disconnect: (businessId: string) =>
    api.post<{ message: string }>(`/whatsapp/disconnect/${businessId}`),
};

// Analytics API
export interface DashboardStats {
  today: {
    appointments: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    revenue: number;
  };
  week: {
    appointments: number;
    newClients: number;
    revenue: number;
  };
  month: {
    appointments: number;
    newClients: number;
    revenue: number;
    topServices: Array<{ name: string; count: number }>;
  };
  confirmationRate: number;
  averageTicket: number;
}

export interface RevenueReport {
  daily: Array<{ date: string; revenue: number; count: number }>;
}

export interface ServiceReport {
  id: string;
  name: string;
  count: number;
  revenue: number;
}

export interface ProfessionalReport {
  id: string;
  name: string;
  appointments: number;
  revenue: number;
}

export interface RetentionReport {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  newThisMonth: number;
  retentionRate: number;
}

export const analyticsApi = {
  getDashboard: () => api.get<DashboardStats>('/analytics/dashboard'),

  getRevenueReport: (startDate: string, endDate: string) =>
    api.get<RevenueReport>(`/analytics/reports/revenue?startDate=${startDate}&endDate=${endDate}`),

  getServiceReport: (startDate: string, endDate: string) =>
    api.get<ServiceReport[]>(`/analytics/reports/services?startDate=${startDate}&endDate=${endDate}`),

  getProfessionalReport: (startDate: string, endDate: string) =>
    api.get<ProfessionalReport[]>(`/analytics/reports/professionals?startDate=${startDate}&endDate=${endDate}`),

  getRetention: () => api.get<RetentionReport>('/analytics/reports/retention'),

  sendBirthdayMessages: () =>
    api.post<{ sentCount: number }>('/analytics/campaigns/birthday'),

  sendReactivationCampaign: (inactiveDays?: number) =>
    api.post<{ sentCount: number }>('/analytics/campaigns/reactivation', { inactiveDays }),
};

// Messages/Notifications API
export interface MessageStats {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface NotificationSummary {
  todayReminders: number;
  todayConfirmations: number;
  pendingMessages: number;
  recentMessages: Array<{
    id: string;
    clientName: string;
    content: string;
    status: string;
    createdAt: string;
  }>;
}
