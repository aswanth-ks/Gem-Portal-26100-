// Thin fetch wrapper for the real gateway (see apps/gateway). Every bidder
// page that used to read a local mock constant now calls one of these
// instead. Requests go to '/api', which vite.config.ts already proxies to
// http://localhost:4000 in dev.

const TOKEN_KEY = 'gem_portal_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, (body && body.error) || `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};

// Officer API. Officers sign in via POST /api/auth/officer-login and get a
// JWT with role 'officer' (same signing as bidders). It is stored under its
// own key so a bidder session and an officer session never overwrite each
// other. No officer secret is ever compiled into this bundle.
const OFFICER_TOKEN_KEY = 'gem_portal_officer_token';

export function getOfficerToken(): string | null {
  return localStorage.getItem(OFFICER_TOKEN_KEY);
}
export function setOfficerToken(token: string): void {
  localStorage.setItem(OFFICER_TOKEN_KEY, token);
}
export function clearOfficerToken(): void {
  localStorage.removeItem(OFFICER_TOKEN_KEY);
}

/**
 * Decodes (does NOT verify — the gateway does that on every request) the
 * stored officer JWT, for display and to skip a pointless round trip when it
 * is plainly missing or expired.
 */
export function getOfficerSession(): { id: string; email: string } | null {
  const token = getOfficerToken();
  if (!token) return null;
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64)) as { sub?: string; role?: string; email?: string; exp?: number };
    if (payload.role !== 'officer' || !payload.sub || !payload.email) return null;
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/** Session gone or not an officer session: drop it and send the user to officer login. */
export function handleOfficerAuthFailure(status: number): void {
  if (status !== 401 && status !== 403) return;
  clearOfficerToken();
  if (!window.location.pathname.startsWith('/officer/login')) {
    window.location.assign('/officer/login?expired=1');
  }
}

export async function officerLogin(email: string, password: string): Promise<{ id: string; email: string; name: string | null }> {
  const res = await fetch('/api/auth/officer-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (body && body.error) || `Request failed (${res.status})`);
  setOfficerToken(body.token);
  return body.officer;
}

async function officerRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getOfficerToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api/officer${path}`, { ...options, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    handleOfficerAuthFailure(res.status);
    throw new ApiError(res.status, (body && body.error) || `Request failed (${res.status})`);
  }
  return body as T;
}

export const officerApi = {
  get: <T>(path: string) => officerRequest<T>(path),
  post: <T>(path: string, data?: unknown) => officerRequest<T>(path, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data?: unknown) => officerRequest<T>(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
  delete: <T>(path: string) => officerRequest<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => officerRequest<T>(path, { method: 'POST', body: form }),
};
