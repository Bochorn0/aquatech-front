import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Marker, Geography, Geographies, ComposableMap } from 'react-simple-maps';

import { Box, Chip, Card, Grid, Paper, Button, Divider, Typography, CircularProgress } from '@mui/material';

import geoData from 'src/utils/states.json';

import { get } from 'src/api/axiosHelper';
import { CONFIG } from 'src/config-global';

import { SideBarChart } from '../charts/side-bar-chart';
import { PressureGauge } from '../charts/pressure-gauge';

export default function PuntoVentaDetalle() {
  const { id } = useParams<{ id: string }>();
  
  const [punto, setPunto] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartDataNiveles, setChartDataNiveles] = useState<any>(null);

  useEffect(() => {
    const fetchPuntoVentaDetails = async () => {
      try {
        const response = await get<any>(`/puntoVentas/${id}`);
        setPunto(response);
        prepareChartData(response);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching punto venta details:', error);
        setLoading(false);
      }
    };

    const prepareChartData = (puntoData: any) => {
      const productos = puntoData?.productos || [];
      const niveles = productos.filter((p: any) => p.product_type === 'Nivel');
      
      if (niveles.length === 0) {
        setChartDataNiveles(null);
        return;
      }

      // Preparar categorías (nombres de los tanques)
      const categories = niveles.map((nivel: any) => nivel.name);
      
      // Preparar datos para las series
      const nivelesData = niveles.map((nivel: any) => 
        nivel.status.find((s: any) => s.code === 'liquid_level_percent')?.value || 0
      );
      
      const profundidadData = niveles.map((nivel: any) => 
        nivel.status.find((s: any) => s.code === 'liquid_depth')?.value || 0
      );
      
      const chartData = {
        categories,
        series: [
          {
            name: 'Nivel (%)',
            data: nivelesData,
          },
          {
            name: 'Profundidad (cm)',
            data: profundidadData,
          },
        ],
      };
      
      setChartDataNiveles(chartData);
    };

    fetchPuntoVentaDetails();

    const interval = setInterval(() => {
      fetchPuntoVentaDetails();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [id]);

  if (loading || !punto) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const productos = punto?.productos || [];

  const niveles = productos.filter((p: any) => p.product_type === 'Nivel');
  const osmosis = productos.filter((p: any) => p.product_type === 'Osmosis');
  const presion = productos.filter((p: any) =>
    p.name?.toLowerCase().includes('pressure')
  );

  return (
    <>
      <Helmet>
        <title>{`Detalle Punto de Venta - ${CONFIG.appName}`}</title>
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

        {/* Sección: Datos generales con Mapa */}
        <DatosGenerales punto={punto} />
      
        <Divider sx={{ borderStyle: 'dashed', my: 3 }} />

        <Grid container spacing={2}>
          {/* Sección Izquierda: Presión + Osmosis */}
          <Grid item xs={12} md={12} lg={5}>
            <PresionOsmosisSection presion={presion} osmosis={osmosis} />
          </Grid>

          {/* Sección Derecha: Niveles con Gráficas */}
          <Grid item xs={12} md={12} lg={7}>
            <NivelSection niveles={niveles} chartDataNiveles={chartDataNiveles} />
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 1: Presión + Osmosis */
/* -------------------------------------------------------------------------- */

function PresionOsmosisSection({ presion, osmosis }: any) {
  return (
    <Box>
      {/* 🔹 Sistemas de Osmosis */}
      {osmosis.map((p: any) => {
        const tds = p.status.find((s: any) => s.code === 'tds_out')?.value;
        const volumeProd = p.status.find((s: any) => s.code === 'flowrate_total_1')?.value;
        const volumeReject = p.status.find((s: any) => s.code === 'flowrate_total_2')?.value;
        const flowRate = p.status.find((s: any) => s.code === 'flowrate_speed_1')?.value;
        const rejectFlow = p.status.find((s: any) => s.code === 'flowrate_speed_2')?.value;
        const temp = p.status.find((s: any) => s.code === 'temperature')?.value;
        const filter1 = p.status.find((s: any) => s.code === 'filter_element_1')?.value;
        const filter2 = p.status.find((s: any) => s.code === 'filter_element_2')?.value;
        const filter3 = p.status.find((s: any) => s.code === 'filter_element_3')?.value;
        const filter4 = p.status.find((s: any) => s.code === 'filter_element_4')?.value;
        const filter5 = p.status.find((s: any) => s.code === 'filter_element_5')?.value;

        return (
          <Box key={p._id} sx={{ mb: 2 }}>
            {/* Card principal con información del equipo */}
            <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <img
                  src={`${CONFIG.ICON_URL}/${p.icon}`}
                  alt={p.name}
                  style={{ width: '50px', height: '50px', marginRight: '12px' }}
                />
                <Box>
                  <Typography variant="h6">{p.name}</Typography>
                  <Chip
                    label={p.online ? 'Online' : 'Offline'}
                    color={p.online ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {/* Datos principales en Grid */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    TDS
                  </Typography>
                  <Typography variant="h6">
                    {tds ?? 'N/A'} <Typography component="span" variant="caption">ppm</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Temperatura
                  </Typography>
                  <Typography variant="h6">
                    {temp ?? 'N/A'} <Typography component="span" variant="caption">°C</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Vol. Total Prod.
                  </Typography>
                  <Typography variant="h6">
                    {volumeProd ?? 'N/A'} <Typography component="span" variant="caption">L</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Vol. Rechazo
                  </Typography>
                  <Typography variant="h6">
                    {volumeReject ?? 'N/A'} <Typography component="span" variant="caption">L</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Flujo Caudal
                  </Typography>
                  <Typography variant="h6">
                    {flowRate ?? 'N/A'} <Typography component="span" variant="caption">L/min</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Flujo Rechazo
                  </Typography>
                  <Typography variant="h6">
                    {rejectFlow ?? 'N/A'} <Typography component="span" variant="caption">L/min</Typography>
                  </Typography>
                </Grid>
              </Grid>
            </Card>

            {/* Card de filtros */}
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Estado de Filtros
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={4}>
                  <Box sx={{ p: 1, bgcolor: 'background.neutral', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      F. Sedimentos
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {filter1 ?? 'N/A'} H
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Box sx={{ p: 1, bgcolor: 'background.neutral', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      F. Carbon Gran.
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {filter2 ?? 'N/A'} H
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Box sx={{ p: 1, bgcolor: 'background.neutral', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      F. Carbon Bloque
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {filter3 ?? 'N/A'} H
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Box sx={{ p: 1, bgcolor: 'background.neutral', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Membrana
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {filter4 ?? 'N/A'} H
                    </Typography>
                  </Box>
                </Grid>
                {filter5 !== undefined && (
                  <Grid item xs={6} sm={4}>
                    <Box sx={{ p: 1, bgcolor: 'background.neutral', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Filtro 5
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {filter5 ?? 'N/A'} H
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Card>
          </Box>
        );
      })}

      {/* 🔹 Medidores de Presión */}
      {presion.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Sensores de Presión
          </Typography>
          {presion.map((p: any) => {
            const presIn = p.status.find((s: any) => s.code === 'presion_in')?.value || 0;
            const presOut = p.status.find((s: any) => s.code === 'presion_out')?.value || 0;
            return (
              <Box key={p._id} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
                  {p.name}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <PressureGauge
                      value={presIn}
                      maxValue={150}
                      unit="PSI"
                      label="Presión Entrada"
                      color="#3b82f6"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <PressureGauge
                      value={presOut}
                      maxValue={150}
                      unit="PSI"
                      label="Presión Salida"
                      color="#8b5cf6"
                    />
                  </Grid>
                </Grid>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 2: Datos Generales con Mapa */
/* -------------------------------------------------------------------------- */

function DatosGenerales({ punto }: any) {
  const geoStates = JSON.parse(JSON.stringify(geoData));
  
  // Obtener coordenadas y estado del punto de venta
  const lat = punto.city?.lat || 19.4326;
  const lon = punto.city?.lon || -99.1332;
  const stateName = punto.city?.state;
  
  // Encontrar el estado en el GeoJSON
  const geoState = geoStates.features.find((geo: any) => geo.properties.state_name === stateName);
  
  // Calcular el centro del estado
  let centerCoordinates: [number, number] = [lon, lat];
  let scale = 3000;
  
  if (geoState) {
    const { coordinates } = geoState.geometry;
    let centerX = 0;
    let centerY = 0;
    let totalPoints = 0;

    const extractCoordinates = (coords: any) => {
      if (Array.isArray(coords[0])) {
        coords[0].forEach((point: any) => {
          centerX += point[0];
          centerY += point[1];
          totalPoints += 1;
        });
      } else {
        coords.forEach((polygon: any) => {
          polygon.forEach((point: any) => {
            centerX += point[0];
            centerY += point[1];
            totalPoints += 1;
          });
        });
      }
    };

    extractCoordinates(coordinates);
    
    const calculatedCenter: [number, number] = [centerX / totalPoints, centerY / totalPoints];
    
    // Usar el centro calculado si es válido, sino usar coordenadas de la ciudad
    if (!calculatedCenter.some(coord => Number.isNaN(coord))) {
      centerCoordinates = calculatedCenter;
    }
    
    // Ajustar scale según el estado (algunos estados son más grandes)
    const stateScales: { [key: string]: number } = {
      "Chihuahua": 2200,
      "Sonora": 2200,
      "Coahuila": 2200,
      "Durango": 2400,
      "Baja California": 2800,
      "Baja California Sur": 2600,
      "Tamaulipas": 2400,
      "Veracruz": 2600,
      "Oaxaca": 2800,
      "Chiapas": 2800,
      "Jalisco": 3200,
      "Nuevo León": 3400,
      "Guanajuato": 3600,
      "Michoacán": 2800,
    };
    
    scale = stateScales[stateName] || 3000;
  }
  
  // Preparar el JSON del estado para el mapa
  const stateGeoJson = geoState ? {
    "type": "FeatureCollection",
    "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    "features": [geoState]
  } : null;

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
                {punto.city?.city}, {punto.city?.state}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lat: {lat.toFixed(4)}, Lon: {lon.toFixed(4)}
              </Typography>
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

        {/* Mapa - Lado Derecho */}
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
              alignItems: 'center'
            }}
          >
            {stateGeoJson ? (
              <Box sx={{ width: '100%', height: '100%' }}>
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{ 
                    scale,
                    center: centerCoordinates
                  }}
                  width={500}
                  height={350}
                  style={{ width: '100%', height: '100%' }}
                >
                  <Geographies geography={stateGeoJson}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill="#a7c5ec"
                          stroke="#1877f2"
                          strokeWidth={0.8}
                          style={{
                            default: { outline: 'none' },
                            hover: { outline: 'none' },
                            pressed: { outline: 'none' },
                          }}
                        />
                      ))
                    }
                  </Geographies>
                  
                  {/* Marcador del punto de venta */}
                  <Marker coordinates={[lon, lat]}>
                    <circle r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                    <text
                      textAnchor="middle"
                      y={-12}
                      fontSize="10"
                      fontFamily="Arial"
                      fontWeight="bold"
                      fill="#1f2937"
                    >
                      {punto.city?.city}
                    </text>
                  </Marker>
                </ComposableMap>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Mapa no disponible
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧱 Sección 3: Niveles */
/* -------------------------------------------------------------------------- */

function NivelSection({ niveles, chartDataNiveles }: any) {
  if (niveles.length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Niveles
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          No hay productos de tipo Nivel
        </Typography>
      </Card>
    );
  }

  return (
    <Box>
      {/* Card con información de todos los niveles */}
      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Niveles de Tanques
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {niveles.map((p: any) => {
            const porcentaje = p.status.find(
              (s: any) => s.code === 'liquid_level_percent'
            )?.value;
            const estado = p.status.find(
              (s: any) => s.code === 'liquid_state'
            )?.value;
            const profundidad = p.status.find(
              (s: any) => s.code === 'liquid_depth'
            )?.value;

            return (
              <Grid item xs={12} sm={6} key={p._id}>
                <Box sx={{ p: 1.5, bgcolor: 'background.neutral', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {p.name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                    <strong>Estado:</strong> {estado ?? '-'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                    <strong>Nivel:</strong> {porcentaje ?? '-'}%
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                    <strong>Profundidad:</strong> {profundidad ?? '-'} cm
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Card>

      {/* Gráfica combinada de todos los niveles */}
      {chartDataNiveles && (
        <SideBarChart
          title="Comparación de Niveles"
          subheader="Niveles y profundidad de todos los tanques"
          chart={chartDataNiveles}
        />
      )}
    </Box>
  );
}
