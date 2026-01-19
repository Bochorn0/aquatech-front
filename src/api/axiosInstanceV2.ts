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

// Request interceptor to include JWT token (Aquatech_front uses JWT, not API key)
axiosInstanceV2.interceptors.request.use(
  (config) => {
    // Include JWT token for all operations (GET, POST, PATCH, DELETE)
    // The backend middleware accepts either API key (TI_water) or JWT (Aquatech_front)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstanceV2.interceptors.response.use(
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

export default axiosInstanceV2;
