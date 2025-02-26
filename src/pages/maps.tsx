import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import React, { useState, useEffect } from 'react';
import { Marker, Geography, Geographies, ComposableMap } from 'react-simple-maps';

import { Box, Grid, Paper, Typography, CircularProgress,  } from '@mui/material';

import { CONFIG } from 'src/config-global';

interface MarkerType {
  name: string;
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

const geoUrl = 'https://raw.githubusercontent.com/strotgen/mexico-leaflet/refs/heads/master/states.geojson';

const MexicoMap: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MarkerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<MarkerType[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/products/mocked`);
        const products: Product[] = response.data;
        const newMarkers: MarkerType[] = [];
        const cities: { name: string, lat: number, lon: number }[] = [];
  
        // Iterate over the products to update city data and generate markers
        products.forEach((product) => {
          const cityName = product.city;
 
          // If cityCoordinates doesn't exist, create a new one
          if (!cities.find(city => city.name === cityName)) {
            // Add to the updatedCitiesCoordinates if it doesn't already exist
            cities.push({ name: cityName, lat: product.lat, lon: product.lon });
          }
        });
  
        // Process markers
        cities.forEach((city) => {
          const cityProducts = products.filter((product) => product.city === city.name);
  
          if (cityProducts.length > 0) {            
            // Count failing products
            const totOnline = cityProducts.filter((product) => product.online).length;
            const enRango = cityProducts.filter((product) => {
              const flowrate = product.status.find(s => s.code === 'flowrate_total_1')?.value;
              return flowrate && flowrate >= 20;
            });
            const totRangoOnline = enRango.filter((product) => product.online).length;
            // Get products out of range
            const fueraRango = cityProducts.filter((product) => {
              const flowrate = product.status.find(s => s.code === 'flowrate_total_1')?.value;
              return flowrate && flowrate < 20;
            });
            const totFueraRangoOnline = fueraRango.filter((product) => product.online).length;
  
            // Push the city marker data
            newMarkers.push({
              name: city.name,
              color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`, // Random color
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
      } finally {
        setLoading(false);
      }
    };
  
    fetchProducts();
    const interval = setInterval(fetchProducts, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkerClick = (marker: MarkerType) => {
    setSelectedMarker(marker);
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
      <Grid item xs={9}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 1500,
              center: [-102.5528, 23.6345],
            }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#ddd"
                    stroke="#ccc"
                    strokeWidth={0.5}
                    onClick={() => setSelectedState(geo.properties.name)}
                    style={{
                      default: {
                        cursor: 'pointer',
                        fill: selectedState === geo.properties.name ? '#c0a8a2' : '#b18276',
                      },
                    }}
                  />
                ))
              }
            </Geographies>

            {markers
              .filter((marker) => !selectedState || marker.name === selectedState)
              .map((marker, index) => (
                <Marker key={index} coordinates={marker.coordinates} onClick={() => handleMarkerClick(marker)}>
                  <circle r={4} fill={marker.color} stroke="#fff" strokeWidth={2} />
                  <text textAnchor="right" y={-4} x={6} fontSize="10" fontFamily="Arial" fontWeight="bold" fill="black">
                    {marker.name}
                  </text>
                  <text textAnchor="right" y={5} x={6} fontSize="8" fontFamily="Arial" fill="blue">
                    #:{marker.total}
                  </text>
                </Marker>
            ))}
          </ComposableMap>
        </div>
      </Grid>

      {/* Legend Panel */}
      <Grid item xs={3} sx={{ padding: 2 }}>
        {selectedMarker && (
          <Paper elevation={3} sx={{ padding: 2 }} style={{ border: 1 , borderColor: selectedMarker.color }}>
            <Typography variant="h6" gutterBottom color={selectedMarker.color}>
              {selectedMarker.name}
            </Typography>
            <Typography variant="body1">Total: {selectedMarker.total}</Typography>
            <Typography variant="body1">Online: {selectedMarker.totalOnline}</Typography>
            <Typography variant="body1">En Rango: {selectedMarker.totalEnRango}</Typography>
            <Typography variant="body1">Online en Rango: {selectedMarker.totalRangoOnline}</Typography>
            <Typography variant="body1">Fuera de Rango: {selectedMarker.totalFueraRango}</Typography>
            <Typography variant="body1">Online Fuera de Rango: {selectedMarker.totalFueraRangoOnline}</Typography>
            <Typography variant="body1">Fallando: {selectedMarker.fallando}</Typography>
          </Paper>
        )}
      </Grid>
    </Grid>
  );
};

function MapsPage() {
  return (
    <>
      <Helmet>
        <title> {`Covertura de equipos - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box sx={{ p: 2 }}>
        {/* FILTERS */}
      </Box>
        <Box sx={{ p: 2 }}>
          <Paper elevation={3}>
            <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
              Detalle Equipos en México
            </Typography>
            <MexicoMap />
          </Paper>
        </Box>
    </>
  );
}

export default MapsPage;
