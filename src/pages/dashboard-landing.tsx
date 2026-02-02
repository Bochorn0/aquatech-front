import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { hasPermission, getDashboardVersion } from 'src/utils/permissions';

import { varAlpha } from 'src/theme/styles';

const HomeV1 = lazy(() => import('./home'));
const HomeV2Dashboard = lazy(() => import('./home-v2'));

const renderFallback = (
  <Box display="flex" alignItems="center" justifyContent="center" minHeight="40vh" width="100%">
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

/**
 * Renders the landing at / (index).
 * Redirects to the dashboard page according to user permissions:
 * - has /dashboard/v2 only -> /dashboard/v2
 * - has /dashboard/v1 only -> /dashboard/v1
 * - has both -> /dashboard/v2 (default)
 * - legacy (/, /dashboard): use getDashboardVersion to decide
 */
export function DashboardLanding() {
  const hasV2 = hasPermission('/dashboard/v2');
  const hasV1 = hasPermission('/dashboard/v1');

  if (hasV2) {
    return <Navigate to="/dashboard/v2" replace />;
  }
  if (hasV1) {
    return <Navigate to="/dashboard/v1" replace />;
  }

  // Legacy: user has / or /dashboard only (no v1/v2) -> show dashboard inline by dashboardVersion (no redirect to v1/v2 routes)
  const version = getDashboardVersion();
  if (version === 'v2' || version === 'both') {
    return (
      <Suspense fallback={renderFallback}>
        <HomeV2Dashboard />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={renderFallback}>
      <HomeV1 />
    </Suspense>
  );
}

export default DashboardLanding;
