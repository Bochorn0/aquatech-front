import { Helmet } from 'react-helmet-async';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Geography, Geographies, ComposableMap } from 'react-simple-maps';

import Grid from '@mui/material/Unstable_Grid2';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  Paper,
  Table,
  Button,
  Divider,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  CardHeader,
  TableContainer,
  CircularProgress,
} from '@mui/material';

import geoData from 'src/utils/states.json';

import { CONFIG } from 'src/config-global';
import { get as getV2 } from 'src/api/axiosHelperV2';
import { DashboardContent } from 'src/layouts/dashboard';
import { CalidadHistoricoChart } from 'src/pages/charts/calidad-historico-chart';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type CalidadAguaRecord = {
  id: string;
  municipio: string;
  ciudad: string;
  estado: string;
  calidad: number;
  tdsMinimo: number | null;
  tdsMaximo: number | null;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
};

type StateAggregation = {
  estado: string;
  totalRegistros: number;
  calidadPromedio: number;
  tdsMin: number | null;
  tdsMax: number | null;
  ciudades: string[];
};

type HistoricalRecord = {
  ciudad: string;
  calidad: number;
  tdsMinimo: number | null;
  tdsMaximo: number | null;
  createdAt: string;
};

type GeoJSONFeature = {
  type: string;
  properties: {
    state_name: string;
    state_code: number;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
};

const geoStates = JSON.parse(JSON.stringify(geoData));
const MEXICO_CENTER: [number, number] = [-102.5528, 23.6345];

function getQualityLabel(calidad: number): string {
  if (calidad >= 3.0) return 'Mala';
  if (calidad >= 2.0) return 'Regular';
  return 'Buena';
}

function getQualityColorType(calidad: number): 'error' | 'warning' | 'success' {
  if (calidad >= 3.0) return 'error';
  if (calidad >= 2.0) return 'warning';
  return 'success';
}

// ----------------------------------------------------------------------

export default function CalidadAguaPage() {
  const theme = useTheme();
  const [selectedState, setSelectedState] = useState<number | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [records, setRecords] = useState<CalidadAguaRecord[]>([]);
  const [stateData, setStateData] = useState<StateAggregation[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalRecord[]>([]);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>(MEXICO_CENTER);
  const [scale, setScale] = useState(1400);
  const [stateViewScale, setStateViewScale] = useState(4000);
  const [stateViewCenter, setStateViewCenter] = useState<[number, number]>(MEXICO_CENTER);

  const STATE_ZOOM_MIN = 2500;
  const STATE_ZOOM_MAX = 12000;
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Get color from theme based on quality level
  const getQualityColor = useCallback((calidad: number): string => {
    if (calidad >= 3.0) return theme.palette.error.main;
    if (calidad >= 2.0) return theme.palette.warning.main;
    return theme.palette.success.main;
  }, [theme]);

  const handleMapWheel = useCallback(
    (e: WheelEvent) => {
      if (!selectedState) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -400 : 400;
      setStateViewScale((prev) => Math.max(STATE_ZOOM_MIN, Math.min(STATE_ZOOM_MAX, prev + delta)));
    },
    [selectedState]
  );

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return undefined;
    container.addEventListener('wheel', handleMapWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleMapWheel);
  }, [handleMapWheel]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [recordsRes, stateRes] = await Promise.all([
          getV2<{ data: CalidadAguaRecord[] }>('/calidad-agua'),
          getV2<{ data: StateAggregation[] }>('/calidad-agua/by-state'),
        ]);
        setRecords(recordsRes.data || []);
        setStateData(stateRes.data || []);
      } catch (error) {
        console.error('Error fetching water quality data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStateClick = async (stateCode: number, stateName: string) => {
    if (selectedState === stateCode) {
      // Deselect - return to Mexico view
      setSelectedState(null);
      setSelectedStateName(null);
      setHistoricalData([]);
      setCenterCoordinates(MEXICO_CENTER);
      setScale(1400);
      setStateViewScale(4000);
      setStateViewCenter(MEXICO_CENTER);
    } else {
      // Fetch historical data for the selected state
      setLoadingHistorical(true);
      try {
        const historicalRes = await getV2<{ data: HistoricalRecord[] }>(
          `/calidad-agua/historical/${encodeURIComponent(stateName)}`
        );
        setHistoricalData(historicalRes.data || []);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        setHistoricalData([]);
      } finally {
        setLoadingHistorical(false);
      }
      // Select state - zoom in
      setSelectedState(stateCode);
      setSelectedStateName(stateName);
      
      const geoState = geoStates.features?.find(
        (geo: GeoJSONFeature) => geo.properties.state_code === stateCode
      );
      
      if (geoState) {
        // Calculate the center of the state
        const { coordinates } = geoState.geometry;
        let centerX = 0;
        let centerY = 0;
        let totalPoints = 0;

        // Handle both Polygon and MultiPolygon cases
        const extractCoordinates = (coords: any) => {
          if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
            // Simple polygon
            coords.forEach((point: any) => {
              centerX += point[0];
              centerY += point[1];
              totalPoints += 1;
            });
          } else if (Array.isArray(coords[0])) {
            // MultiPolygon or nested structure
            coords.forEach((polygon: any) => {
              if (Array.isArray(polygon[0]) && typeof polygon[0][0] === 'number') {
                polygon.forEach((point: any) => {
                  centerX += point[0];
                  centerY += point[1];
                  totalPoints += 1;
                });
              } else {
                polygon.forEach((ring: any) => {
                  ring.forEach((point: any) => {
                    centerX += point[0];
                    centerY += point[1];
                    totalPoints += 1;
                  });
                });
              }
            });
          }
        };

        extractCoordinates(coordinates);

        // Calculate centroid
        const center: [number, number] = [centerX / totalPoints, centerY / totalPoints];
        
        // Fallback coordinates for problematic states
        const fallbackCoordinates: { [key: string]: [number, number] } = {
          'Sonora': [-111.5, 29.4],
          'Baja California Sur': [-110.5, 24.5],
          'Baja California': [-115.5, 30.0],
          'Quintana Roo': [-88.25, 19.5],
          'Yucatán': [-89.6, 20.9],
        };

        if (center.some((coord) => Number.isNaN(coord))) {
          const fallback = fallbackCoordinates[stateName] || MEXICO_CENTER;
          setCenterCoordinates(fallback);
          setStateViewCenter(fallback);
        } else {
          setCenterCoordinates(center);
          setStateViewCenter(center);
        }

        // Set zoom level
        setScale(4000);
        setStateViewScale(4000);
      }
    }
  };

  const handleBackToMexico = () => {
    setSelectedState(null);
    setSelectedStateName(null);
    setHistoricalData([]);
    setCenterCoordinates(MEXICO_CENTER);
    setScale(1400);
    setStateViewScale(4000);
    setStateViewCenter(MEXICO_CENTER);
  };

  const filteredRecords = selectedStateName
    ? records.filter((r) => r.estado === selectedStateName)
    : records;

  const selectedStateAgg = stateData.find((s) => s.estado === selectedStateName);

  return (
    <>
      <Helmet>
        <title>Calidad de Agua - {CONFIG.appName}</title>
      </Helmet>

      <DashboardContent maxWidth="xl">
        <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
          Calidad de Agua por Estado
        </Typography>

        <Grid container spacing={3}>
          {/* Map Section */}
          <Grid xs={12} lg={8}>
            <Card>
              <CardHeader
                title={selectedStateName || 'Mapa de México'}
                subheader={
                  selectedStateName
                    ? `Haz clic en el estado para volver al mapa completo`
                    : 'Haz clic en un estado para ver detalles'
                }
                action={
                  selectedState && (
                    <Button variant="outlined" size="small" onClick={handleBackToMexico}>
                      Volver a México
                    </Button>
                  )
                }
              />
              <Divider />
              <Box ref={mapContainerRef} sx={{ position: 'relative', height: '60vh', overflow: 'hidden' }}>
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress />
                  </Box>
                ) : (
                  <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                      center: selectedState ? stateViewCenter : centerCoordinates,
                      scale: selectedState ? stateViewScale : scale,
                    }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <Geographies geography={geoStates}>
                      {({ geographies }) =>
                        geographies.map((geo: any) => {
                          const stateCode = geo.properties.state_code;
                          const stateName = geo.properties.state_name;
                          const stateAgg = stateData.find((s) => s.estado === stateName);
                          const isSelected = selectedState === stateCode;
                          const isVisible = !selectedState || isSelected;

                          if (!isVisible) return null;

                          const fillColor = stateAgg
                            ? getQualityColor(stateAgg.calidadPromedio)
                            : '#CCCCCC';

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onClick={() => handleStateClick(stateCode, stateName)}
                              style={{
                                default: {
                                  fill: fillColor,
                                  stroke: '#FFFFFF',
                                  strokeWidth: 0.5,
                                  outline: 'none',
                                  cursor: 'pointer',
                                },
                                hover: {
                                  fill: fillColor,
                                  stroke: '#000000',
                                  strokeWidth: 1.5,
                                  outline: 'none',
                                  cursor: 'pointer',
                                },
                                pressed: {
                                  fill: fillColor,
                                  stroke: '#000000',
                                  strokeWidth: 2,
                                  outline: 'none',
                                },
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ComposableMap>
                )}
              </Box>
            </Card>
          </Grid>

          {/* Stats Section */}
          <Grid xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title="Estadísticas"
                subheader={selectedStateName || 'Nacional'}
              />
              <Divider />
              <Box sx={{ p: 3 }}>
                {loading ? (
                  <Box display="flex" justifyContent="center">
                    <CircularProgress />
                  </Box>
                ) : selectedStateAgg ? (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Calidad Promedio
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h4">
                          {selectedStateAgg.calidadPromedio.toFixed(2)}
                        </Typography>
                        <Chip
                              label={getQualityLabel(selectedStateAgg.calidadPromedio)}
                              size="small"
                              color={getQualityColorType(selectedStateAgg.calidadPromedio)}
                            />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        TDS Mínimo
                      </Typography>
                      <Typography variant="h6">
                        {selectedStateAgg.tdsMin?.toFixed(2) || 'N/A'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        TDS Máximo
                      </Typography>
                      <Typography variant="h6">
                        {selectedStateAgg.tdsMax?.toFixed(2) || 'N/A'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Ciudades Registradas
                      </Typography>
                      <Typography variant="h6">{selectedStateAgg.totalRegistros}</Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Ciudades:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {selectedStateAgg.ciudades.map((ciudad) => (
                        <Chip key={ciudad} label={ciudad} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Estados con Datos
                    </Typography>
                    <Typography variant="h4" sx={{ mb: 3 }}>
                      {stateData.length}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Ciudades Registradas
                    </Typography>
                    <Typography variant="h4" sx={{ mb: 3 }}>
                      {records.length}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Leyenda:
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            backgroundColor: theme.palette.success.main,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                        <Typography variant="body2">Buena (&lt; 2.0)</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            backgroundColor: theme.palette.warning.main,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                        <Typography variant="body2">Regular (2.0 - 3.0)</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            backgroundColor: theme.palette.error.main,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                        <Typography variant="body2">Mala (&gt;= 3.0)</Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>

          {/* Historical Chart - Only show when state is selected */}
          {selectedStateName && (
            <Grid xs={12}>
              {loadingHistorical ? (
                <Card>
                  <Box display="flex" justifyContent="center" alignItems="center" height={400}>
                    <CircularProgress />
                  </Box>
                </Card>
              ) : (
                <CalidadHistoricoChart
                  title={`Histórico de Calidad de Agua - ${selectedStateName}`}
                  subheader="Evolución de la calidad del agua en los últimos meses"
                  data={historicalData}
                />
              )}
            </Grid>
          )}

          {/* Data Table */}
          <Grid xs={12}>
            <Card>
              <CardHeader
                title={selectedStateName ? `Registros de ${selectedStateName}` : 'Todos los Registros'}
                subheader={`${filteredRecords.length} registro(s)`}
              />
              <Divider />
              <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Estado</TableCell>
                      <TableCell>Ciudad</TableCell>
                      <TableCell>Municipio</TableCell>
                      <TableCell align="center">Calidad</TableCell>
                      <TableCell align="center">TDS Mín</TableCell>
                      <TableCell align="center">TDS Máx</TableCell>
                      <TableCell align="center">Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No hay datos disponibles
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id} hover>
                          <TableCell>{record.estado}</TableCell>
                          <TableCell>{record.ciudad}</TableCell>
                          <TableCell>{record.municipio}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${record.calidad.toFixed(2)} - ${getQualityLabel(record.calidad)}`}
                              size="small"
                              color={getQualityColorType(record.calidad)}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {record.tdsMinimo?.toFixed(2) || 'N/A'}
                          </TableCell>
                          <TableCell align="center">
                            {record.tdsMaximo?.toFixed(2) || 'N/A'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={getQualityLabel(record.calidad)}
                              size="small"
                              color={getQualityColorType(record.calidad)}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}
