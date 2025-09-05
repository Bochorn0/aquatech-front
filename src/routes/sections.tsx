import axios from 'axios';
import { lazy, Suspense, useEffect } from 'react';
import { Outlet, Navigate, useRoutes, useNavigate, } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { CONFIG } from 'src/config-global';
import { varAlpha } from 'src/theme/styles';
import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';
// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const UserPage = lazy(() => import('src/pages/users'));
export const Controllers = lazy(() => import('src/pages/controllers'));
export const ProfilePage = lazy(() => import('src/pages/users/user-profile'));
export const LoginPage = lazy(() => import('src/pages/login'));
export const RegisterPage = lazy(() => import('src/pages/register'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const CustomizationPage = lazy(() => import('src/pages/personalizacion'));
export const MapsPage = lazy(() => import('src/pages/maps'));
export const ProductsDetailPage = lazy(() => import('src/pages/products/product-details'));
export const Page404 = lazy(() => import('src/pages/not_fund'));
export const Logout =  function handleTokenLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return <Navigate to="/login" />;
};
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
          navigate('/login');
    } else {
        try {
          // Send login request to backend
          axios.defaults.headers.common.Authorization = `Bearer ${token}`;
          await axios.post(`${CONFIG.API_BASE_URL}/auth/verify`);
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
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
              <Controllers />
            </TokenProtectedRoute>
          ),
          path: 'Controladores',
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
              <ProfilePage />
            </TokenProtectedRoute>
          ),
          path: 'Usuarios/Perfil/:id',
        },
        
        {
          element: (
            <TokenProtectedRoute>
              <ProductsPage />
            </TokenProtectedRoute>
          ),
          path: 'Equipos',
        },
        {
          element: (
            <TokenProtectedRoute>
              <ProductsDetailPage />
            </TokenProtectedRoute>
          ),
          path: 'Equipos/:id',
        },
        {
          element: (
            <TokenProtectedRoute>
              <CustomizationPage />
            </TokenProtectedRoute>
          ),
          path: 'Personalizacion',
        }
        // {
        //   element: (
        //     <TokenProtectedRoute>
        //       <MapsPage />
        //     </TokenProtectedRoute>
        //   ),
        //   path: 'Regiones',
        // },
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
          <LoginPage />
        </AuthLayout>
      ),
    },
    {
      path: 'Logout',
      element: (
        <AuthLayout>
          <Logout />
        </AuthLayout>
      ),
    },
    {
      path: 'Registrarse',
      element: (
        <AuthLayout>
          <RegisterPage />
        </AuthLayout>
      ),
    },
    {
      path: '404',
      element: <Page404 />,
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ]);
}
