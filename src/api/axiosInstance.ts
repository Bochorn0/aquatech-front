// src/api/axiosInstance.ts

import axios from 'axios';

import { CONFIG } from 'src/config-global';

const axiosInstance = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

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

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized error (e.g., redirect to login)
    } else if (error.response && error.response.status === 500) {
      // Handle server error
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
