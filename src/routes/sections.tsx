import { lazy, Suspense } from 'react';
import { Outlet, Navigate, useRoutes } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { varAlpha } from 'src/theme/styles';
import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const UserPage = lazy(() => import('src/pages/users'));
export const SignInPage = lazy(() => import('src/pages/sing-in'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const ProductsDetailPage = lazy(() => import('src/pages/product-details'));
export const ProductsDetailLogs = lazy(() => import('src/pages/products-detail-logs'));
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
        { element: <HomePage />, index: true },
        { path: 'Usuarios', element: <UserPage /> },
        { path: 'Productos', element: <ProductsPage /> },
        { path: 'Productos/:id', element: <ProductsDetailPage /> },
        { path: 'Productos/Logs/:id', element: <ProductsDetailLogs /> },
      ],
    },
    {
      path: 'Registrarse',
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
