import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import geoData from 'src/utils/states.json';

type GeoJSONFeature = {
  type: string;
  properties: { state_code: number; state_name: string; [key: string]: unknown };
  geometry: { type: string; coordinates: number[] | number[][][] | number[][][][] };
};

const geoStates = JSON.parse(JSON.stringify(geoData)) as { features: GeoJSONFeature[] };

const MEXICO_CENTER: [number, number] = [-102.5528, 23.6345];
const isValidMexicoCoord = (lon: number, lat: number) =>
  !Number.isNaN(lon) && !Number.isNaN(lat) && lon >= -118 && lon <= -86 && lat >= 14 && lat <= 33;

/** Map API/DB state names to geo state_name (states.json) */
function normalizeStateToGeo(state: string | null | undefined): string {
  if (!state || typeof state !== 'string') return '';
  const s = state.trim();
  const normalized = s
    .replace(/\s+/g, ' ')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
  const lower = normalized.toLowerCase();
  const noSpace = normalized.replace(/\s/g, '');
  const matched = geoStates.features.find((feature) => {
    const name = feature.properties.state_name;
    const nameNorm = name.replace(/\s+/g, ' ').toLowerCase();
    const nameNoSpace = name.replace(/\s/g, '').toLowerCase();
    return (
      nameNorm === lower ||
      nameNoSpace === noSpace.toLowerCase() ||
      nameNoSpace.includes(noSpace.toLowerCase()) ||
      noSpace.toLowerCase().includes(nameNoSpace)
    );
  });
  return matched ? matched.properties.state_name : s;
}

function getStateCentroid(stateName: string): [number, number] | null {
  const geoState = geoStates.features?.find((g: GeoJSONFeature) => g.properties.state_name === stateName);
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
  const c = coords as number[][] | number[][][][];
  const first = c[0];
  if (Array.isArray(first) && typeof first[0] === 'number') {
    addRing(c as number[][]);
  } else {
    (c as number[][][][]).forEach((polygon: number[][][]) =>
      polygon.forEach((ring: number[][]) => addRing(ring))
    );
  }
  if (totalPoints === 0) return null;
  return [centerX / totalPoints, centerY / totalPoints];
}

export type PuntoVentaMapItem = {
  id: string;
  _id?: string;
  name: string;
  clientId?: string;
  cliente?: { id?: string; _id?: string; name: string } | string;
  online?: boolean;
  lat?: number | null;
  long?: number | null;
  city?: {
    city?: string;
    state?: string;
    lat?: number;
    lon?: number;
  } | null;
};

type DashboardV2MapProps = {
  puntos: PuntoVentaMapItem[];
};

