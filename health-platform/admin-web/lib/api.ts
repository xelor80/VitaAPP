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
  createRule: (body: Record<string, unknown>) =>
    request<RuleRow>('/admin/rules', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateRule: (id: string, body: Record<string, unknown>) =>
    request<RuleRow>(`/admin/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteRule: (id: string) =>
    request(`/admin/rules/${id}`, { method: 'DELETE' }),

  products: () => request<ProductRow[]>('/admin/products'),
  createProduct: (body: Record<string, unknown>) =>
    request<ProductRow>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateProduct: (id: string, body: Record<string, unknown>) =>
    request<ProductRow>(`/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteProduct: (id: string) =>
    request(`/admin/products/${id}`, { method: 'DELETE' }),

  articles: () => request<ArticleRow[]>('/admin/articles'),
  createArticle: (body: Record<string, unknown>) =>
    request<ArticleRow>('/admin/articles', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateArticle: (id: string, body: Record<string, unknown>) =>
    request<ArticleRow>(`/admin/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteArticle: (id: string) =>
    request(`/admin/articles/${id}`, { method: 'DELETE' }),

  config: () => request<ConfigRow[]>('/admin/config'),
  putConfig: (key: string, value: unknown) =>
    request<ConfigRow>(`/admin/config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
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
  definition?: unknown;
  contentKey?: unknown;
  scope?: unknown;
}
export interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  active: boolean;
  priority: number;
  manufacturer?: string | null;
  description?: string | null;
  price?: number | null;
  recommendationWeight?: number;
  tags?: string[];
}
export interface ArticleRow {
  id: string;
  title: string;
  category: string;
  status: string;
  locale: string;
  slug?: string;
  body?: string;
  tags?: string[];
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
