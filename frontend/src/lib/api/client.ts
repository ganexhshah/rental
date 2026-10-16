import axios, { AxiosError } from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let upgradePromise: Promise<string | null> | null = null
let loginCooldownUntil = 0

// Helper to ensure we have a valid JWT when calling live backend
async function ensureValidToken(forceRefresh = false): Promise<string | null> {
  const currentToken = localStorage.getItem('rental_auth_token')
  // Valid JWT format has 3 segments separated by dots
  if (!forceRefresh && currentToken && currentToken.split('.').length === 3) {
    return currentToken
  }

  // Prevent spamming /auth/login if recently failed
  if (Date.now() < loginCooldownUntil) {
    return currentToken
  }

  if (!upgradePromise) {
    upgradePromise = (async () => {
      try {
        const res = await axios.post(`${baseURL}/auth/login`, {
          email: 'hello.ganeshshah@gmail.com',
          password: 'G@nesh98',
        })
        const realToken = res.data?.data?.tokens?.access_token || res.data?.tokens?.access_token
        const tenantId = res.data?.data?.tenant?.id || res.data?.tenant?.id
        const user = res.data?.data?.user || res.data?.user
        if (realToken) {
          localStorage.setItem('rental_auth_token', realToken)
          if (tenantId) localStorage.setItem('rental_auth_tenant', tenantId)
          if (user) localStorage.setItem('rental_auth_user', JSON.stringify(user))
          loginCooldownUntil = 0
          return realToken
        }
      } catch (e) {
        // Backend offline or login failed - cooldown for 15 seconds
        loginCooldownUntil = Date.now() + 15000
      } finally {
        upgradePromise = null
      }
      return localStorage.getItem('rental_auth_token')
    })()
  }
  return upgradePromise
}

// Request interceptor for injecting auth token and tenant ID
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // If public auth endpoint, don't inject or wait for token
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register') || config.url?.includes('/public/')) {
      return config
    }

    const token = await ensureValidToken()
    const tenantId = localStorage.getItem('rental_auth_tenant') || 'a84c60b9-47f6-48f5-abdf-29d23989c5b5'

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (tenantId && config.headers) {
      config.headers['X-Tenant-ID'] = tenantId
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // If 401 Unauthorized occurs on a protected endpoint, re-authenticate with backend and retry once
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true
      try {
        const realToken = await ensureValidToken(true)
        const tenantId = localStorage.getItem('rental_auth_tenant') || 'a84c60b9-47f6-48f5-abdf-29d23989c5b5'
        if (realToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${realToken}`
          if (tenantId) originalRequest.headers['X-Tenant-ID'] = tenantId
          return apiClient(originalRequest)
        }
      } catch {
        // Offline or login failed
      }
    }
    return Promise.reject(error)
  }
)

function unwrapResponse<T>(data: any): T {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T
  }
  return data as T
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<T>(url, config)
  return unwrapResponse<T>(response.data)
}

export async function apiPost<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.post<T>(url, body, config)
  return unwrapResponse<T>(response.data)
}

export async function apiPut<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.put<T>(url, body, config)
  return unwrapResponse<T>(response.data)
}

export async function apiPatch<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.patch<T>(url, body, config)
  return unwrapResponse<T>(response.data)
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<T>(url, config)
  return unwrapResponse<T>(response.data)
}

