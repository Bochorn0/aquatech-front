import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { Link as RouterLink } from 'react-router-dom';
import { Popup, Marker, useMap, TileLayer, MapContainer } from 'react-leaflet';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Geography, Geographies, ComposableMap, Marker as SimpleMapMarker } from 'react-simple-maps';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import ListItem from '@mui/material/ListItem';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';

import geoData from 'src/utils/states.json';

import { CONFIG } from 'src/config-global';

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
  ciudad?: { id?: string; name?: string; regionId?: string } | null;
  metric_status?: 'normal' | 'preventivo' | 'critico' | null;
  metric_status_detail?: { metric_name?: string; value?: number; normal_min?: number; normal_max?: number } | null;
  online?: boolean;
  lat?: number | null;
  long?: number | null;
  codigo_tienda?: string | null;
  city?: {
    city?: string;
    state?: string;
    lat?: number;
    lon?: number;
  } | null;
};

/** Latest value per sensor from GET /api/v2.0/sensors/latest */
type SensorLatestItem = {
  type: string;
  name: string;
  value: number | null;
  timestamp: string | null;
  resourceId?: string | null;
  resourceType?: string | null;
};

/** Display metrics derived from sensor_latest (for captions) */
type LatestMetrics = {
  eficiencia: number | null;
  rechazo: number | null;
  nivelCruda: number | null;
  nivelPurificada: number | null;
};

const DEFAULT_REGION_COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#00838f', '#c62828', '#558b2f', '#6a1b9a', '#5d4037', '#0277bd',
];

/** Status color and labels. Normal = valor por encima del rango de alerta; Preventivo/Crítico = valor dentro del rango de esa severidad. */
const METRIC_STATUS_CONFIG: Record<string, { color: string; label: string; tooltip: string }> = {
  normal: {
    color: '#2e7d32',
    label: 'Normal',
    tooltip: 'Estado normal. El valor está por encima del rango de alerta (operación en rango seguro).',
  },
  preventivo: {
    color: '#ed6c02',
    label: 'Preventivo',
    tooltip: 'Valor dentro del rango preventivo. Revisar métricas para evitar pasar a crítico.',
  },
  critico: {
    color: '#d32f2f',
    label: 'Crítico',
    tooltip: 'Valor dentro del rango crítico. Atención requerida.',
  },
};

function getMetricStatusStyle(punto: PuntoVentaMapItem): { color: string; label: string; tooltip: string } {
  const status = (punto.metric_status ?? '').toLowerCase();
  const conf = METRIC_STATUS_CONFIG[status];
  if (conf) return conf;
  return {
    color: '#9e9e9e',
    label: 'Sin estado',
    tooltip: 'No hay información de estado de métricas para este punto.',
  };
}

/** Derive display metrics from sensor_latest array (match by type/name conventions). */
function latestMetricsFromSensors(sensors: SensorLatestItem[]): LatestMetrics {
  const out: LatestMetrics = { eficiencia: null, rechazo: null, nivelCruda: null, nivelPurificada: null };
  if (!Array.isArray(sensors) || sensors.length === 0) return out;
  const lower = (s: string) => (s ?? '').toLowerCase();
  sensors.forEach((s) => {
    const t = lower(s.type);
    const n = lower(s.name ?? '');
    const v = s.value != null ? Number(s.value) : null;
    if (v == null) return;
    if (t === 'eficiencia' || n.includes('eficiencia')) out.eficiencia = v;
    else if (t === 'flujo_rechazo' || t === 'rechazo' || n.includes('rechazo')) out.rechazo = v;
    else if (t === 'nivel_cruda' || t === 'liquid_level_percent' || n.includes('cruda')) {
      if (s.resourceType === 'nivel' || n.includes('cruda')) out.nivelCruda = v;
    } else if (t === 'nivel_purificada' || n.includes('purificada')) out.nivelPurificada = v;
    else if ((t === 'liquid_level_percent' || n.includes('nivel')) && (n.includes('purificada') || s.resourceType === 'tiwater')) {
      if (out.nivelPurificada == null) out.nivelPurificada = v;
    } else if ((t === 'liquid_level_percent' || n.includes('nivel')) && (n.includes('cruda') || s.resourceType === 'nivel')) {
      if (out.nivelCruda == null) out.nivelCruda = v;
    }
  });
  return out;
}

