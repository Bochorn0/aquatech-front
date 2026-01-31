
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Marker, Geography, Geographies, ComposableMap } from 'react-simple-maps';

import { Box, Grid, Paper, Button, Divider, Tooltip, Typography, CircularProgress } from '@mui/material';

import geoData from 'src/utils/states.json';

import { PieChart } from './charts/pie-chart';

import type { Product, VisitData, MarkerType, MetricsData, MexicoMapProps, GeoJSONFeature } from './types';

const geoStates = JSON.parse(JSON.stringify(geoData));

// Mexico approximate bounds: lon -118 to -86, lat 14 to 33
const isValidMexicoCoord = (lon: number, lat: number) =>
  !Number.isNaN(lon) && !Number.isNaN(lat) && lon >= -118 && lon <= -86 && lat >= 14 && lat <= 33;

const MEXICO_CENTER: [number, number] = [-102.5528, 23.6345];

// Known city coordinates [lon, lat] so markers show in the right place when product lat/lon are wrong or generic
const KNOWN_CITY_COORDINATES: Record<string, [number, number]> = {
  guadalajara: [-103.3496, 20.6597],
  hermosillo: [-110.98, 29.15],
  ensenada: [-116.61, 31.86],
  'ciudad de mexico': [-99.1332, 19.4326],
  cdmx: [-99.1332, 19.4326],
  monterrey: [-100.3161, 25.6866],
  tijuana: [-117.0382, 32.5149],
  leon: [-101.682, 21.124],
  puebla: [-98.2019, 19.0433],
  merida: [-89.6169, 20.9674],
  cancun: [-86.8515, 21.1619],
  zapopan: [-103.4165, 20.7214],
  tlaquepaque: [-103.3111, 20.6142],
  tonala: [-103.2444, 20.6244],
};

function getCityCoordinates(cityName: string, productLat: unknown, productLon: unknown, stateName: string): { lat: number; lon: number } {
  const key = (cityName ?? '').toString().trim().toLowerCase();
  const known = key ? KNOWN_CITY_COORDINATES[key] : null;
  if (known) {
    return { lon: known[0], lat: known[1] };
  }
  const latNum = Number(productLat);
  const lonNum = Number(productLon);
  if (isValidMexicoCoord(lonNum, latNum)) {
    return { lat: latNum, lon: lonNum };
  }
  const stateCentroid = getStateCentroid(stateName);
  const [fallbackLon, fallbackLat] = stateCentroid ?? MEXICO_CENTER;
  return { lat: fallbackLat, lon: fallbackLon };
}

function getStateCentroid(stateName: string): [number, number] | null {
  const geoState = geoStates.features?.find((geo: GeoJSONFeature) => geo.properties.state_name === stateName);
  if (!geoState?.geometry?.coordinates) return null;
  const coords = geoState.geometry.coordinates;
  let centerX = 0;
  let centerY = 0;
  let totalPoints = 0;
  const addRing = (ring: number[][]) => {
    ring.forEach((point: number[]) => {
      centerX += point[0];
      centerY += point[1];
      totalPoints += 1;
    });
  };
  if (typeof coords[0]?.[0] === 'number') {
    addRing(coords as number[][]);
  } else {
    (coords as number[][][][]).forEach((polygon) => (polygon as number[][][]).forEach((ring) => addRing(ring)));
  }
  if (totalPoints === 0) return null;
  return [centerX / totalPoints, centerY / totalPoints];
}

