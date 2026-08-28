import { getToken } from './auth';

const BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error?.message ?? body?.message ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string }>(
      '/admin/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false,
    ),
  stats: () => request<Record<string, number>>('/admin/stats'),
  users: (q?: string) =>
    request<UserRow[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  setUserStatus: (id: string, status: string) =>
    request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  rules: () => request<RuleRow[]>('/admin/rules'),
  products: () => request<ProductRow[]>('/admin/products'),
  articles: () => request<ArticleRow[]>('/admin/articles'),
  config: () => request<ConfigRow[]>('/admin/config'),
  auditLogs: () => request<AuditRow[]>('/admin/audit-logs'),
};

export interface UserRow {
  id: string;
  email: string;
  status: string;
  entitlement: string;
  country: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}
export interface RuleRow {
  id: string;
  metric: string;
  severity: string;
  active: boolean;
  notify: boolean;
}
export interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  active: boolean;
  priority: number;
}
export interface ArticleRow {
  id: string;
  title: string;
  category: string;
  status: string;
  locale: string;
}
export interface ConfigRow {
  key: string;
  value: unknown;
  version: number;
}
export interface AuditRow {
  id: string;
  actor: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  at: string;
}
