// src/api/axiosInstanceV2.ts
// Axios instance for v2.0 API endpoints (TI Water)

import axios from 'axios';

import { CONFIG } from 'src/config-global';

const axiosInstanceV2 = axios.create({
  baseURL: CONFIG.API_BASE_URL_V2,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Single redirect on 401 (shared logic with axiosInstance - same app auth)
let isRedirectingToLogin = false;

function handleUnauthorized() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.setItem('session_expired', '1');
  window.location.href = '/login';
}

// Request interceptor to include JWT token (Aquatech_front uses JWT, not API key)
axiosInstanceV2.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: centralize 401 → one redirect, no per-request toasts
axiosInstanceV2.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default axiosInstanceV2;
