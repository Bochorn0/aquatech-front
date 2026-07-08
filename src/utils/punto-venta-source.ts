import type { PuntosVenta, PuntoVentaSourceType } from 'src/pages/types';

const SOURCE_LABELS: Record<PuntoVentaSourceType, string> = {
  mqtt: 'MQTT',
  tuya: 'Tuya',
  hybrid: 'Híbrido',
};

export function getSourceTypeLabel(sourceType?: string | null): string {
  const key = (sourceType || 'mqtt').toLowerCase() as PuntoVentaSourceType;
  return SOURCE_LABELS[key] || SOURCE_LABELS.mqtt;
}

export function usesMqttSource(sourceType?: string | null): boolean {
  const s = (sourceType || 'mqtt').toLowerCase();
  return s === 'mqtt' || s === 'hybrid';
}

export function usesTuyaSource(sourceType?: string | null): boolean {
  const s = (sourceType || 'mqtt').toLowerCase();
  return s === 'tuya' || s === 'hybrid';
}

/** Prefer tiwater resource for historico; fall back to Tuya osmosis resourceId. */
export function resolveHistoricoResourceId(punto: PuntosVenta & { osmosisSystems?: any[] }): {
  resourceId: string;
  resourceType?: string;
} {
  const systems = punto?.osmosisSystems || [];
  const tiwater = systems.find(
    (s) => (s.resourceType || '').toString().toLowerCase() === 'tiwater'
  );
  if (tiwater?.resourceId) {
    return { resourceId: String(tiwater.resourceId), resourceType: 'tiwater' };
  }
  const osmosis = systems.find(
    (s) => (s.resourceType || '').toString().toLowerCase() === 'osmosis'
  );
  if (osmosis?.resourceId) {
    return { resourceId: String(osmosis.resourceId), resourceType: 'osmosis' };
  }
  return { resourceId: 'tiwater-system', resourceType: 'tiwater' };
}

export function getActiveOsmosisSystems(punto: PuntosVenta & { osmosisSystems?: any[] }) {
  return punto?.osmosisSystems || [];
}

export function getNivelProducts(punto: PuntosVenta & { productos?: any[] }) {
  return (punto?.productos || []).filter((p) => p.product_type === 'Nivel');
}
