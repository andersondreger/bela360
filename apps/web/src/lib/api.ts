const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** Thrown by `request<T>` — carries the HTTP status so callers can special-case
 * things like 402 (premium module locked) without string-matching the message. */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isPremiumLockedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 402;
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
  window.location.href = '/login';
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
    throw new ApiError(json.error?.message || 'Erro na requisicao', response.status);
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

// Business API
export interface BusinessBranding {
  displayName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  whatsappConnected: boolean;
  settings?: { branding?: BusinessBranding; [key: string]: unknown };
}

export const businessApi = {
  getCurrent: () => api.get<Business>('/business'),

  updateBranding: (branding: BusinessBranding) =>
    api.put<Business>('/business', { settings: { branding } }),
};

// Platform plan/coupon API
export type PremiumModule = 'MARKETING' | 'AUTOMATION' | 'LOYALTY' | 'INVENTORY';

export const PREMIUM_MODULE_LABELS: Record<PremiumModule, string> = {
  MARKETING: 'Marketing',
  AUTOMATION: 'Automação',
  LOYALTY: 'Fidelidade',
  INVENTORY: 'Estoque',
};

export interface PlatformBusiness {
  id: string;
  name: string;
  phone: string;
  status: string;
  settings?: { premiumModules?: Partial<Record<PremiumModule, string>>; [key: string]: unknown };
  createdAt: string;
}

export interface PlatformCoupon {
  id: string;
  code: string;
  modules: PremiumModule[];
  durationDays: number;
  targetBusinessId: string | null;
  businessId: string | null;
  redeemedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  business: { id: string; name: string } | null;
}

export const platformApi = {
  listBusinesses: () => api.get<PlatformBusiness[]>('/platform/businesses'),

  listCoupons: () => api.get<PlatformCoupon[]>('/platform/coupons'),

  createCoupon: (data: { modules: PremiumModule[]; durationDays: number; targetBusinessId?: string }) =>
    api.post<PlatformCoupon>('/platform/coupons', data),

  redeemCoupon: (code: string) => api.post<PlatformBusiness>('/platform/coupons/redeem', { code }),
};

// Clients API
export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  preferredProfessionalId?: string | null;
  totalAppointments: number;
  totalSpent: number;
  createdAt: string;
}

export const clientsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<Client[]>(`/clients${qs ? `?${qs}` : ''}`);
  },
  getById: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: { name: string; phone: string; email?: string; birthDate?: string; notes?: string }) =>
    api.post<Client>('/clients', data),
  update: (id: string, data: Partial<{ name: string; phone: string; email: string; notes: string }>) =>
    api.put<Client>(`/clients/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/clients/${id}`),
};

// Services API
export interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  isActive: boolean;
}

export const servicesApi = {
  list: (includeInactive = false) =>
    api.get<Service[]>(`/services${includeInactive ? '?includeInactive=true' : ''}`),
  getById: (id: string) => api.get<Service>(`/services/${id}`),
  create: (data: { name: string; description?: string; duration: number; price: number; professionalIds?: string[] }) =>
    api.post<Service>('/services', data),
  update: (id: string, data: Partial<{ name: string; description: string; duration: number; price: number; isActive: boolean; professionalIds: string[] }>) =>
    api.put<Service>(`/services/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/services/${id}`),
};

// Appointments API
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string | null;
  client?: Client;
  service?: Service;
  professional?: { id: string; name: string };
}

export const appointmentsApi = {
  list: (params?: { startDate?: string; endDate?: string; professionalId?: string; status?: AppointmentStatus }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<Appointment[]>(`/appointments${qs ? `?${qs}` : ''}`);
  },
  today: () => api.get<Appointment[]>('/appointments/today'),
  getById: (id: string) => api.get<Appointment>(`/appointments/${id}`),
  create: (data: { clientId: string; professionalId: string; serviceId: string; startTime: string; notes?: string }) =>
    api.post<Appointment>('/appointments', data),
  update: (id: string, data: Partial<{ professionalId: string; serviceId: string; startTime: string; notes: string; status: AppointmentStatus }>) =>
    api.put<Appointment>(`/appointments/${id}`, data),
  confirm: (id: string) => api.post<Appointment>(`/appointments/${id}/confirm`),
  cancel: (id: string, reason?: string) => api.post<Appointment>(`/appointments/${id}/cancel`, { reason }),
  complete: (id: string) => api.post<Appointment>(`/appointments/${id}/complete`),
  noShow: (id: string) => api.post<Appointment>(`/appointments/${id}/no-show`),
};

// Finance API
export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  discount: number;
  finalAmount: number;
  commissionAmount: number;
  method: string;
  paidAt: string;
  professionalId: string;
}