export function DashboardV2Map({ puntos }: DashboardV2MapProps) {
  const [selectedState, setSelectedState] = useState<number | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [stateGeoJson, setStateGeoJson] = useState<typeof geoData | null>(null);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>(MEXICO_CENTER);
  const [scale, setScale] = useState(1400);
  const [stateViewScale, setStateViewScale] = useState(4000);
  const [stateViewCenter, setStateViewCenter] = useState<[number, number]>(MEXICO_CENTER);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const STATE_ZOOM_MIN = 2500;
  const STATE_ZOOM_MAX = 12000;
  const handleMapWheel = useCallback(
    (e: WheelEvent) => {
      if (!selectedState) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -400 : 400;
      setStateViewScale((prev) => Math.min(STATE_ZOOM_MAX, Math.max(STATE_ZOOM_MIN, prev + delta)));
    },
    [selectedState]
  );

  React.useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return () => {};
    el.addEventListener('wheel', handleMapWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleMapWheel);
  }, [handleMapWheel]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    puntos.forEach((pv) => {
      const rawState = pv.city?.state ?? '';
      const stateName = normalizeStateToGeo(rawState) || (rawState || 'Sin estado');
      counts[stateName] = (counts[stateName] ?? 0) + 1;
    });
    return counts;
  }, [puntos]);

  const stateMarkers = useMemo(
    () =>
      Object.entries(stateCounts)
        .filter(([, count]) => count > 0)
        .map(([stateName, count]) => ({
          stateName,
          stateCode: geoStates.features?.find(
            (f: GeoJSONFeature) => f.properties.state_name === stateName
          )?.properties.state_code,
          count,
          coordinates: (getStateCentroid(stateName) ?? MEXICO_CENTER) as [number, number],
        }))
        .filter((m) => m.stateCode != null),
    [stateCounts]
  );

  const handleStateClick = useCallback(
    (stateCode: number) => {
      setSelectedState(stateCode);
      const geoState = geoStates.features.find((g: GeoJSONFeature) => g.properties.state_code === stateCode);
      if (geoState?.properties?.state_name) {
        setSelectedStateName(geoState.properties.state_name);
      }
      if (geoState?.geometry?.coordinates) {
        const coords = geoState.geometry.coordinates as number[][] | number[][][][];
        const first = coords[0];
        let centerX = 0;
        let centerY = 0;
        let totalPoints = 0;
        const addRing = (ring: number[][]) => {
          ring.forEach((p: number[]) => {
            centerX += p[0];
            centerY += p[1];
            totalPoints += 1;
          });
        };
        if (Array.isArray(first) && typeof first[0] === 'number') {
          addRing(coords as number[][]);
        } else {
          (coords as number[][][][]).forEach((polygon: number[][][]) =>
            polygon.forEach((ring: number[][]) => addRing(ring))
          );
        }
        if (totalPoints > 0) {
          const center: [number, number] = [centerX / totalPoints, centerY / totalPoints];
          if (!center.some(Number.isNaN)) {
            setCenterCoordinates(center);
            setStateViewCenter(center);
          }
        }
        setStateViewScale(stateCode === 8 ? 3800 : 4000);
        setStateGeoJson({
          type: 'FeatureCollection',
          features: [geoState],
        } as typeof geoData);
      }
    },
    []
  );

  const handleBackClick = useCallback(() => {
    setSelectedState(null);
    setSelectedStateName(null);
    setStateGeoJson(null);
    setCenterCoordinates(MEXICO_CENTER);
    setStateViewCenter(MEXICO_CENTER);
    setScale(1400);
  }, []);

  const puntosInSelectedState = useMemo(() => {
    if (!selectedStateName) return [];
    return puntos.filter((pv) => {
      const raw = pv.city?.state ?? '';
      const normalized = normalizeStateToGeo(raw);
      return normalized === selectedStateName || (raw && !normalized && raw.trim() === selectedStateName);
    });
  }, [puntos, selectedStateName]);

  const getPvCoords = useCallback(
    (pv: PuntoVentaMapItem): [number, number] => {
      const lonNum = typeof (pv.long ?? pv.city?.lon) === 'number' ? (pv.long ?? pv.city?.lon)! : Number(pv.long ?? pv.city?.lon);
      const latNum = typeof (pv.lat ?? pv.city?.lat) === 'number' ? (pv.lat ?? pv.city?.lat)! : Number(pv.lat ?? pv.city?.lat);
      return isValidMexicoCoord(lonNum, latNum)
        ? [lonNum, latNum]
        : (getStateCentroid(selectedStateName ?? '') ?? MEXICO_CENTER);
    },
    [selectedStateName]
  );

  const puntoPinCoords = useMemo(
    () => puntosInSelectedState.map((pv) => ({ punto: pv, coordinates: getPvCoords(pv) })),
    [puntosInSelectedState, getPvCoords]
  );

  const effectiveScale = selectedState ? stateViewScale : scale;
  const effectiveCenter = selectedState ? stateViewCenter : centerCoordinates;
  const geography = selectedState && stateGeoJson ? stateGeoJson : geoData;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {selectedState
          ? `Puntos de venta en ${selectedStateName ?? 'estado'} (${puntoPinCoords.length}) — scroll para zoom`
          : 'Mapa — Puntos de venta por estado'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        {selectedState && (
          <Button size="small" variant="contained" onClick={handleBackClick}>
            Ver mapa completo
          </Button>
        )}
      </Box>
      <div
        ref={mapContainerRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: selectedState ? '55vh' : '50vh',
          minHeight: 320,
        }}
        role="presentation"
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: effectiveScale, center: effectiveCenter }}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={geography}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateCode = geo.properties.state_code as number;
                const stateName = geo.properties.state_name as string;
                const count = stateCounts[stateName] ?? 0;
                const isSelected = selectedState === stateCode;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isSelected ? '#1565c0' : count > 0 ? '#90caf9' : '#e0e0e0'}
                    stroke="#666"
                    strokeWidth={0.5}
                    onClick={() => {
                      if (!selectedState) {
                        handleStateClick(stateCode);
                      }
                    }}
                    style={{
                      default: { cursor: 'pointer', outline: 'none' },
                      hover: { outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Country view: markers with count per state */}
          {!selectedState &&
            stateMarkers.map((marker) => (
              <Marker
                key={marker.stateName}
                coordinates={marker.coordinates}
                onClick={() => marker.stateCode != null && handleStateClick(marker.stateCode)}
              >
                <circle r={6} fill="#1976d2" stroke="#fff" strokeWidth={2} />
                <Tooltip title={`${marker.stateName}: ${marker.count} punto(s) de venta`}>
                  <text
                    textAnchor="middle"
                    y={-10}
                    fontSize={8}
                    fontFamily="Arial"
                    fontWeight="bold"
                    fill="#333"
                  >
                    {marker.count}
                  </text>
                </Tooltip>
              </Marker>
            ))}

          {/* State view: one pin per punto de venta */}
          {selectedState &&
            puntoPinCoords.map(({ punto, coordinates }, index) => (
              <Marker key={punto.id ?? punto._id ?? index} coordinates={coordinates}>
                <circle r={4} fill="#d32f2f" stroke="#fff" strokeWidth={2} />
                <Tooltip
                  title={
                    <Box component="span">
                      <Typography variant="caption" display="block" fontWeight="bold">
                        {punto.name}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {punto.city?.city ?? ''}
                        {punto.city?.state ? `, ${punto.city.state}` : ''}
                      </Typography>
                      <Typography variant="caption" display="block" color="textSecondary">
                        lat: {coordinates[1]?.toFixed(4)}, lon: {coordinates[0]?.toFixed(4)}
                      </Typography>
                    </Box>
                  }
                >
                  <text textAnchor="middle" y={-6} fontSize={6} fontFamily="Arial" fill="#333">
                    {punto.name?.slice(0, 14)}
                  </text>
                </Tooltip>
              </Marker>
            ))}
        </ComposableMap>
      </div>
    </Paper>
  );
}

export default DashboardV2Map;
