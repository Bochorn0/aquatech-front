
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { Marker, Geography, Geographies, ComposableMap } from 'react-simple-maps';

import { Box, Grid, Paper, Button, Tooltip, Typography, CircularProgress } from '@mui/material';

import geoData from 'src/utils/states.json';

import { CONFIG } from 'src/config-global';

import { PieChart } from './charts/pie-chart';

const geoStates = JSON.parse(JSON.stringify(geoData));

interface MarkerType {
  name: string;
  state: string;
  state_code: number;
  color: string;
  total: number;
  totalOnline: number;
  totalEnRango: number;
  totalRangoOnline: number;
  totalFueraRango: number;
  totalFueraRangoOnline: number;
  fallando: number;
  coordinates: [number, number];
}

interface Status {
  code: string;
  value: any;
}

interface Product {
  id: string;
  name: string;
  city: string;
  drive: string;
  online: boolean;
  icon: string;
  status: Status[];
  [key: string]: any;
}

interface StateProperties {
  state_name: string;
  state_code: number;
  centroid: [number, number];
}

interface GeoJSONFeature {
  type: string;
  properties: StateProperties;
  geometry: {
    type: string;
    coordinates: any;
  };
}

interface VisitData {
  series: { label: string; value: number }[];
}

const MexicoMap: React.FC = () => {
  const [selectedState, setSelectedState] = useState<Number | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MarkerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const [stateGeoJson, setStateGeoJson] = useState<any | null>(null);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>([-102.5528, 23.6345]);
  const [scale, setScale] = useState(1400);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        const response = await axios.get(`${CONFIG.API_BASE_URL}/products/mocked`);
        const products: Product[] = response.data;
        const newMarkers: MarkerType[] = [];
        const cities: { name: string, state: string, lat: number, lon: number }[] = [];

        products.forEach((product) => {
          const cityName = product.city;

          if (!cities.find(city => city.name === cityName)) {
            cities.push({ name: cityName, state: product.state, lat: product.lat, lon: product.lon });
          }
        });

        cities.forEach((city) => {
          const state_code = geoStates.features.find((geo: GeoJSONFeature) => geo.properties.state_name === city.state)?.properties.state_code;
          const cityProducts = products.filter((product) => product.city === city.name);

          if (cityProducts.length > 0) {
            const totOnline = cityProducts.filter((product) => product.online).length;
            const enRango = cityProducts.filter((product) => {
              const flowrate = product.status.find(s => s.code === 'flowrate_total_1')?.value;
              return flowrate && flowrate >= 20;
            });
            const totRangoOnline = enRango.filter((product) => product.online).length;
            const fueraRango = cityProducts.filter((product) => {
              const flowrate = product.status.find(s => s.code === 'flowrate_total_1')?.value;
              return flowrate && flowrate < 20;
            });
            const totFueraRangoOnline = fueraRango.filter((product) => product.online).length;

            newMarkers.push({
              name: city.name,
              state: city.state,
              state_code,
              color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
              total: cityProducts.length,
              totalOnline: totOnline,
              totalEnRango: enRango.length,
              totalRangoOnline: totRangoOnline,
              totalFueraRango: fueraRango.length,
              totalFueraRangoOnline: totFueraRangoOnline,
              fallando: cityProducts.length - totOnline,
              coordinates: [city.lon, city.lat],
            });
          }
        });

        setMarkers(newMarkers);
      } catch (error) {
        console.error('Error fetching products:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    const interval = setInterval(fetchProducts, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleStateClick = async (stateCode: number) => {
    if (!stateCode) {
      console.error('State code is not valid');
      return;
    }
  
    setSelectedState(stateCode);
    setScale(4000); // Adjust the zoom level to zoom in when the state is selected.
  
    try {
      const geoState = geoStates.features.find((geo: GeoJSONFeature) => geo.properties.state_code === stateCode);
  
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
        } else {
          setCenterCoordinates(center);
        }
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
    setStateGeoJson(null);
    setCenterCoordinates([-102.5528, 23.6345]); // Reset center to Mexico
    setScale(1400); // Reset zoom level to the default scale
    setSelectedMarker(null); // Reset selected marker
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
      <Grid container>
        <Grid item xs={selectedMarker ? 7: 12}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale, center: centerCoordinates }}
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
                          fill: selectedState === geo.properties.state_name ? '#1877f2' : '#a7c5ec',
                        },
                      }}
                    />
                  ))
                }
              </Geographies>

              {markers
                .filter((marker) => !selectedState)
                .map((marker, index) => (
                  <Marker key={index} coordinates={marker.coordinates} onClick={() => handleStateClick(marker.state_code) } >
                    <circle r={4} fill={marker.color} stroke="#fff" strokeWidth={4} />
                    <Tooltip title={`${marker.name}: ${marker.total} products`}>
                      <text textAnchor="right" y={-4} x={6} fontSize="6" fontFamily="Arial" fontWeight="bold" fill="black">
                        {marker.name}
                      </text>
                    </Tooltip>
                    {/* <text textAnchor="right" y={5} x={6} fontSize="8" fontFamily="Arial" fill="blue">
                      #:{marker.total}
                    </text> */}
                  </Marker>
              ))}
            </ComposableMap>
          </div>
        </Grid>
        <Grid item xs={selectedMarker ? 5: 0} sx={{ padding: 2 }}>
        {selectedMarker && (
          <Paper sx={{ padding: 2 }}>
            <Typography variant="h4" gutterBottom>
              Detalle de {selectedMarker.state}
              <Typography variant="h6" gutterBottom color="#b18276">
                {selectedMarker ? selectedMarker.name : (selectedState ? "Metricas" : "Select a Location")}
              </Typography>
              <Button onClick={handleBackClick} variant="contained" sx={{ marginTop: 2 }}>
                Ver Mapa completo
              </Button>
            </Typography>
            <PieChart
              title={`Estatus de equipos: ${selectedMarker.total}`}
              chart={{
                series: [
                  { label: 'Online', value: selectedMarker.totalOnline },
                  { label: 'En Rango', value: selectedMarker.totalEnRango },
                  // { label: 'En Rango Online', value: selectedMarker.totalRangoOnline },
                  { label: 'Fuera de Rango', value: selectedMarker.totalFueraRango },
                  // { label: 'Fuera de Rango Online', value: selectedMarker.totalFueraRangoOnline },
                  // { label: 'Offline', value: selectedMarker.total - selectedMarker.totalOnline },
                  { label: 'Fallando', value: selectedMarker.fallando },
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
