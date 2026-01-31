import { lazy, Suspense, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { getDashboardVersion } from 'src/utils/permissions';

import { varAlpha } from 'src/theme/styles';

const HomeV1 = lazy(() => import('./home'));
const HomeV2 = lazy(() => import('./home_'));

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
 * Renders the landing dashboard according to the user role's dashboardVersion:
 * - v1: metrics by product + map (home.tsx)
 * - v2: general metrics (home_.tsx)
 * - both: tabs to switch between v1 and v2
 * - null/undefined: default to v1
 */
export function DashboardLanding() {
  const version = getDashboardVersion();
  const [tab, setTab] = useState(0);

  if (version === 'v2') {
    return (
      <Suspense fallback={renderFallback}>
        <HomeV2 />
      </Suspense>
    );
  }

  if (version === 'both') {
    return (
      <Box sx={{ width: '100%' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Métricas por producto (v1)" />
          <Tab label="Métricas generales (v2)" />
        </Tabs>
        <Suspense fallback={renderFallback}>
          {tab === 0 && <HomeV1 />}
          {tab === 1 && <HomeV2 />}
        </Suspense>
      </Box>
    );
  }

  // v1 or null -> default to v1
  return (
    <Suspense fallback={renderFallback}>
      <HomeV1 />
    </Suspense>
  );
}

export default DashboardLanding;
