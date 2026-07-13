const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type ApiResponse<T> = { success: boolean; message: string; data: T };

async function fetchWithToken<T>(
  path: string,
  init: RequestInit,
  token: string | null,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  let response = await fetchWithToken<T>(path, init, token);

  // If 401 and we have a refresh token, try to refresh once
  if (response.status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshResponse.ok) {
          const refreshBody = (await refreshResponse.json()) as ApiResponse<{
            accessToken: string;
          }>;
          const newAccessToken = refreshBody.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          // Retry original request with new token
          response = await fetchWithToken<T>(path, init, newAccessToken);
        } else {
          // Refresh token is also invalid — clear everything
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } catch {
        // Network error during refresh — clear tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  }

  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok) throw new Error(body.message);
  return body.data;
}