const MexicoMap: React.FC<MexicoMapProps> = ({ originProducts, currentMetrics }) => {
  const [selectedState, setSelectedState] = useState<Number | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MarkerType | null>(null);
  const [heighByState, setHeighByState] = useState('50vh');
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const [productsInView, setProductsInView] = useState<Product[]>([]);
  const [stateGeoJson, setStateGeoJson] = useState<any | null>(null);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>([-102.5528, 23.6345]);
  const [scale, setScale] = useState(1400);
  const [stateViewScale, setStateViewScale] = useState(4000);
  const [stateViewCenter, setStateViewCenter] = useState<[number, number]>([-102.5528, 23.6345]);

  const STATE_ZOOM_MIN = 2500;
  const STATE_ZOOM_MAX = 12000;
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleMapWheel = useCallback(
    (e: WheelEvent) => {
      if (!selectedState) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -400 : 400;
      setStateViewScale((prev) => Math.min(STATE_ZOOM_MAX, Math.max(STATE_ZOOM_MIN, prev + delta)));
    },
    [selectedState]
  );

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return () => {};
    el.addEventListener('wheel', handleMapWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleMapWheel);
  }, [handleMapWheel]);

  useEffect(() => {
    const processProducts = async () => {
      try {
        const newMarkers: MarkerType[] = [];
        const cities: { name: string, state: string, lat: number, lon: number }[] = [];
        let products = originProducts as Product[];
        const metrics = currentMetrics as MetricsData;
        console.log('metrics:', metrics);
        if (metrics.filter_only_online) {
          products = products.filter((p) => p.online) as Product[];
        }
        products.forEach((product) => {
          const cityName = product.city;
          if (!cityName || cities.some((c) => c.name === cityName)) return;

          const { lat, lon } = getCityCoordinates(
            cityName,
            product.lat,
            product.lon,
            product.state ?? ''
          );
          cities.push({ name: cityName, state: product.state ?? '', lat, lon });
        });
        cities.forEach((city) => {
          const state_code = geoStates.features.find((geo: GeoJSONFeature) => geo.properties.state_name === city.state)?.properties.state_code;
          const cityProducts = products.filter((product) => product.city === city.name);
          
          if (cityProducts.length > 0) {
            const tdsEnRango = cityProducts.filter((product) => {
              const tds = product.status.find(s => s.code === 'tds_out')?.value;
              return tds && tds >= metrics.tds_range;
            });
            const tdsFueraRango = cityProducts.filter((product) => {
              const tds = product.status.find(s => s.code === 'tds_out')?.value;
              return tds && tds < metrics.tds_range;
            });
            const enRangoProduccion = cityProducts.filter((product) => {
              const flowrate = product.status.find(s => s.code === 'flowrate_total_1')?.value;
              return flowrate && flowrate >= metrics.production_volume_range / 10;
            });
            const fueraRangoProduccion = cityProducts.filter((product) => {
              const flowrate = product.status.find(s => s.code === 'flowrate_total_1')?.value;
              return flowrate && flowrate <  metrics.production_volume_range / 10;
            });
            newMarkers.push({
              name: city.name,
              state: city.state,
              state_code,
              color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
              total: cityProducts.length,
              tdsEnRango: tdsEnRango.length,
              tdsFueraRango: tdsFueraRango.length,
              enRangoProduccion: enRangoProduccion.length,
              fueraRangoProduccion: fueraRangoProduccion.length,
              totalOnline: cityProducts.filter((p) => p.online).length,
              totalEnRango: tdsEnRango.length + enRangoProduccion.length,
              coordinates: [city.lon, city.lat],
            });
          }
        });

        setMarkers(newMarkers);
        setProductsInView(products);
      } catch (error) {
        console.error('Error fetching products:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
        }
      } finally {
        setLoading(false);
      }
    };

    processProducts();
  }, [originProducts, currentMetrics]);

  const handleStateClick = async (stateCode: number) => {
    if (!stateCode) {
      console.error('State code is not valid');
      return;
    }
    setScale(4000); // Adjust the zoom level to zoom in when the state is selected.
    if (stateCode === 8) {
      setHeighByState('60vh');
      setScale(3800); // Adjust the zoom level to zoom in when the state is selected.
    }
    setSelectedState(stateCode);
    try {
      const geoState = geoStates.features.find((geo: GeoJSONFeature) => geo.properties.state_code === stateCode);
      if (geoState?.properties?.state_name) {
        setSelectedStateName(geoState.properties.state_name);
      }
  
      if (geoState) {
        // Calculate the center of the state by averaging the coordinates (centroid-like logic)
        const { coordinates } = geoState.geometry;
        let centerX = 0;
        let centerY = 0;
        let totalPoints = 0;
  
        // Handle both Polygon and MultiPolygon cases
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
  
        // Calculate average of all points (simple centroid calculation)
        const center: [number, number] = [centerX / totalPoints, centerY / totalPoints]; // Explicitly cast as tuple
        if (center.some(coord => Number.isNaN(coord))) { 
          const fallbackCoordinates: { [key: string]: [number, number] } = {
            "Sonora": [-111.5, 29.4],
            "Baja California Sur": [-110.5, 24.5 ],
            "Baja California": [-115.5, 30.0],
            "Quintana Roo": [-88.25, 19.5],
            "Yucatán": [-89.6, 20.9],
          };
          const fallback = fallbackCoordinates[geoState.properties.state_name];
          setCenterCoordinates(fallback || center);
          setStateViewCenter((fallback || center) as [number, number]);
        } else {
          setCenterCoordinates(center);
          setStateViewCenter(center);
        }
        setStateViewScale(stateCode === 8 ? 3800 : 4000);
        const stateJson = {
          "type": "FeatureCollection",
          "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
          "features": [geoState]
        };
  
        setStateGeoJson(stateJson);
  
        const stateMarker = markers.find((marker) => marker.state === geoState.properties.state_name);
        if (stateMarker) { 
          setSelectedMarker(stateMarker);
        }
      } else {
        console.error('State not found in GeoJSON');
      }
    } catch (error) {
      console.error('Error fetching state GeoJSON:', error);
    }
  };
  

  const handleBackClick = () => {
    setSelectedState(null);
    setSelectedStateName(null);
    setStateGeoJson(null);
    setCenterCoordinates([-102.5528, 23.6345]); // Reset center to Mexico
    setScale(1400); // Reset zoom level to the default scale
    setSelectedMarker(null); // Reset selected marker
  };

  // Product-level pins for the selected state: use city/state coords so pins appear inside the state view
  const productsInSelectedState = selectedStateName
    ? productsInView.filter((p) => (p.state ?? '').toString().trim() === selectedStateName.trim())
    : [];
  const productPinCoords = productsInSelectedState.map((p) => {
    // In state view, prefer city-based coords so pins show inside the state (product lat/lon may be wrong/from another state)
    const { lat, lon } = getCityCoordinates(p.city ?? '', p.lat, p.lon, p.state ?? '');
    return { product: p, coordinates: [lon, lat] as [number, number] };
  });

  const effectiveScale = selectedState ? stateViewScale : scale;
  const effectiveCenter = selectedState ? stateViewCenter : centerCoordinates;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
      <Grid container>
        <Grid item xs={12} sm={12} md={12} p={2} alignContent="center">
          <Typography variant="h4" gutterBottom>
            {selectedState
              ? `Detalle en ${selectedStateName ?? 'estado'} — ${productPinCoords.length} equipos (scroll para zoom)`
              : 'Mapa de México — pins por ciudad con productos'}
          </Typography>
          <Divider sx={{ borderStyle: 'dashed', mt: 1 }} />
        </Grid>
        <Grid item xs={12} sm={12} md={selectedMarker ? 7: 12} >
          <div
            ref={mapContainerRef}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: selectedMarker ? heighByState : '100vh' }}
            role="presentation"
          >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: effectiveScale, center: effectiveCenter }}
            >
              <Geographies geography={selectedState ? stateGeoJson : geoData}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#ddd"
                      stroke="#ccc"
                      strokeWidth={0.5}
                      onClick={() => {
                        if (!selectedState) {
                          handleStateClick(geo.properties.state_code);
                        }
                      }}
                        style={{
                          default: {
                            cursor: 'pointer',
                            fill: selectedState === geo.properties.state_code ? '#1877f2' : '#a7c5ec',
                          },
                        }}
                    />
                  ))
                }
              </Geographies>

              {/* Country view: one pin per city that has products */}
              {markers
                .filter((marker) => !selectedState)
                .map((marker, index) => (
                  <Marker key={`city-${index}`} coordinates={marker.coordinates} onClick={() => handleStateClick(marker.state_code)}>
                    <circle r={4} fill={marker.color} stroke="#fff" strokeWidth={4} />
                    <Tooltip title={`${marker.name}: ${marker.total} productos`}>
                      <text textAnchor="right" y={-4} x={6} fontSize="6" fontFamily="Arial" fontWeight="bold" fill="black">
                        {marker.name}
                      </text>
                    </Tooltip>
                  </Marker>
              ))}
              {/* State view: one pin per product with real lat/lon for tracking */}
              {selectedState &&
                productPinCoords.map(({ product, coordinates }, index) => (
                  <Marker key={`product-${product.id ?? product._id ?? index}`} coordinates={coordinates}>
                    <circle r={3} fill="#e53935" stroke="#fff" strokeWidth={2} />
                    <Tooltip
                      title={
                        <Box component="span">
                          <Typography variant="caption" display="block" fontWeight="bold">{product.name}</Typography>
                          <Typography variant="caption" display="block">{product.city ?? ''}, {product.state ?? ''}</Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            lat: {Number(product.lat)}, lon: {Number(product.lon)}
                          </Typography>
                        </Box>
                      }
                    >
                      <text textAnchor="right" y={-2} x={5} fontSize="5" fontFamily="Arial" fill="black">
                        {product.name?.slice(0, 12)}
                      </text>
                    </Tooltip>
                  </Marker>
                ))}
            </ComposableMap>
          </div>
        </Grid>
        <Grid item xs={12} sm={12} md={selectedMarker ? 5: 0} >
        {selectedState && !selectedMarker && (
          <Button onClick={handleBackClick} variant="contained" color="primary" style={{width: '100%'}}>
            Ver Mapa completo
          </Button>
        )}
        {selectedMarker && (
          <Paper>
            <Button onClick={handleBackClick} variant="contained" color="primary" style={{width: '100%'}}>
              Ver Mapa completo
            </Button>
            <PieChart
              title={`Estatus de equipos: ${selectedMarker.total}`}
              chart={{
                series: [
                  { label: 'En Rango Tds', value: selectedMarker.tdsEnRango },
                  { label: 'Fuera de Rango Tds', value: selectedMarker.tdsFueraRango },
                  { label: 'En Rango Producción', value: selectedMarker.enRangoProduccion },
                  { label: 'Fuera de Rango Producción', value: selectedMarker.fueraRangoProduccion }
                ],
              } as VisitData}
            />
          </Paper>
          )}
        </Grid>
      </Grid>
  );
};
export default MexicoMap;
