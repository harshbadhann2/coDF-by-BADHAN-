import axios from 'axios';

function normalizeApiBaseUrl(rawBaseUrl) {
  const value = (rawBaseUrl || '').trim().replace(/\/+$/, '');

  if (!value || value === 'api' || value === '/api') {
    return '/api';
  }

  if (value.endsWith('/api')) {
    return value;
  }

  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return `${value}/api`;
  }

  return `/${value}/api`;
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeout: 180000
});

export default api;
