// src/api/apiHelper.ts

import axiosInstance from './axiosInstance';
import { showErrorToast } from '../utils/error-helper'; // Import the error helper

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiRequestParams {
  url: string;
  method: HttpMethod;
  data?: object; // For POST, PUT, PATCH requests
  params?: object; // For GET request query params
}

const apiRequest = async <T>({ url, method, data, params }: ApiRequestParams): Promise<T> => {
  console.log('apiRequest', url, method, data, params);
  try {
    const response = await axiosInstance({
      url,
      method,
      data,
      params
    });
    return response.data;
  } catch (error) {
    showErrorToast(error);  // Show the error toast
    throw error; // Rethrow the error for further handling if needed
  }
};

export const get = <T>(url: string, params?: object): Promise<T> =>
  apiRequest<T>({ url, method: 'GET', params });

export const post = <T>(url: string, data: object): Promise<T> =>
  apiRequest<T>({ url, method: 'POST', data });

export const put = <T>(url: string, data: object): Promise<T> =>
  apiRequest<T>({ url, method: 'PUT', data });

export const patch = <T>(url: string, data: object): Promise<T> =>
  apiRequest<T>({ url, method: 'PATCH', data });

export const remove = <T>(url: string): Promise<T> =>
  apiRequest<T>({ url, method: 'DELETE' });
