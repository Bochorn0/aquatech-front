import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import { Box, Chip, Card, Grid, Paper, Button, Divider, Typography, CircularProgress } from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/config-global';

import { Chart, useChart } from 'src/components/chart';

export default function PuntoVentaDetalleV2() {
  const { id } = useParams<{ id: string }>();
  const [punto, setPunto] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartDataNiveles, setChartDataNiveles] = useState<any>(null);

  useEffect(() => {
    const fetchPuntoVentaDetails = async () => {
      try {
        // Use v2.0 endpoint for PostgreSQL data
        const response = await fetch(`${CONFIG.API_BASE_URL_V2}/puntoVentas/${id}/detalle`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const puntoData = result.data || result;
        setPunto(puntoData);
        
        // Preparar datos de gráficas para niveles
        prepareChartDataNiveles(puntoData, setChartDataNiveles);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching punto venta details:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchPuntoVentaDetails();
      // Refresh every 30 seconds
      const interval = setInterval(fetchPuntoVentaDetails, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [id]);

  if (loading || !punto) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const osmosis = punto.productos?.filter((p: any) => p.product_type === 'Osmosis') || [];
  const niveles = punto.productos?.filter((p: any) => p.product_type === 'Nivel') || [];
  const metricas = punto.productos?.filter((p: any) => p.product_type === 'Metrica') || [];

  return (
    <>
      <Helmet>
        <title>{`Detalle Punto de Venta V2 - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 3 }}>
        <Button
          variant="outlined"
          color="primary"
          component="a"
          href="/PuntoVenta"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            padding: '8px 16px',
            borderRadius: '4px',
            textDecoration: 'none',
            '&:hover': {
              backgroundColor: 'primary.light',
              color: 'white',
            },
          }}
        >
          Volver a Puntos de Venta
        </Button>
        <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

        {/* Sección: Datos generales */}
        <DatosGenerales punto={punto} />

        <Divider sx={{ borderStyle: 'dashed', my: 3 }} />

        <Grid container spacing={2}>
          {/* Sección Izquierda: Osmosis + Niveles con Gráficas */}
          <Grid item xs={12} md={12} lg={5}>
            <OsmosisSection osmosis={osmosis} />
            <NivelesSection niveles={niveles} chartDataNiveles={chartDataNiveles} />
          </Grid>

          {/* Sección Derecha: Métricas */}
          <Grid item xs={12} md={12} lg={7}>
            <MetricasSection metricas={metricas} />
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Función para preparar datos de gráficas de niveles */
/* -------------------------------------------------------------------------- */

function prepareChartDataNiveles(puntoData: any, setChartDataNiveles: any) {
  const niveles = puntoData?.productos?.filter((p: any) => p.product_type === 'Nivel') || [];
  
  if (niveles.length === 0) {
    setChartDataNiveles(null);
    return;
  }

  const chartDataArray = niveles
    .filter((nivel: any) => {
      const hasHistorico = nivel.historico && 
                          nivel.historico.hours_with_data && 
                          Array.isArray(nivel.historico.hours_with_data) &&
                          nivel.historico.hours_with_data.length > 0;
      return hasHistorico;
    })
    .map((nivel: any) => {
      const historico = nivel.historico || {};
      const hoursWithData = historico.hours_with_data || [];
      
      // Ordenar por hora
      const horasOrdenadas = [...hoursWithData].sort((a: any, b: any) => {
        const horaA = a.hora || '00:00';
        const horaB = b.hora || '00:00';
        return horaA.localeCompare(horaB);
      });
      
      // Extraer horas y datos de nivel
      const horas = horasOrdenadas.map((h: any) => h.hora || '');
      const nivelPercentData = horasOrdenadas.map((h: any) => {
        const value = Number(h.estadisticas?.liquid_level_percent_promedio) || 0;
        return Math.max(0, Math.min(100, value));
      });

      // Obtener el valor actual del producto desde el status
      const valorActual = nivel.status?.find((s: any) => s.code === 'liquid_level_percent')?.value || null;

      return {
        nivelId: nivel._id || nivel.id,
        nivelName: nivel.name,
        categories: horas,
        series: [
          {
            name: 'Nivel (%)',
            data: nivelPercentData,
          },
        ],
        estadisticas: {
          valorActual: valorActual !== null ? Number(valorActual) : null,
        },
      };
    });

  const result = chartDataArray.length > 0 ? chartDataArray : null;
  setChartDataNiveles(result);
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 1: Osmosis */
/* -------------------------------------------------------------------------- */

function OsmosisSection({ osmosis }: any) {
  if (osmosis.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      {osmosis.map((p: any) => {
        // Extract values from status array (v2.0 format)
        const flowRate1 = p.status?.find((s: any) => s.code === 'flowrate_speed_1')?.value; // Flujo Producción
        const flowRate2 = p.status?.find((s: any) => s.code === 'flowrate_speed_2')?.value; // Flujo Rechazo
        const tds = p.status?.find((s: any) => s.code === 'tds_out')?.value;
        const levelPurificada = p.status?.find((s: any) => s.code === 'level_purificada')?.value;
        const levelRecuperada = p.status?.find((s: any) => s.code === 'level_recuperada')?.value;
        const presionIn = p.status?.find((s: any) => s.code === 'pressure_in')?.value;

        // Calcular eficiencia: (flujo_produccion / (flujo_produccion + flujo_rechazo)) * 100
        const totalFlujo = (flowRate1 || 0) + (flowRate2 || 0);
        const eficiencia = totalFlujo > 0 
          ? ((flowRate1 || 0) / totalFlujo * 100).toFixed(2)
          : 'N/A';

        // Calcular porcentajes de producción
        const porcentajeProd1 = totalFlujo > 0 
          ? ((flowRate1 || 0) / totalFlujo * 100).toFixed(2)
          : 'N/A';
        const porcentajeProd2 = totalFlujo > 0 
          ? ((flowRate2 || 0) / totalFlujo * 100).toFixed(2)
          : 'N/A';

        return (
          <Card key={p._id || p.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 2 }}>
              <Typography variant="h6">{p.name || 'Sistema de Osmosis'}</Typography>
              <Chip 
                label={p.online ? 'Online' : 'Offline'} 
                color={p.online ? 'success' : 'error'} 
                size="small" 
              />
            </Box>
            <Divider sx={{ mb: 2 }} />

            {/* Producción: Flujo 1 y Porcentaje */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Producción
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Flujo 1
                  </Typography>
                  <Typography variant="h6">
                    {flowRate1 !== undefined ? `${flowRate1.toFixed(2)}` : 'N/A'} 
                    <Typography component="span" variant="caption"> L/min</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Porcentaje
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {porcentajeProd1 !== 'N/A' ? `${porcentajeProd1}%` : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Producción: Flujo 2 y Porcentaje */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Rechazo
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Flujo 2
                  </Typography>
                  <Typography variant="h6">
                    {flowRate2 !== undefined ? `${flowRate2.toFixed(2)}` : 'N/A'} 
                    <Typography component="span" variant="caption"> L/min</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Porcentaje
                  </Typography>
                  <Typography variant="h6" color="secondary">
                    {porcentajeProd2 !== 'N/A' ? `${porcentajeProd2}%` : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Eficiencia */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Eficiencia
              </Typography>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {eficiencia !== 'N/A' ? `${eficiencia}%` : 'N/A'}
              </Typography>
            </Box>

            {/* Otros datos adicionales */}
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  TDS
                </Typography>
                <Typography variant="body1">
                  {tds !== undefined ? `${tds.toFixed(1)}` : 'N/A'} 
                  <Typography component="span" variant="caption"> ppm</Typography>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Nivel Purificada
                </Typography>
                <Typography variant="body1">
                  {levelPurificada !== undefined ? `${levelPurificada.toFixed(1)}` : 'N/A'} 
                  <Typography component="span" variant="caption"> %</Typography>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Nivel Recuperada
                </Typography>
                <Typography variant="body1">
                  {levelRecuperada !== undefined ? `${levelRecuperada.toFixed(1)}` : 'N/A'} 
                  <Typography component="span" variant="caption"> %</Typography>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Presión Entrada
                </Typography>
                <Typography variant="body1">
                  {presionIn !== undefined ? `${presionIn.toFixed(1)}` : 'N/A'} 
                  <Typography component="span" variant="caption"> PSI</Typography>
                </Typography>
              </Grid>
            </Grid>
          </Card>
        );
      })}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 2: Niveles con Gráficas */
/* -------------------------------------------------------------------------- */

function NivelesSection({ niveles, chartDataNiveles }: any) {
  if (niveles.length === 0) {
    return null;
  }

  return (
    <Box>
      {niveles.map((nivel: any) => {
        // Buscar el chartData correspondiente a este nivel
        const chartData = chartDataNiveles?.find((cd: any) => cd.nivelId === nivel._id || cd.nivelId === nivel.id);
        const valorActual = nivel.status?.find((s: any) => s.code === 'liquid_level_percent')?.value;

        return (
          <Box key={nivel._id || nivel.id} sx={{ mb: 3 }}>
            {/* Card con información del nivel */}
            <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{nivel.name || 'Nivel'}</Typography>
                <Chip 
                  label={nivel.online ? 'Online' : 'Offline'} 
                  color={nivel.online ? 'success' : 'error'} 
                  size="small" 
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Porcentaje de Nivel
                </Typography>
                <Typography variant="h3" color="primary" fontWeight="bold">
                  {valorActual !== undefined && valorActual !== null 
                    ? `${Number(valorActual).toFixed(1)}%` 
                    : 'N/A'}
                </Typography>
              </Box>
            </Card>

            {/* Gráfica histórica */}
            {chartData && (
              <NivelHistoricoChart nivelName={nivel.name} chart={chartData} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Componente: Gráfica Histórica de Niveles */
/* -------------------------------------------------------------------------- */

function NivelHistoricoChart({ nivelName, chart }: { nivelName: string; chart: any }) {
  const theme = useTheme();

  const hasData = chart && chart.categories && chart.categories.length > 0 && chart.series && chart.series.length > 0;
  
  const chartOptions = useChart({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: [theme.palette.primary.main],
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    xaxis: {
      categories: chart?.categories || [],
      labels: {
        rotate: -45,
        rotateAlways: false,
        style: {
          fontSize: '11px',
        },
      },
    },
    yaxis: {
      title: {
        text: 'Nivel (%)',
      },
      min: 0,
      max: 100,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) => fNumber(value),
        title: {
          formatter: (seriesName: string) => `${seriesName}: `,
        },
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    grid: {
      strokeDashArray: 3,
    },
  });

  const seriesWithYaxis = chart?.series || [];

  if (!hasData) {
    return (
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <CardHeader
          title={`Histórico de ${nivelName}`}
          subheader="No hay datos históricos disponibles"
        />
      </Card>
    );
  }

  const valorActual = chart?.estadisticas?.valorActual;

  return (
    <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
      <CardHeader
        title={`Histórico de ${nivelName}`}
        subheader={valorActual !== null && valorActual !== undefined 
          ? `Valor actual: ${valorActual.toFixed(1)}%`
          : 'Valor actual: N/A'}
      />
      <Divider sx={{ mb: 2 }} />
      <Chart
        type="line"
        series={seriesWithYaxis}
        options={chartOptions}
        height={350}
        sx={{ py: 2 }}
      />
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 3: Métricas */
/* -------------------------------------------------------------------------- */

function MetricasSection({ metricas }: any) {
  if (metricas.length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Métricas
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          No hay métricas disponibles
        </Typography>
      </Card>
    );
  }

  return (
    <Box>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Métricas
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {metricas.map((metrica: any) => {
            const nivel = metrica.status?.find((s: any) => s.code === 'liquid_level_percent')?.value;
            const nombre = metrica.name || 'Métrica';

            return (
              <Grid item xs={12} sm={6} key={metrica._id || metrica.id}>
                <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {nombre}
                  </Typography>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {nivel !== undefined && nivel !== null 
                      ? `${Number(nivel).toFixed(1)}%` 
                      : 'N/A'}
                  </Typography>
                  <Chip 
                    label={metrica.online ? 'Online' : 'Offline'} 
                    color={metrica.online ? 'success' : 'error'} 
                    size="small" 
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Card>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección: Datos Generales */
/* -------------------------------------------------------------------------- */

function DatosGenerales({ punto }: any) {
  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        {punto.name}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Información General - Lado Izquierdo */}
        <Grid item xs={12} md={6}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="overline" color="text.secondary" fontSize="0.75rem">
                Cliente
              </Typography>
              <Typography variant="h6" fontWeight="medium">
                {punto.cliente?.name || 'N/A'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="overline" color="text.secondary" fontSize="0.75rem">
                Ubicación
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {punto.city?.city || 'N/A'}, {punto.city?.state || 'N/A'}
              </Typography>
              {punto.city?.lat && punto.city?.lon && (
                <Typography variant="body2" color="text.secondary">
                  Lat: {punto.city.lat.toFixed(4)}, Lon: {punto.city.lon.toFixed(4)}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="overline" color="text.secondary" fontSize="0.75rem">
                Estado del Sistema
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={punto.online ? 'En Línea' : 'Offline'}
                  color={punto.online ? 'success' : 'error'}
                  size="medium"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>

            <Box>
              <Typography variant="overline" color="text.secondary" fontSize="0.75rem">
                Productos Instalados
              </Typography>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {punto.productos?.length || 0}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Mapa - Lado Derecho (placeholder) */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'background.neutral',
              borderRadius: 2,
              overflow: 'hidden',
              height: '350px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Mapa no disponible (mock)
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}
