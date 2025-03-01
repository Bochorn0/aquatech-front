import axios from 'axios';
import Swal from 'sweetalert2';
import { lazy, Suspense, useEffect } from 'react';
import { Outlet, Navigate, useRoutes, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { CONFIG } from 'src/config-global';
import { varAlpha } from 'src/theme/styles';
import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';
// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const UserPage = lazy(() => import('src/pages/users'));
export const SignInPage = lazy(() => import('src/pages/sing-in'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const ReportGenerator = lazy(() => import('src/pages/reports'));
export const MapsPage = lazy(() => import('src/pages/maps'));
export const ProductsDetailPage = lazy(() => import('src/pages/products/product-details'));
export const Page404 = lazy(() => import('src/pages/not_fund'));

// ----------------------------------------------------------------------

const renderFallback = (
  <Box display="flex" alignItems="center" justifyContent="center" flex="1 1 auto">
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

// Token validation with error handling

const TokenProtectedRoute = ({ children }: { children: JSX.Element }) => {
const token = localStorage.getItem('token');
const navigate = useNavigate();

useEffect(() => {
  const validateToken = async () => {
    if (!token) {
      // If no token, show error alert and navigate to login page
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'You need to be logged in to access this page.',
        showCancelButton: false,
        confirmButtonText: 'Login'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/login');
        }
      });
    } else {
      try {
        // Send login request to backend
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        await axios.post(`${CONFIG.API_BASE_URL}/auth/verify`);
      } catch (error) {
        localStorage.removeItem('token'); // Remove token if invalid
        console.error('Error validating token:', error);
      }
    }
  };

  validateToken();
}, [token, navigate]);

// If token exists, render the children (Dashboard routes)
return token ? children : null;
};

// Main Router component
export function Router() {
  return useRoutes([
    {
      element: (
        <DashboardLayout>
          <Suspense fallback={renderFallback}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      ),
      children: [
        {
          element: (
            <TokenProtectedRoute>
              <HomePage />
            </TokenProtectedRoute>
          ),
          index: true,
        },
        {
          element: (
            <TokenProtectedRoute>
              <UserPage />
            </TokenProtectedRoute>
          ),
          path: 'Usuarios',
        },
        {
          element: (
            <TokenProtectedRoute>
              <ProductsPage />
            </TokenProtectedRoute>
          ),
          path: 'Productos',
        },
        {
          element: (
            <TokenProtectedRoute>
              <ProductsDetailPage />
            </TokenProtectedRoute>
          ),
          path: 'Productos/:id',
        },
        {
          element: (
            <TokenProtectedRoute>
              <MapsPage />
            </TokenProtectedRoute>
          ),
          path: 'Regiones',
        },
        // Uncomment and add any routes that need protection here
        // {
        //   element: (
        //     <TokenProtectedRoute>
        //       <ReportGenerator />
        //     </TokenProtectedRoute>
        //   ),
        //   path: 'Reportes',
        // },
      ],
    },
    {
      path: 'Login',
      element: (
        <AuthLayout>
          <SignInPage />
        </AuthLayout>
      ),
    },
    // {
    //   path: '404',
    //   element: <Page404 />,
    // },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ]);
}
