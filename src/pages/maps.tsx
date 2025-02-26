import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import React, { useState, useEffect } from 'react';
import { Marker, Geography, Geographies, ComposableMap } from 'react-simple-maps';

import { Box, Paper, Typography, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';

const citiesCoordinates = [
  { name: "Tijuana", lat: 32.5149, long: -117.0172 },
  { name: "Culiacan", lat: 25.4387, long: -107.3896 },
  { name: "Cd. Juarez", lat: 31.7619, long: -106.4877 },
  { name: "Hermosillo", lat: 29.072967, long: -110.9773 },
];

interface MarkerType {
  name: string;
  color: string;
  total: number;
  activos: number;
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
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<MarkerType[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/products/mocked`);
        const products: Product[] = response.data;

        const newMarkers: MarkerType[] = [];

        citiesCoordinates.forEach((city) => {
          const cityProducts = products.filter((product) => product.city === city.name);

          if (cityProducts.length > 0) {
            const activeCount = cityProducts.filter((product) => product.online).length;
            const failingCount = cityProducts.filter((product) => {
              const flowrate = product.status.find(s => s.code === 'flowrate_total_2')?.value;
              return flowrate && flowrate < 2;
            }).length;

            if (city.lat !== undefined && city.long !== undefined) {
              newMarkers.push({
                name: city.name,
                color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
                total: cityProducts.length,
                activos: activeCount,
                fallando: failingCount,
                coordinates: [city.long, city.lat], // Ensure correct order [longitude, latitude]
              });
            }
          }
        });

        console.log('Markers:', newMarkers);
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
  }, []); // Dependency array remains empty to prevent infinite loops

  const handleStateClick = (stateName: string) => {
    setSelectedState(selectedState === stateName ? null : stateName);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1200,
          center: [-102.5528, 23.6345],
        }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#222"
                stroke="#111"
                strokeWidth={0.5}
                onClick={() => handleStateClick(geo.properties.name)} // On Geography click
                style={{
                  default: {
                    cursor: 'pointer',
                    fill: selectedState === geo.properties.name ? '#444' : '#333',
                  },
                }}
              />
            ))
          }
        </Geographies>

        {markers
          .filter((marker) => !selectedState || marker.name === selectedState) // Render only the selected state's marker
          .map((marker, index) => (
          <Marker key={index} coordinates={marker.coordinates}>
            {/* Circle for marker */}
            <circle
              r={2}
              fill={marker.color} // Red if there are failing products
              stroke="#fff"
              strokeWidth={1}
            />
          
            <text
              textAnchor="right"
              y={-4}
              x={2}
              fontSize="10"
              fontFamily="Arial"
              fontWeight="bold"
              fill="black"
            >
              {marker.name}
            </text>

            <text textAnchor="right" y={5} x={2} fontSize="8" fontFamily="Arial" fill="blue">
              Total: {marker.total}
            </text>
            <text textAnchor="rigth" y={15} x={2} fontSize="8" fontFamily="Arial" fill="#008F39">
              Activos: {marker.activos}
            </text>
            <text textAnchor="right" y={25} x={2} fontSize="8" fontFamily="Arial" fill="#FF0000">
              Bajo Vol.: {marker.fallando}
            </text>
          </Marker>
        ))}

      </ComposableMap>
    </div>
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
