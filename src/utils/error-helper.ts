import { toast } from 'react-toastify';

// Helper to extract a user-friendly error message
export const handleError = (error: any): string => {
  console.log('error', error); // Keep it if you want to debug

  // Handle Axios errors
  if (error.response) {
    // Return backend message if available
    if (error.response.data?.message) {
      return error.response.data.message;
    }

    // Fallback by status
    switch (error.response.status) { 
      case 400:
        return 'Solicitud incorrecta. Por favor, inténtelo de nuevo.';
      case 401:
        return 'No autorizado. Inicie sesión para continuar.';
      case 403:
        return 'Prohibido. No tiene permiso para acceder';
      case 404:
        return 'No encontrado. Inténtelo de nuevo más tarde.';
      case 500:
        return 'Error del servidor. Inténtelo de nuevo más tarde.';
      default:
        return `Error inesperado. Inténtelo de nuevo más tarde. ${error.response.status}`;
    }
  }

  // Network error
  if (error.request) {
    return 'Error de red. Inténtelo de nuevo más tarde.';
  }

  // Other unexpected errors
  return error.message || 'Error inesperado. Inténtelo de nuevo más tarde.';
};

// Helper to show toast from any error (skips 401: handled by axios interceptors → redirect + one toast on login page)
export const showErrorToast = (error: any): void => {
  if (error?.response?.status === 401) return;
  const errorMessage = handleError(error);
  toast.error(errorMessage, {
    position: 'top-right',
    autoClose: 5000,
  });
};
