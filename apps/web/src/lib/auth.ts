const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface CurrentUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  business: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    whatsappConnected: boolean;
  };
}

export function getStoredRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userRole');
}

export function homePathForRole(role: string | null): string {
  return role === 'PROFESSIONAL' ? '/profissional/meu-painel' : '/dashboard';
}

/** Validates the stored session against the API. Clears storage on failure. */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userRole');
      return null;
    }

    const json = await res.json();
    return json.data as CurrentUser;
  } catch {
    return null;
  }
}

export async function logout() {
  if (typeof window === 'undefined') return;

  const token = localStorage.getItem('accessToken');
  try {
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // ignore network errors on logout
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  }
}
