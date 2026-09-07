const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let token = localStorage.getItem('reelforge_token') || null;

export const setToken = (t) => {
  token = t;
  if (t) localStorage.setItem('reelforge_token', t);
  else localStorage.removeItem('reelforge_token');
};

export const getToken = () => token;

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  let body;
  try {
    body = await res.json();
  } catch {
    body = { success: false, message: 'Invalid server response' };
  }

  if (!res.ok) {
    const error = new Error(body.message || 'Request failed');
    error.status = res.status;
    error.data = body;
    throw error;
  }

  return body;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),

  upload: (path, file, field = 'file', fileType) => {
    const form = new FormData();
    form.append(field, file);
    if (fileType) form.append('file_type', fileType);
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, { method: 'POST', headers, body: form }).then(async (res) => {
      const body = await res.json().catch(() => ({ success: false, message: 'Upload failed' }));
      if (!res.ok) throw new Error(body.message || 'Upload failed');
      return body;
    });
  },
};

export const API_URL_BASE = API_URL;