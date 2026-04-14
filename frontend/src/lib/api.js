export const latestNewsAPI = {
  get: () => api.get('/latest-news'),
  update: (data) => api.post('/latest-news', data),
};
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  create: (data) => api.post('/complaints', data),
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
  getLostItems: () => api.get('/station/lost-items'),
  getUnidentifiedBodies: () => api.get('/station/unidentified-bodies'),
};

export const irpAPI = {
  getComplaints: () => api.get('/irp/complaints'),
  getLostItems: () => api.get('/irp/lost-items'),
  getUnidentifiedBodies: () => api.get('/irp/unidentified-bodies'),
};

export const dsrpAPI = {
  getComplaints: () => api.get('/dsrp/complaints'),
  getLostItems: () => api.get('/dsrp/lost-items'),
  getUnidentifiedBodies: () => api.get('/dsrp/unidentified-bodies'),
};

export const srpAPI = {
  getComplaints: () => api.get('/srp/complaints'),
  getLostItems: () => api.get('/srp/lost-items'),
  getUnidentifiedBodies: () => api.get('/srp/unidentified-bodies'),
};

export const dgpAPI = {
  getComplaints: () => api.get('/dgp/complaints'),
  getLostItems: () => api.get('/dgp/lost-items'),
  getUnidentifiedBodies: () => api.get('/dgp/unidentified-bodies'),
};

export const lostFoundAPI = {
  reportLost: (data) => api.post('/lost-items', data),
  getMyLostItems: () => api.get('/lost-items'),
  getFoundItems: () => api.get('/found-items'),
  update: (id, data) => api.patch(`/lost-items/${id}`, data),
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
  addFoundItem: (data) => api.post('/admin/found-items', data),
  createAlert: (data) => api.post('/admin/alerts', data),
};

export const pageContentAPI = {
  getPage: (pageKey) => api.get(`/page-content/${pageKey}`),
  updatePage: (pageKey, content) => api.put(`/admin/page-content/${pageKey}`, { content }),
};

export const seedData = () => api.post('/seed-data');