export const financeApi = {
  getReport: (startDate?: string, endDate?: string) => {
    const qs = new URLSearchParams({ ...(startDate && { startDate }), ...(endDate && { endDate }) }).toString();
    return api.get<any>(`/finance/report${qs ? `?${qs}` : ''}`);
  },
  listPayments: (params?: { startDate?: string; endDate?: string; professionalId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<Payment[]>(`/finance/payments${qs ? `?${qs}` : ''}`);
  },
  registerPayment: (data: { appointmentId: string; amount: number; discount?: number; method: string; notes?: string }) =>
    api.post<Payment>('/finance/payments', data),
  getCashRegister: (date?: string) => api.get<any>(`/finance/cash-register${date ? `?date=${date}` : ''}`),
  closeCashRegister: (date: string, notes?: string) => api.post<any>('/finance/cash-register/close', { date, notes }),
  myCommissions: (startDate?: string, endDate?: string) => {
    const qs = new URLSearchParams({ ...(startDate && { startDate }), ...(endDate && { endDate }) }).toString();
    return api.get<any>(`/finance/my/commissions${qs ? `?${qs}` : ''}`);
  },
};

// Loyalty API (premium module — expect isPremiumLockedError on a básico plan)
export const loyaltyApi = {
  getProgram: () => api.get<any>('/loyalty/program'),
  saveProgram: (data: Record<string, unknown>) => api.post<any>('/loyalty/program', data),
  getClientPoints: (clientId: string) => api.get<any>(`/loyalty/clients/${clientId}/points`),
  addPoints: (clientId: string, data: { amount: number; appointmentId?: string; description?: string }) =>
    api.post<any>(`/loyalty/clients/${clientId}/points/add`, data),
  listRewards: () => api.get<any[]>('/loyalty/rewards'),
  createReward: (data: Record<string, unknown>) => api.post<any>('/loyalty/rewards', data),
  redeem: (clientId: string, rewardId: string) => api.post<any>(`/loyalty/clients/${clientId}/redeem/${rewardId}`),
  getStats: () => api.get<any>('/loyalty/stats'),
};

// Inventory API (premium module — expect isPremiumLockedError on a básico plan)
export const inventoryApi = {
  listProducts: (params?: { category?: string; lowStock?: boolean; search?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<any[]>(`/inventory/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id: string) => api.get<any>(`/inventory/products/${id}`),
  createProduct: (data: Record<string, unknown>) => api.post<any>('/inventory/products', data),
  updateProduct: (id: string, data: Record<string, unknown>) => api.put<any>(`/inventory/products/${id}`, data),
  registerMovement: (id: string, data: { type: string; quantity: number; unitCost?: number; notes?: string }) =>
    api.post<any>(`/inventory/products/${id}/movement`, data),
  lowStockAlerts: () => api.get<any>('/inventory/alerts/low-stock'),
  getStats: () => api.get<any>('/inventory/stats'),
  listMovements: (params?: { productId?: string; type?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<any[]>(`/inventory/movements${qs ? `?${qs}` : ''}`);
  },
};

// Marketing API (premium module — expect isPremiumLockedError on a básico plan)
export const marketingApi = {
  listCampaigns: (status?: string) => api.get<any[]>(`/marketing/campaigns${status ? `?status=${status}` : ''}`),
  getCampaignStats: () => api.get<any>('/marketing/campaigns/stats'),
  createCampaign: (data: Record<string, unknown>) => api.post<any>('/marketing/campaigns', data),
  startCampaign: (id: string) => api.post<any>(`/marketing/campaigns/${id}/start`),
  deleteCampaign: (id: string) => api.delete<{ message: string }>(`/marketing/campaigns/${id}`),
  listRatings: () => api.get<any[]>('/marketing/ratings'),
  getRatingStats: () => api.get<any>('/marketing/ratings/stats'),
  getSegments: () => api.get<any>('/marketing/segments'),
  getSuggestions: () => api.get<any[]>('/marketing/suggestions'),
  generateSuggestions: () => api.post<{ message: string }>('/marketing/suggestions/generate'),
  getIdleSlots: () => api.get<any[]>('/marketing/idle-slots'),
  listTemplates: (category?: string) => api.get<any[]>(`/marketing/templates${category ? `?category=${category}` : ''}`),
  createTemplate: (data: Record<string, unknown>) => api.post<any>('/marketing/templates', data),
};

// Automation API (premium module — expect isPremiumLockedError on a básico plan)
export const automationApi = {
  getStats: () => api.get<any>('/automation/stats'),
  list: () => api.get<any[]>('/automation'),
  create: (data: Record<string, unknown>) => api.post<any>('/automation', data),
  update: (id: string, data: Record<string, unknown>) => api.put<any>(`/automation/${id}`, data),
  toggle: (id: string) => api.post<any>(`/automation/${id}/toggle`),
  delete: (id: string) => api.delete<{ message: string }>(`/automation/${id}`),
};

// Waitlist API
export const waitlistApi = {
  getStats: () => api.get<any>('/waitlist/stats'),
  list: (params?: { date?: string; status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<any[]>(`/waitlist${qs ? `?${qs}` : ''}`);
  },
  create: (data: { clientId: string; serviceId: string; professionalId?: string; desiredDate: string; desiredPeriod?: string }) =>
    api.post<any>('/waitlist', data),
  delete: (id: string) => api.delete<{ message: string }>(`/waitlist/${id}`),
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
  connect: () => api.post<WhatsAppConnectResult>('/whatsapp/connect'),

  getStatus: () => api.get<WhatsAppStatus>('/whatsapp/status'),

  getQRCode: () => api.get<{ qrcode: string }>('/whatsapp/qrcode'),

  disconnect: () => api.post<{ message: string }>('/whatsapp/disconnect'),
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
