import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Marker as SimpleMapMarker, Geography, Geographies, ComposableMap } from 'react-simple-maps';

import 'leaflet/dist/leaflet.css';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
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

/** Ray-casting point-in-polygon: ring is [lon, lat][], returns true if (lon, lat) is inside */
function pointInRing(ring: number[][], lon: number, lat: number): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Get exterior rings from GeoJSON geometry (Polygon or MultiPolygon). Uses geometry.type for reliability. */
function getRings(geometry: GeoJSONFeature['geometry']): number[][][] {
  const coords = geometry?.coordinates;
  if (!coords || !Array.isArray(coords) || coords.length === 0) return [];
  const geomType = (geometry as { type?: string })?.type;
  if (geomType === 'Polygon') {
    const rings = coords as number[][][];
    return rings.length > 0 ? [rings[0] as number[][]] : [];
  }
  if (geomType === 'MultiPolygon') {
    const polygons = coords as number[][][][];
    return polygons.map((poly) => (poly[0] as unknown) as number[][]);
  }
  return [];
}

/** True if (lon, lat) is inside the feature's geometry */
function pointInFeature(feature: GeoJSONFeature, lon: number, lat: number): boolean {
  const rings = getRings(feature.geometry);
  return rings.some((ring) => pointInRing(ring, lon, lat));
}

/** Resolve Mexican state from coordinates (point-in-polygon). Returns state_name or null. */
function getStateFromCoords(lon: number, lat: number): string | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const feature = geoStates.features.find((f) => pointInFeature(f, lon, lat));
  return feature ? feature.properties.state_name : null;
}

/** State centroid using same geometry parsing as getRings (Polygon vs MultiPolygon). */
function getStateCentroid(stateName: string): [number, number] | null {
  const geoState = geoStates.features?.find((g: GeoJSONFeature) => g.properties.state_name === stateName);
  if (!geoState?.geometry) return null;
  const rings = getRings(geoState.geometry);
  let centerX = 0;
  let centerY = 0;
  let totalPoints = 0;
  rings.forEach((ring) => {
    ring.forEach((point: number[]) => {
      centerX += point[0];
      centerY += point[1];
      totalPoints += 1;
    });
  });
  if (totalPoints === 0) return null;
  const lon = centerX / totalPoints;
  const lat = centerY / totalPoints;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

/** Bounding box of a geometry (all rings). */
function getGeometryBounds(geometry: GeoJSONFeature['geometry']): { minLon: number; maxLon: number; minLat: number; maxLat: number } | null {
  const rings = getRings(geometry);
  if (rings.length === 0) return null;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  rings.forEach((ring) => {
    ring.forEach((point: number[]) => {
      const lon = point[0];
      const lat = point[1];
      if (Number.isFinite(lon)) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      }
      if (Number.isFinite(lat)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    });
  });
  if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) return null;
  return { minLon, maxLon, minLat, maxLat };
}

/** Center and scale so the state fits nicely in the view (bbox-based, consistent across states). */
function getStateViewCenterAndScale(geometry: GeoJSONFeature['geometry']): { center: [number, number]; scale: number } {
  const bounds = getGeometryBounds(geometry);
  const REF_SPAN_DEG = 16;
  const MIN_SCALE = 3000;
  const MAX_SCALE = 14000;
  const PADDING = 0.9;

  if (!bounds) {
    return { center: MEXICO_CENTER, scale: 5000 };
  }
  const center: [number, number] = [
    (bounds.minLon + bounds.maxLon) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];
  const spanLon = bounds.maxLon - bounds.minLon;
  const spanLat = bounds.maxLat - bounds.minLat;
  const spanDeg = Math.max(spanLon, spanLat, 0.3);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (1400 * REF_SPAN_DEG) / spanDeg * PADDING));
  return { center, scale };
}

export type RegionMapItem = { id: string; code: string; name: string; color?: string | null };

export type PuntoVentaMapItem = {
  id: string;
  _id?: string;
  name: string;
  clientId?: string;
  cliente?: { id?: string; _id?: string; name: string } | string;
  region?: RegionMapItem | null;
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

const DEFAULT_REGION_COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#00838f', '#c62828', '#558b2f', '#6a1b9a', '#5d4037', '#0277bd',
];

const redMarkerIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background:#d32f2f;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function LeafletFitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 12);
      return;
    }
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, [map, positions]);
  return null;
}

type DashboardV2MapProps = {
  puntos: PuntoVentaMapItem[];
  regions?: RegionMapItem[];
};

export function DashboardV2Map({ puntos, regions = [] }: DashboardV2MapProps) {
  const [selectedState, setSelectedState] = useState<number | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [stateGeoJson, setStateGeoJson] = useState<typeof geoData | null>(null);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>(MEXICO_CENTER);
  const [scale, setScale] = useState(1400);
  const [stateViewScale, setStateViewScale] = useState(4000);
  const [stateViewCenter, setStateViewCenter] = useState<[number, number]>(MEXICO_CENTER);
  const [showAllPuntos, setShowAllPuntos] = useState(false);
  const [showDetailMap, setShowDetailMap] = useState(false);
  const [detailMapPuntoId, setDetailMapPuntoId] = useState<string | null>(null);
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
      let rawState = (pv.city?.state ?? '').trim();
      if (!rawState) {
        const lon = typeof (pv.long ?? pv.city?.lon) === 'number' ? pv.long ?? pv.city?.lon! : Number(pv.long ?? pv.city?.lon);
        const lat = typeof (pv.lat ?? pv.city?.lat) === 'number' ? pv.lat ?? pv.city?.lat! : Number(pv.lat ?? pv.city?.lat);
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          const fromCoords = getStateFromCoords(lon, lat);
          if (fromCoords) rawState = fromCoords;
        }
      }
      const stateName = normalizeStateToGeo(rawState) || (rawState || 'Sin estado');
      counts[stateName] = (counts[stateName] ?? 0) + 1;
    });
    return counts;
  }, [puntos]);

  // Per-state counts by region (stateName -> regionId -> count) then dominant region per state
  const stateToDominantRegion = useMemo(() => {
    const byState: Record<string, Record<string, number>> = {};
    puntos.forEach((pv) => {
      let rawState = (pv.city?.state ?? '').trim();
      if (!rawState) {
        const lon = typeof (pv.long ?? pv.city?.lon) === 'number' ? pv.long ?? pv.city?.lon! : Number(pv.long ?? pv.city?.lon);
        const lat = typeof (pv.lat ?? pv.city?.lat) === 'number' ? pv.lat ?? pv.city?.lat! : Number(pv.lat ?? pv.city?.lat);
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          const fromCoords = getStateFromCoords(lon, lat);
          if (fromCoords) rawState = fromCoords;
        }
      }
      const stateName = normalizeStateToGeo(rawState) || (rawState || 'Sin estado');
      const regionId = (pv.region?.id ?? '').trim() || '_sin_region';
      if (!byState[stateName]) byState[stateName] = {};
      byState[stateName][regionId] = (byState[stateName][regionId] ?? 0) + 1;
    });
    const regionById = Object.fromEntries(regions.map((r) => [r.id, r]));
    const result: Record<string, RegionMapItem | null> = {};
    Object.keys(byState).forEach((stateName) => {
      const regionCounts = byState[stateName];
      let maxCount = 0;
      let dominantId = '';
      Object.entries(regionCounts).forEach(([rid, c]) => {
        if (c > maxCount && rid !== '_sin_region') {
          maxCount = c;
          dominantId = rid;
        }
      });
      result[stateName] = dominantId ? (regionById[dominantId] ?? null) : null;
    });
    return result;
  }, [puntos, regions]);

  // Totals by region for sidebar (all regions with count; "Sin región" if any punto has no region)
  const totalsByRegion = useMemo(() => {
    const counts: Record<string, { region: RegionMapItem; count: number }> = {};
    regions.forEach((r) => {
      counts[r.id] = { region: r, count: 0 };
    });
    let sinRegionCount = 0;
    puntos.forEach((pv) => {
      const id = pv.region?.id;
      if (id && counts[id]) counts[id].count += 1;
      else if (!id) sinRegionCount += 1;
    });
    const list = Object.values(counts);
    if (sinRegionCount > 0) {
      list.push({ region: { id: '_sin_region', code: 'SIN_REGION', name: 'Sin región' }, count: sinRegionCount });
    }
    return list;
  }, [puntos, regions]);

  const getRegionColor = useCallback(
    (region: RegionMapItem | null, fallbackIndex: number): string => {
      if (!region) return '#e0e0e0';
      const hex = (region.color ?? '').trim();
      if (/^#[\da-fA-F]{3,8}$/.test(hex)) return hex;
      if (/^[\da-fA-F]{3,8}$/.test(hex)) return `#${hex}`;
      return DEFAULT_REGION_COLORS[fallbackIndex % DEFAULT_REGION_COLORS.length];
    },
    []
  );

  const getStateFill = useCallback(
    (stateName: string, stateCount: number): string => {
      if (stateCount === 0) return '#e0e0e0';
      const region = stateToDominantRegion[stateName] ?? null;
      const regionIndex = region ? regions.findIndex((r) => r.id === region.id) : -1;
      return getRegionColor(region, Math.max(0, regionIndex));
    },
    [stateToDominantRegion, regions, getRegionColor]
  );

  // Build markers from geo features so every state with count > 0 gets a marker (avoids name-matching issues)
  const stateMarkers = useMemo(() => {
    const features = geoStates.features ?? [];
    return features
      .map((f: GeoJSONFeature) => {
        const stateName = f.properties.state_name;
        const stateCode = f.properties.state_code;
        const count = stateCounts[stateName] ?? 0;
        if (count <= 0) return null;
        const raw = getStateCentroid(stateName) ?? MEXICO_CENTER;
        const coordinates: [number, number] =
          Number.isFinite(raw[0]) && Number.isFinite(raw[1]) ? [raw[0], raw[1]] : MEXICO_CENTER;
        return { stateName, stateCode, count, coordinates };
      })
      .filter((m): m is NonNullable<typeof m> => m != null);
  }, [stateCounts]);

  const handleStateClick = useCallback(
    (stateCode: number) => {
      setSelectedState(stateCode);
      setShowDetailMap(true);
      setDetailMapPuntoId(null);
      const geoState = geoStates.features.find((g: GeoJSONFeature) => g.properties.state_code === stateCode);
      if (geoState?.properties?.state_name) {
        setSelectedStateName(geoState.properties.state_name);
      }
      if (geoState?.geometry) {
        const { center, scale: stateScale } = getStateViewCenterAndScale(geoState.geometry);
        setCenterCoordinates(center);
        setStateViewCenter(center);
        setStateViewScale(stateScale);
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
    setShowDetailMap(false);
    setDetailMapPuntoId(null);
  }, []);

  const puntosInSelectedState = useMemo(() => {
    if (!selectedStateName) return [];
    return puntos.filter((pv) => {
      let raw = (pv.city?.state ?? '').trim();
      if (!raw) {
        const lon = typeof (pv.long ?? pv.city?.lon) === 'number' ? pv.long ?? pv.city?.lon! : Number(pv.long ?? pv.city?.lon);
        const lat = typeof (pv.lat ?? pv.city?.lat) === 'number' ? pv.lat ?? pv.city?.lat! : Number(pv.lat ?? pv.city?.lat);
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          const fromCoords = getStateFromCoords(lon, lat);
          if (fromCoords) raw = fromCoords;
        }
      }
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

  // Centroid of puntos in state (for detail map "Vista estado" so iframe shows distribution area)
  const puntosInStateCentroid = useMemo((): [number, number] | null => {
    if (puntoPinCoords.length === 0) return null;
    let sumLon = 0;
    let sumLat = 0;
    puntoPinCoords.forEach(({ coordinates }) => {
      sumLon += coordinates[0];
      sumLat += coordinates[1];
    });
    return [sumLon / puntoPinCoords.length, sumLat / puntoPinCoords.length];
  }, [puntoPinCoords]);

  /** Mock metrics per punto (deterministic from id). Replace with API later. */
  const getMockMetrics = useCallback((punto: PuntoVentaMapItem) => {
    const seed = String(punto.id ?? punto._id ?? punto.name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const eficiencia = 40 + (seed % 26);
    const rechazo = 0.5 + ((seed * 7) % 15) / 10;
    const nivelCruda = 55 + (seed % 35);
    const nivelPurificada = 25 + ((seed * 3) % 25);
    return { eficiencia, rechazo, nivelCruda, nivelPurificada };
  }, []);

  // All puntos with valid coords (for "show all pointers" on country view)
  const allPuntoCoords = useMemo(
    () =>
      puntos
        .map((pv) => {
          const lon = typeof (pv.long ?? pv.city?.lon) === 'number' ? pv.long ?? pv.city?.lon! : Number(pv.long ?? pv.city?.lon);
          const lat = typeof (pv.lat ?? pv.city?.lat) === 'number' ? pv.lat ?? pv.city?.lat! : Number(pv.lat ?? pv.city?.lat);
          if (!isValidMexicoCoord(lon, lat)) return null;
          return { punto: pv, coordinates: [lon, lat] as [number, number] };
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
    [puntos]
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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
        {selectedState && (
          <>
            <Button size="small" variant="contained" onClick={handleBackClick}>
              Ver mapa completo
            </Button>
            <FormControlLabel
              control={
                <Switch
                  checked={showDetailMap}
                  onChange={(_, checked) => {
                    setShowDetailMap(checked);
                    if (!checked) setDetailMapPuntoId(null);
                  }}
                  color="primary"
                  size="small"
                />
              }
              label={<Typography variant="body2">Mapa detallado (Google Maps)</Typography>}
            />
            {showDetailMap && (
              <>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Centrar en</InputLabel>
                  <Select
                    value={detailMapPuntoId ?? ''}
                    label="Centrar en"
                    onChange={(e) => setDetailMapPuntoId(e.target.value || null)}
                  >
                    <MenuItem value="">Vista estado (todos)</MenuItem>
                    {puntoPinCoords.map(({ punto }, index) => {
                      const id = String(punto.id ?? punto._id ?? '');
                      const label = punto.name || id || 'Sin nombre';
                      return (
                        <MenuItem key={id || `pv-${index}`} value={id}>
                          {label}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </>
            )}
          </>
        )}
        {!selectedState && (
          <FormControlLabel
            control={
              <Switch
                checked={showAllPuntos}
                onChange={(_, checked) => setShowAllPuntos(checked)}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Mostrar cada punto ({allPuntoCoords.length})
              </Typography>
            }
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <div
          ref={mapContainerRef}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: selectedState ? '55vh' : '50vh',
            minHeight: 320,
            flex: '1 1 60%',
            minWidth: 320,
          }}
          role="presentation"
        >
        {selectedState && showDetailMap && detailMapPuntoId ? (
          <Box sx={{ width: '100%', height: '100%', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <iframe
              title="Mapa (Google Maps)"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={(() => {
                const found = puntoPinCoords.find(({ punto }) => String(punto.id ?? punto._id) === detailMapPuntoId);
                if (found) {
                  const [lon, lat] = found.coordinates;
                  return `https://www.google.com/maps?q=${lat},${lon}&z=14&output=embed`;
                }
                const [lon, lat] = stateViewCenter;
                return `https://www.google.com/maps?q=${lat},${lon}&z=10&output=embed`;
              })()}
            />
          </Box>
        ) : selectedState && showDetailMap && !detailMapPuntoId ? (
          <Box sx={{ width: '100%', height: '100%', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <MapContainer
              center={puntosInStateCentroid ? [puntosInStateCentroid[1], puntosInStateCentroid[0]] : [stateViewCenter[1], stateViewCenter[0]]}
              zoom={10}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LeafletFitBounds
                positions={puntoPinCoords.map(({ coordinates }) => [coordinates[1], coordinates[0]] as [number, number])}
              />
              {puntoPinCoords.map(({ punto, coordinates }, index) => (
                <Marker
                  key={punto.id ?? punto._id ?? index}
                  position={[coordinates[1], coordinates[0]]}
                  icon={redMarkerIcon}
                >
                  <Popup>
                    <Typography variant="body2" fontWeight={600}>{punto.name || 'Sin nombre'}</Typography>
                    <Typography variant="caption" display="block">
                      {punto.city?.city ?? ''}
                      {punto.city?.state ? `, ${punto.city.state}` : ''}
                    </Typography>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Box>
        ) : (
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
                const fillColor = getStateFill(stateName, count);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isSelected ? '#1565c0' : fillColor}
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

          {/* Country view: individual pins first (so state totals draw on top and stay visible) */}
          {!selectedState &&
            showAllPuntos &&
            allPuntoCoords.map(({ punto, coordinates }, index) => (
              <SimpleMapMarker key={punto.id ?? punto._id ?? `all-${index}`} coordinates={coordinates}>
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
                    </Box>
                  }
                >
                  <circle r={3} fill="#d32f2f" stroke="#fff" strokeWidth={1} />
                </Tooltip>
              </SimpleMapMarker>
            ))}

          {/* Country view: state count markers (drawn after pins so numbers stay on top) */}
          {!selectedState &&
            stateMarkers.map((marker) => {
              const r = showAllPuntos ? 8 : 6;
              const fontSize = showAllPuntos ? 9 : 8;
              return (
                <SimpleMapMarker
                  key={marker.stateName}
                  coordinates={marker.coordinates}
                  onClick={() => marker.stateCode != null && handleStateClick(marker.stateCode)}
                >
                  <circle r={r} fill="#1976d2" stroke="#fff" strokeWidth={2} />
                  <Tooltip title={`${marker.stateName}: ${marker.count} punto(s) de venta`}>
                    <text
                      textAnchor="middle"
                      y={-r - 2}
                      fontSize={fontSize}
                      fontFamily="Arial"
                      fontWeight="bold"
                      fill="#333"
                    >
                      {marker.count}
                    </text>
                  </Tooltip>
                </SimpleMapMarker>
              );
            })}

          {/* State view: one pin per punto de venta */}
          {selectedState &&
            puntoPinCoords.map(({ punto, coordinates }, index) => (
              <SimpleMapMarker key={punto.id ?? punto._id ?? index} coordinates={coordinates}>
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
              </SimpleMapMarker>
            ))}
        </ComposableMap>
        )}
        </div>
        {/* Right sidebar: Total por región (country/simple map) or Métricas por región (detail map) */}
        <Paper variant="outlined" sx={{ p: 2, minWidth: 220, maxWidth: 320, height: 'fit-content', maxHeight: selectedState && showDetailMap ? '55vh' : undefined, overflow: 'auto' }}>
          {selectedState && showDetailMap ? (
            <>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Puntos de venta en {selectedStateName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {puntoPinCoords.length} punto(s) — valores de ejemplo (mock; reemplazar por API)
              </Typography>
              {puntoPinCoords.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No hay puntos en este estado</Typography>
              ) : (
                <List dense disablePadding>
                  {puntoPinCoords.map(({ punto }, index) => {
                    const id = String(punto.id ?? punto._id ?? '');
                    const mock = getMockMetrics(punto);
                    const regionName = punto.region?.name;
                    return (
                      <ListItem key={id || `pv-${index}`} disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" fontWeight={500}>{punto.name || 'Sin nombre'}</Typography>
                        {regionName && (
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
                            {regionName}
                          </Typography>
                        )}
                        <Typography variant="caption" component="div" color="text.secondary">
                          Eficiencia: {mock.eficiencia}%, Rechazo: {mock.rechazo.toFixed(1)}, Nivel Cruda: {mock.nivelCruda}%, Nivel purificada: {mock.nivelPurificada}%
                        </Typography>
                        <Link component={RouterLink} to={`/dashboard/v2/detalle/${id}`} variant="caption" sx={{ mt: 0.25, display: 'inline-block' }}>
                          Ver detalle
                        </Link>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </>
          ) : (
            <>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Total por región
              </Typography>
              <List dense disablePadding>
                {totalsByRegion.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="Sin datos por región" secondary="Asigne regiones en Personalización" />
                  </ListItem>
                ) : (
                  totalsByRegion.map(({ region, count }) => {
                    const fallbackIndex = region.code === 'SIN_REGION' ? -1 : regions.findIndex((r) => r.id === region.id);
                    const color = getRegionColor(region.code === 'SIN_REGION' ? null : region, Math.max(0, fallbackIndex));
                    return (
                      <ListItem key={region.id} disablePadding sx={{ py: 0.25 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: 0.5,
                            mr: 1,
                            bgcolor: color,
                            border: '1px solid',
                            borderColor: 'divider',
                            flexShrink: 0,
                          }}
                        />
                        <ListItemText primary={region.name} secondary={`${count} punto(s)`} primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }} />
                      </ListItem>
                    );
                  })
                )}
              </List>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Total: {puntos.length} punto(s)
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    </Paper>
  );
}

export default DashboardV2Map;
