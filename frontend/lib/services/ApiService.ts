/**
 * @file        lib/services/ApiService.ts
 * @description Base HTTP client class for all Groundr API communication.
 *              Every domain service (PropertyService, AuthService, etc.)
 *              extends this class and inherits its request handling.
 *
 *              Responsibilities:
 *                - Injects the Bearer token from localStorage on every request
 *                - Normalises error responses into typed ApiError objects
 *                - Provides typed get/post/put/delete methods
 *                - Reads the API base URL from NEXT_PUBLIC_API_URL env var
 *                  so localhost:8000 is NEVER hardcoded anywhere else
 *
 *              Usage (in a domain service):
 *                class PropertyService extends ApiService {
 *                  async search(q: string) {
 *                    return this.get<SearchResult>('/properties/search', { q })
 *                  }
 *                }
 *
 * @layer       Service Layer (Layer 1)
 * @depends     lib/types/user.ts (for token key constants)
 * @used-by     lib/services/AuthService.ts, lib/services/PropertyService.ts,
 *              lib/services/AnalyticsService.ts, lib/services/FinanceService.ts
 * @author      Groundr Engineering
 * @updated     2026-05-28
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

/** localStorage key for the JWT token */
export const TOKEN_KEY       = 'groundr_token'

/** localStorage key for the active role (set after role-selector) */
export const ACTIVE_ROLE_KEY = 'groundr_active_role'

// ── Error types ───────────────────────────────────────────────────────────────

/**
 * Typed error thrown by ApiService when a request fails.
 * Catch this in components to show user-facing error messages.
 */
export class ApiError extends Error {
  constructor(
    public readonly status:  number,
    public readonly message: string,
    public readonly detail?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** Returns true for auth errors — component should redirect to login */
  get isUnauthorized(): boolean { return this.status === 401 }

  /** Returns true for permission errors */
  get isForbidden(): boolean { return this.status === 403 }

  /** Returns true for not-found errors */
  get isNotFound(): boolean { return this.status === 404 }

  /** Returns true for validation errors */
  get isValidation(): boolean { return this.status === 422 }
}

// ── Query param helper ────────────────────────────────────────────────────────

type QueryParams = Record<string, string | number | boolean | null | undefined>

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${API_BASE}/api${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}

// ── Base service class ────────────────────────────────────────────────────────

export abstract class ApiService {

  /**
   * Reads the JWT token from localStorage.
   * Returns null if not logged in or running server-side.
   */
  protected getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  }

  /**
   * Builds the Authorization header if a token exists.
   */
  protected authHeaders(): HeadersInit {
    const token = this.getToken()
    return token
      ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }

  /**
   * Parses the response and throws a typed ApiError on failure.
   * Extracts FastAPI's `detail` field for user-facing error messages.
   */
  protected async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      // Handle 204 No Content
      if (response.status === 204) return undefined as T
      return response.json() as Promise<T>
    }

    // Try to extract FastAPI error detail
    let detail: unknown
    let message = `Request failed with status ${response.status}`
    try {
      const body = await response.json()
      detail  = body
      message = body.detail ?? message
      // FastAPI validation errors return an array
      if (Array.isArray(body.detail)) {
        message = body.detail.map((e: { msg: string }) => e.msg).join(', ')
      }
    } catch {
      // Body was not JSON — use status text
      message = response.statusText || message
    }

    throw new ApiError(response.status, message, detail)
  }

  // ── HTTP methods ────────────────────────────────────────────────────────────

  protected async get<T>(path: string, params?: QueryParams): Promise<T> {
    const response = await fetch(buildUrl(path, params), {
      method:  'GET',
      headers: this.authHeaders(),
    })
    return this.handleResponse<T>(response)
  }

  protected async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method:  'POST',
      headers: this.authHeaders(),
      body:    body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  protected async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method:  'PUT',
      headers: this.authHeaders(),
      body:    body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  protected async patch<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method:  'PATCH',
      headers: this.authHeaders(),
      body:    body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  protected async delete<T>(path: string): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method:  'DELETE',
      headers: this.authHeaders(),
    })
    return this.handleResponse<T>(response)
  }
}