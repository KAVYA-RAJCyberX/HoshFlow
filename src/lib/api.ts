/**
 * API utility: wraps fetch with JWT auth headers from localStorage.
 * Used as a drop-in replacement for direct fetch() calls throughout the app.
 */

const getToken = (): string | null => {
  try {
    return localStorage.getItem('hosflow_jwt');
  } catch {
    return null;
  }
};

export const api = {
  get: (url: string) => {
    const token = getToken();
    return fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  },

  post: (url: string, body: unknown) => {
    const token = getToken();
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  },

  patch: (url: string, body: unknown) => {
    const token = getToken();
    return fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  },
};
