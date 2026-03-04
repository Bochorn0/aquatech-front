import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { CONFIG } from 'src/config-global';
import { get as getV2 } from 'src/api/axiosHelperV2';
import { DashboardContent } from 'src/layouts/dashboard';
import { DashboardV2Map } from 'src/pages/dashboard-v2-map';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type ClienteV2 = { id?: string; _id?: string; name: string };
type RegionV2 = { id: string; code: string; name: string; color?: string | null };
type PuntoVentaV2 = {
  id: string;
  _id?: string;
  name: string;
  clientId?: string;
  cliente?: ClienteV2 | string;
  region?: RegionV2 | null;
  updatedAt?: string;
  lat?: number | null;
  long?: number | null;
  codigo_tienda?: string | null;
  city?: {
    city?: string;
    state?: string;
    lat?: number;
    lon?: number;
  } | null;
};

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export function DashboardGlobal() {
  const [loading, setLoading] = useState(true);
  const [puntosError, setPuntosError] = useState<string | null>(null);
  const [puntosVenta, setPuntosVenta] = useState<PuntoVentaV2[]>([]);
  const [regions, setRegions] = useState<RegionV2[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setPuntosError(null);
      setLoading(true);
      try {
        const [puntosRes, regionsRes] = await Promise.all([
          getV2<PuntoVentaV2[]>('/puntoVentas/all'),
          getV2<RegionV2[]>('/regions').catch(() => []),
        ]);
        setPuntosVenta(Array.isArray(puntosRes) ? puntosRes : []);
        setRegions(Array.isArray(regionsRes) ? regionsRes : []);
      } catch {
        setPuntosVenta([]);
        setRegions([]);
        setPuntosError('No se pudieron cargar los puntos de venta. Verifique la conexión.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${CONFIG.appName} - Dashboard global`}</title>
      </Helmet>
      <DashboardContent maxWidth="xl">
        <Typography variant="h4" sx={{ mb: 1 }}>
          Dashboard global
        </Typography>

        {puntosError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPuntosError(null)}>
            {puntosError}
          </Alert>
        )}

        {!puntosError && puntosVenta.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No hay puntos de venta configurados. Configure puntos de venta en la sección Puntos de venta.
          </Alert>
        )}

        <Grid container spacing={3}>
          {puntosVenta.length > 0 && (
            <Grid xs={12}>
              <DashboardV2Map puntos={puntosVenta} regions={regions} />
            </Grid>
          )}
        </Grid>
      </DashboardContent>
    </>
  );
}

export default DashboardGlobal;
