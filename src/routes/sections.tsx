import axios from 'axios';
import { lazy, Suspense, useEffect } from 'react';
import { Outlet, Navigate, useRoutes, useNavigate, useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { hasPermission } from 'src/utils/permissions';

import { CONFIG } from 'src/config-global';
import { varAlpha } from 'src/theme/styles';
import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';
// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const UserPage = lazy(() => import('src/pages/users'));
export const Controllers = lazy(() => import('src/pages/controllers'));
export const PuntoVenta = lazy(() => import('src/pages/punto-venta'));
export const PuntoVentaV2 = lazy(() => import('src/pages/punto-venta-v2'));
export const PuntoVentaDetalle = lazy(() => import('src/pages/punto-venta/punto-venta-detalle'));
export const PuntoVentaDetalleV2 = lazy(() => import('src/pages/punto-venta/punto-venta-detalle-v2'));
export const ProfilePage = lazy(() => import('src/pages/users/user-profile'));
export const LoginPage = lazy(() => import('src/pages/login'));
export const RegisterPage = lazy(() => import('src/pages/register'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const CustomizationPage = lazy(() => import('src/pages/personalizacion'));
export const CustomizationPageV2 = lazy(() => import('src/pages/personalizacion-v2'));
export const MapsPage = lazy(() => import('src/pages/maps'));
export const ProductsDetailPage = lazy(() => import('src/pages/products/product-details'));
export const MQTTDocumentationPage = lazy(() => import('src/pages/mqtt-documentation'));
export const TIWaterCatalogPage = lazy(() => import('src/pages/tiwater-catalog'));
export const TIWaterCatalogProductPage = lazy(() => import('src/pages/tiwater-catalog/tiwater-catalog-product'));
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

// Permission-based route protection
const PermissionProtectedRoute = ({ 
  children, 
  requiredPath 
}: { 
  children: JSX.Element;
  requiredPath: string;
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Verificar permisos después de que el componente se monte
    // Usar el pathname actual normalizado para la verificación
    const currentPath = location.pathname;
    if (!hasPermission(requiredPath)) {
      console.log(`[Route Protection] Access denied to: ${requiredPath} (current path: ${currentPath})`);
      navigate('/404', { replace: true });
    }
  }, [requiredPath, navigate, location.pathname]);

  // Si tiene permiso, renderizar el componente
  if (hasPermission(requiredPath)) {
    return children;
  }

  // Si no tiene permiso, no renderizar nada (será redirigido)
  return null;
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
              <PermissionProtectedRoute requiredPath="/">
                <HomePage />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          index: true,
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/controladores">
                <Controllers />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'Controladores',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/puntoVenta/v1">
                <PuntoVenta />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'v1/PuntoVenta',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/puntoVenta/v1">
                <PuntoVentaDetalle />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'v1/PuntoVenta/:id',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/puntoVenta/v2">
                <PuntoVentaV2 />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'PuntoVenta',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/puntoVenta/v2">
                <PuntoVentaDetalleV2 />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'PuntoVenta/:id',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/usuarios">
                <UserPage />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'Usuarios',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/usuarios">
                <ProfilePage />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'Usuarios/Perfil/:id',
        },
        
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/equipos">
                <ProductsPage />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'Equipos',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/equipos">
                <ProductsDetailPage />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'Equipos/:id',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/personalizacion/v1">
                <CustomizationPage />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'v1/Personalizacion',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/personalizacion/v2">
                <CustomizationPageV2 />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'Personalizacion',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/api-ti-water">
                <MQTTDocumentationPage />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'api-ti-water',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/tiwater-catalog">
                <TIWaterCatalogPage />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'tiwater-catalog',
        },
        {
          element: (
            <TokenProtectedRoute>
              <PermissionProtectedRoute requiredPath="/tiwater-catalog">
                <TIWaterCatalogProductPage />
              </PermissionProtectedRoute>
            </TokenProtectedRoute>
          ),
          path: 'tiwater-catalog/:id',
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
