export const DEFAULT_PRODUCT_TYPES = [
  'Osmosis',
  'Nivel',
  'Apagador',
  'Pressure',
  'sensor_flujo',
] as const;

export function normalizeProductTypeKey(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function isSensorFlujoType(value?: string | null): boolean {
  const key = normalizeProductTypeKey(value);
  return key === 'sensor_flujo' || key === 'flujo';
}

export function mergeProductTypeOptions(existingTypes: Array<string | undefined | null>): string[] {
  const extras = existingTypes
    .map((t) => String(t || '').trim())
    .filter((t) => t.length > 0 && !DEFAULT_PRODUCT_TYPES.includes(t as (typeof DEFAULT_PRODUCT_TYPES)[number]));
  return [...DEFAULT_PRODUCT_TYPES, ...Array.from(new Set(extras))];
}
