// src/api/axiosInstance.ts

import axios from 'axios';

import { CONFIG } from 'src/config-global';

const axiosInstance = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Single redirect on 401 to avoid multiple toasts and race conditions
let isRedirectingToLogin = false;

function handleUnauthorized() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.setItem('session_expired', '1');
  window.location.href = '/login';
}

// Request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: centralize 401 (token expired / invalid) → one redirect, no per-request toasts
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