/** Returns a Leaflet divIcon with the given fill color (for status: normal=green, preventivo=amber, critico=red). */
function getStatusMarkerIcon(fillColor: string): L.DivIcon {
  const safe = fillColor.replace(/"/g, "'");
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${safe};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

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
  const [sensorLatestByCodigoTienda, setSensorLatestByCodigoTienda] = useState<Record<string, SensorLatestItem[]>>({});
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

  // Effective region id per punto: prefer ciudad.regionId (geographic) so map colors match geography even when API returns link-table region
  const getEffectiveRegionId = useCallback((pv: PuntoVentaMapItem): string => {
    const fromCiudad = pv.ciudad?.regionId != null ? String(pv.ciudad.regionId).trim() : '';
    const fromRegion = (pv.region?.id ?? '').trim();
    return fromCiudad || fromRegion || '_sin_region';
  }, []);

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
      const regionId = getEffectiveRegionId(pv);
      if (!byState[stateName]) byState[stateName] = {};
      byState[stateName][regionId] = (byState[stateName][regionId] ?? 0) + 1;
    });
    const regionById: Record<string, RegionMapItem> = {};
    regions.forEach((r) => {
      const key = r.id != null ? String(r.id) : '';
      if (key) regionById[key] = r;
    });
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
      result[stateName] = dominantId ? (regionById[String(dominantId)] ?? null) : null;
    });
    return result;
  }, [puntos, regions, getEffectiveRegionId]);

  // Region color from puntos (API often embeds region.color in each punto; use when regions list has no color)
  const regionColorFromPuntos = useMemo(() => {
    const map: Record<string, string> = {};
    const hexRe = /^#?[\da-fA-F]{3,8}$/;
    puntos.forEach((pv) => {
      const r = pv.region as { id?: string; color?: string | null } | undefined;
      if (!r?.id || map[r.id]) return;
      const raw = (r.color ?? '').trim();
      if (!raw) return;
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      if (hexRe.test(hex)) map[String(r.id)] = hex;
    });
    return map;
  }, [puntos]);

  // Totals by region for sidebar (use effective region id so counts match map coloring)
  const totalsByRegion = useMemo(() => {
    const counts: Record<string, { region: RegionMapItem; count: number }> = {};
    regions.forEach((r) => {
      const key = r.id != null ? String(r.id) : '';
      if (key) counts[key] = { region: r, count: 0 };
    });
    let sinRegionCount = 0;
    puntos.forEach((pv) => {
      const id = getEffectiveRegionId(pv);
      if (id === '_sin_region') sinRegionCount += 1;
      else if (id && counts[id]) counts[id].count += 1;
    });
    const list = Object.values(counts);
    if (sinRegionCount > 0) {
      list.push({ region: { id: '_sin_region', code: 'SIN_REGION', name: 'Sin región' }, count: sinRegionCount });
    }
    return list;
  }, [puntos, regions, getEffectiveRegionId]);

  const getRegionColor = useCallback(
    (region: RegionMapItem | null, fallbackIndex: number, colorFromPuntos?: Record<string, string>): string => {
      if (!region) return '#e0e0e0';
      let hex = (region.color ?? '').trim();
      if (!hex && colorFromPuntos) hex = (colorFromPuntos[String(region.id)] ?? '').trim();
      if (/^#[\da-fA-F]{3,8}$/.test(hex)) return hex;
      if (/^[\da-fA-F]{3,8}$/.test(hex)) return `#${hex}`;
      const seed = String(region.id ?? region.code ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return DEFAULT_REGION_COLORS[Math.abs(seed) % DEFAULT_REGION_COLORS.length];
    },
    []
  );

  const getStateFill = useCallback(
    (stateName: string, stateCount: number): string => {
      if (stateCount === 0) return '#e0e0e0';
      const region = stateToDominantRegion[stateName] ?? null;
      const regionIndex = region ? regions.findIndex((r) => r.id === region.id) : -1;
      return getRegionColor(region, Math.max(0, regionIndex), regionColorFromPuntos);
    },
    [stateToDominantRegion, regions, getRegionColor, regionColorFromPuntos]
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
    setSensorLatestByCodigoTienda({});
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

  // Fetch latest sensor values for all puntos in selected state (for state-level captions)
  useEffect(() => {
    if (!selectedState || puntoPinCoords.length === 0) {
      setSensorLatestByCodigoTienda({});
      return;
    }
    const codes = puntoPinCoords
      .map(({ punto }) => (punto.codigo_tienda ?? (punto as { code?: string }).code ?? '').toString().trim().toUpperCase())
      .filter(Boolean);
    const unique = Array.from(new Set(codes));
    if (unique.length === 0) {
      setSensorLatestByCodigoTienda({});
      return;
    }
    const codigoTiendaParam = unique.join(',');
    fetch(`${CONFIG.API_BASE_URL_V2}/sensors/latest?codigo_tienda=${encodeURIComponent(codigoTiendaParam)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data: { codigo_tienda?: string; sensors?: SensorLatestItem[] } | Record<string, SensorLatestItem[]>) => {
        if (unique.length === 1 && 'codigo_tienda' in data && Array.isArray(data.sensors)) {
          const key: string = (data as { codigo_tienda?: string }).codigo_tienda ?? unique[0];
          setSensorLatestByCodigoTienda({ [key]: data.sensors });
        } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          setSensorLatestByCodigoTienda(data as Record<string, SensorLatestItem[]>);
        } else {
          setSensorLatestByCodigoTienda({});
        }
      })
      .catch(() => setSensorLatestByCodigoTienda({}));
  }, [selectedState, puntoPinCoords]);

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

  /** Mock metrics per punto (fallback when no sensor_latest data). */
  const getMockMetrics = useCallback((punto: PuntoVentaMapItem) => {
    const seed = String(punto.id ?? punto._id ?? punto.name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const eficiencia = 40 + (seed % 26);
    const rechazo = 0.5 + ((seed * 7) % 15) / 10;
    const nivelCruda = 55 + (seed % 35);
    const nivelPurificada = 25 + ((seed * 3) % 25);
    return { eficiencia, rechazo, nivelCruda, nivelPurificada };
  }, []);

  /** Latest metrics from sensor_latest for a punto (by codigo_tienda). Returns null if none. */
  const getLatestMetricsForPunto = useCallback(
    (punto: PuntoVentaMapItem): LatestMetrics | null => {
      const code = (punto.codigo_tienda ?? (punto as { code?: string }).code ?? '').toString().trim().toUpperCase();
      if (!code) return null;
      const sensors = sensorLatestByCodigoTienda[code];
      if (!Array.isArray(sensors) || sensors.length === 0) return null;
      return latestMetricsFromSensors(sensors);
    },
    [sensorLatestByCodigoTienda]
  );

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
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel shrink>Centrar en</InputLabel>
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
              {puntoPinCoords.map(({ punto, coordinates }, index) => {
                const statusStyle = getMetricStatusStyle(punto);
                const latest = getLatestMetricsForPunto(punto);
                const mock = getMockMetrics(punto);
                const hasLatest = latest && (latest.eficiencia != null || latest.rechazo != null || latest.nivelCruda != null || latest.nivelPurificada != null);
                const ef = hasLatest && latest!.eficiencia != null ? latest!.eficiencia : mock.eficiencia;
                const re = hasLatest && latest!.rechazo != null ? latest!.rechazo : mock.rechazo;
                const nc = hasLatest && latest!.nivelCruda != null ? latest!.nivelCruda : mock.nivelCruda;
                const np = hasLatest && latest!.nivelPurificada != null ? latest!.nivelPurificada : mock.nivelPurificada;
                const detail = punto.metric_status_detail;
                const id = String(punto.id ?? punto._id ?? '');
                return (
                  <Marker
                    key={punto.id ?? punto._id ?? index}
                    position={[coordinates[1], coordinates[0]]}
                    icon={getStatusMarkerIcon(statusStyle.color)}
                  >
                    <Popup minWidth={220} maxWidth={280}>
                      <Box sx={{ p: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                          {punto.name || 'Sin nombre'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: statusStyle.color,
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="caption" fontWeight={600} sx={{ color: statusStyle.color }}>
                            Estado: {statusStyle.label}
                          </Typography>
                        </Box>
                        {(punto.metric_status === 'preventivo' || punto.metric_status === 'critico') && detail?.metric_name && (
                          <Typography variant="caption" display="block" sx={{ mb: 0.5 }} color="text.secondary">
                            Alerta: {detail.metric_name}
                            {detail.value != null && ` — valor ${detail.value}`}
                            {(detail.normal_min != null || detail.normal_max != null) &&
                              ` (rango de esta alerta: ${detail.normal_min ?? '?'}–${detail.normal_max ?? '?'})`}
                          </Typography>
                        )}
                        <Typography variant="caption" display="block" color="text.secondary">
                          Eficiencia: {ef != null ? `${ef}%` : '—'} · Rechazo: {re != null ? re.toFixed(1) : '—'}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Nivel cruda: {nc != null ? `${nc}%` : '—'} · Nivel purif.: {np != null ? `${np}%` : '—'}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {punto.city?.city ?? ''}
                          {punto.city?.state ? `, ${punto.city.state}` : ''}
                        </Typography>
                        <Link
                          component={RouterLink}
                          to={`/dashboard/v2/detalle/${id}`}
                          variant="caption"
                          sx={{ mt: 0.75, display: 'inline-block', fontWeight: 600 }}
                        >
                          Ver detalle →
                        </Link>
                      </Box>
                    </Popup>
                  </Marker>
                );
              })}
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

          {/* State view: one pin per punto de venta (color = metric_status) */}
          {selectedState &&
            puntoPinCoords.map(({ punto, coordinates }, index) => {
              const latest = getLatestMetricsForPunto(punto);
              const statusStyle = getMetricStatusStyle(punto);
              const parts: string[] = [];
              if (latest?.eficiencia != null) parts.push(`Eficiencia ${latest.eficiencia}%`);
              if (latest?.rechazo != null) parts.push(`Rechazo ${latest.rechazo.toFixed(1)}`);
              if (latest?.nivelCruda != null) parts.push(`Nivel cruda ${latest.nivelCruda}%`);
              if (latest?.nivelPurificada != null) parts.push(`Nivel purif. ${latest.nivelPurificada}%`);
              const latestLine = parts.length > 0 ? parts.join(' · ') : null;
              return (
                <SimpleMapMarker key={punto.id ?? punto._id ?? index} coordinates={coordinates}>
                  <circle r={4} fill={statusStyle.color} stroke="#fff" strokeWidth={2} />
                  <Tooltip
                    title={
                      <Box component="span">
                        <Typography variant="caption" display="block" fontWeight="bold">
                          {punto.name}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ color: statusStyle.color, fontWeight: 600 }}>
                          Estado: {statusStyle.label}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {punto.city?.city ?? ''}
                          {punto.city?.state ? `, ${punto.city.state}` : ''}
                        </Typography>
                        {latestLine && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.25 }} color="primary.main">
                            {latestLine}
                          </Typography>
                        )}
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
              );
            })}
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
                {puntoPinCoords.length} punto(s) — últimos valores de sensores
              </Typography>
              {puntoPinCoords.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No hay puntos en este estado</Typography>
              ) : (
                <List dense disablePadding>
                  {puntoPinCoords.map(({ punto }, index) => {
                    const id = String(punto.id ?? punto._id ?? '');
                    const latest = getLatestMetricsForPunto(punto);
                    const mock = getMockMetrics(punto);
                    const regionName = punto.region?.name;
                    const statusStyle = getMetricStatusStyle(punto);
                    const hasLatest = latest && (latest.eficiencia != null || latest.rechazo != null || latest.nivelCruda != null || latest.nivelPurificada != null);
                    const ef = hasLatest && latest!.eficiencia != null ? latest!.eficiencia : mock.eficiencia;
                    const re = hasLatest && latest!.rechazo != null ? latest!.rechazo : mock.rechazo;
                    const nc = hasLatest && latest!.nivelCruda != null ? latest!.nivelCruda : mock.nivelCruda;
                    const np = hasLatest && latest!.nivelPurificada != null ? latest!.nivelPurificada : mock.nivelPurificada;
                    const d = punto.metric_status_detail;
                    const statusTooltip = d?.metric_name
                      ? `${statusStyle.tooltip} ${d.metric_name}${d.value != null ? ` — valor ${d.value}` : ''}${(d.normal_min != null || d.normal_max != null) ? ` (rango de esta alerta: ${d.normal_min ?? '?'}–${d.normal_max ?? '?'})` : ''}`
                      : statusStyle.tooltip;
                    return (
                      <ListItem key={id || `pv-${index}`} disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Tooltip title={statusTooltip} arrow placement="top">
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: statusStyle.color,
                                border: '1px solid',
                                borderColor: 'divider',
                                flexShrink: 0,
                              }}
                            />
                          </Tooltip>
                          <Typography variant="body2" fontWeight={500}>{punto.name || 'Sin nombre'}</Typography>
                          <Tooltip title={statusStyle.label} arrow placement="top">
                            <Typography variant="caption" sx={{ color: statusStyle.color, fontWeight: 600 }}>
                              {statusStyle.label}
                            </Typography>
                          </Tooltip>
                        </Box>
                        {regionName && (
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
                            {regionName}
                          </Typography>
                        )}
                        <Typography variant="caption" component="div" color="text.secondary">
                          Eficiencia: {ef != null ? `${ef}%` : '—'}, Rechazo: {re != null ? re.toFixed(1) : '—'}, Nivel Cruda: {nc != null ? `${nc}%` : '—'}, Nivel purificada: {np != null ? `${np}%` : '—'}
                          {hasLatest ? '' : ' (ejemplo)'}
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
                    const color = getRegionColor(region.code === 'SIN_REGION' ? null : region, Math.max(0, fallbackIndex), regionColorFromPuntos);
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
