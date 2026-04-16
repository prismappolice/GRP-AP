export const latestNewsAPI = {
  get: () => api.get('/latest-news'),
  update: (data) => api.post('/latest-news', data),
};
import axios from 'axios';

const configuredBackendUrl = (process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/$/, '');
const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const shouldUseSameOrigin = typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const baseUrl = shouldUseSameOrigin ? runtimeOrigin : (configuredBackendUrl || runtimeOrigin);
const API = baseUrl ? `${baseUrl}/api` : '/api';

export const normalizeMediaUrl = (inputUrl) => {
  if (!inputUrl) return '';
  const cleanedUrl = String(inputUrl).trim();
  if (/^(blob:|data:)/i.test(cleanedUrl)) return cleanedUrl;
  if (/^https?:\/\//i.test(cleanedUrl)) return cleanedUrl;
  const legacyNewsMatch = cleanedUrl.match(/\/gallery_uploads\/news\/(.+)$/i);
  if (legacyNewsMatch) {
    return `${baseUrl}/news_uploads/${legacyNewsMatch[1]}`;
  }
  const match = cleanedUrl.match(/\/(gallery_uploads|news_uploads|unidentified_uploads)\/.+$/i);
  if (match) {
    return `${baseUrl}${match[0]}`;
  }
  return cleanedUrl;
};

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('grp_auth_token', token);
  } else {
    localStorage.removeItem('grp_auth_token');
  }
};

export const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('grp_auth_token');
  }
  return authToken;
};

const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const complaintsAPI = {
  create: (data) => api.post('/complaints', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: () => api.get('/complaints'),
  getById: (id) => api.get(`/complaints/${id}`),
  track: (trackingNumber) => api.get(`/complaints/track/${trackingNumber}`),
  update: (id, data) => api.patch(`/complaints/${id}`, data),
  assign: (id, station) => api.patch(`/complaints/${id}/assign`, { station }),
  updateStatus: (id, statusOrData, rejectionReason) => {
    if (typeof statusOrData === 'object' && statusOrData !== null) {
      return api.patch(`/complaints/${id}`, statusOrData);
    }
    return api.patch(`/complaints/${id}`, { status: statusOrData, rejection_reason: rejectionReason });
  },
};

export const stationAPI = {
  getComplaints: () => api.get('/station/complaints'),
  getUnidentifiedBodies: () => api.get('/station/unidentified-bodies'),
};

export const irpAPI = {
  getComplaints: () => api.get('/irp/complaints'),
  getUnidentifiedBodies: () => api.get('/irp/unidentified-bodies'),
};

export const dsrpAPI = {
  getComplaints: () => api.get('/dsrp/complaints'),
  getUnidentifiedBodies: () => api.get('/dsrp/unidentified-bodies'),
};

export const srpAPI = {
  getComplaints: () => api.get('/srp/complaints'),
  getUnidentifiedBodies: () => api.get('/srp/unidentified-bodies'),
};

export const dgpAPI = {
  getComplaints: () => api.get('/dgp/complaints'),
  getUnidentifiedBodies: () => api.get('/dgp/unidentified-bodies'),
};

export const alertsAPI = {
  getAll: () => api.get('/alerts'),
};

export const unidentifiedBodiesAPI = {
  getAll: () => api.get('/unidentified-bodies'),
  create: (formData) => api.post('/unidentified-bodies', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: (id) => api.delete(`/station/unidentified-bodies/${encodeURIComponent(id)}`),
};

export const stationsAPI = {
  getAll: () => api.get('/stations'),
  search: (query) => api.get(`/stations/search?q=${query}`),
};

export const crimeAPI = {
  getSummary: () => api.get('/crime-data/summary'),
  getTrends: () => api.get('/crime-data/trends'),
};

export const helpAPI = {
  create: (data) => api.post('/help-requests', data),
  getAll: () => api.get('/admin/help-requests'),
  updateStatus: (id, status) => api.patch(`/admin/help-requests/${id}`, { status }),
};

export const chatAPI = {
  sendMessage: (data) => api.post('/chat', data),
};

export const adminAPI = {
  createAlert: (data) => api.post('/admin/alerts', data),
};

export const pageContentAPI = {
  getPage: (pageKey) => api.get(`/page-content/${pageKey}`),
  updatePage: (pageKey, content) => api.put(`/admin/page-content/${pageKey}`, { content }),
};

export const seedData = () => api.post('/seed-data');
