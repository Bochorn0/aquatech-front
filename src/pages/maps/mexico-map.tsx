import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { Marker, Geography, Geographies, ComposableMap } from 'react-simple-maps';

import { Box, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';

const citiesCoordinates = [
  { name: "Tijuana", lat: 32.5149, long: -117.0172 },
  { name: "Culiacan", lat: 25.4387, long: -107.3896 },
  { name: "Cd. Juarez", lat: 31.7619, long: -106.4877 },
  { name: "Hermosillo", lat: 29.072967, long: -110.9773 },
];

interface MarkerType {
  name: string;
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
              return flowrate && flowrate < 2.5;
            }).length;

            if (city.lat !== undefined && city.long !== undefined) {
              newMarkers.push({
                name: city.name,
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
        width={600}
        height={450}
        projection="geoMercator"
        projectionConfig={{
          scale: 1000,
          center: [-102.5528, 23.6345],
        }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={selectedState === geo.properties.name ? '#FF5733' : '#ddd'}
                stroke="#fff"
                strokeWidth={0.5}
                onClick={() => handleStateClick(geo.properties.name)}
                style={{
                  default: {
                    cursor: 'pointer',
                  },
                }}
              />
            ))
          }
        </Geographies>

        {markers.map((marker, index) => (
          <Marker key={index} coordinates={marker.coordinates}>
            <circle r={5} fill="#008F39" />
            <text textAnchor="middle" y={-20} style={{ fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold' }}>
              {marker.name}
            </text>
            <text textAnchor="middle" y={-5} style={{ fontSize: 10, fontFamily: 'Arial' }}>
              Total: {marker.total}, Activos: {marker.activos}, `Volumen - 2.5`: {marker.fallando}
            </text>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
};

export default MexicoMap;
