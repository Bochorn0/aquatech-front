import React, { useState } from 'react';
import { Marker, Geography, Geographies, ComposableMap } from 'react-simple-maps';

interface MarkerType {
  name: string;
  total: number;
  active: number;
  pending: number;
  failing: number;
  coordinates: [number, number]; // Latitude, Longitude
}

const geoUrl = 'https://raw.githubusercontent.com/strotgen/mexico-leaflet/refs/heads/master/states.geojson';

const markers: MarkerType[] = [
  { name: "Hermosillo", total: 800, active: 700, pending: 50, failing: 50, coordinates: [-110.9773, 29.072967] },
  { name: "Sinaloa", total: 400, active: 350, pending: 30, failing: 20, coordinates: [-107.3896, 25.4387] },
  { name: "CDMX", total: 600, active: 500, pending: 60, failing: 40, coordinates: [-99.1332, 19.4326] },
  { name: "Guadalajara", total: 750, active: 650, pending: 50, failing: 50, coordinates: [-103.3496, 20.6597] },
  { name: "Monterrey", total: 900, active: 800, pending: 70, failing: 30, coordinates: [-100.3161, 25.6718] },
];

const MexicoMap: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Handle state selection
  const handleStateClick = (stateName: string) => {
    setSelectedState(selectedState === stateName ? null : stateName); // Toggle selection
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <ComposableMap
        width={600} // Adjusted map size
        height={450}
        projection="geoMercator"
        projectionConfig={{
          scale: 1000, // Adjusted scale for the map
          center: [-102.5528, 23.6345], // Center of Mexico
        }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#ddd"
                stroke="#fff"
                strokeWidth={0.5}
                onClick={() => handleStateClick(geo.properties.name)} // On Geography click
                style={{
                  default: {
                    cursor: 'pointer',
                    fill: selectedState === geo.properties.name ? '#FF5733' : '#ddd',
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
              <circle r={5} fill="#FF5733" />
              <text textAnchor="middle" y={-20} style={{ fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold' }}>
                {marker.name}
              </text>
              <text textAnchor="middle" y={-5} style={{ fontSize: 10, fontFamily: 'Arial' }}>
                Total: {marker.total}, Active: {marker.active}, Pending: {marker.pending}, Failing: {marker.failing}
              </text>
            </Marker>
          ))}
      </ComposableMap>
    </div>
  );
};

export default MexicoMap;
