import type { Product } from 'src/pages/types';

/** Tuya smart-switch style devices expose `switch_1` in status. */
export function productHasSwitch1Status(product: Pick<Product, 'status'>): boolean {
  return Array.isArray(product.status) && product.status.some((s) => s.code === 'switch_1');
}

export function getSwitch1Value(product: Pick<Product, 'status'>): boolean {
  const row = product.status?.find((s) => s.code === 'switch_1');
  return Boolean(row?.value);
}

/**
 * Treat as apagador if explicitly set, or if status has switch_1 (DB may still say Osmosis).
 * Does not override known non-switch types like Nivel / Metrica.
 */
export function isApagadorProduct(product: Pick<Product, 'product_type' | 'status'>): boolean {
  const t = (product.product_type || '').trim().toLowerCase();
  if (t === 'apagador') return true;
  if (!productHasSwitch1Status(product)) return false;
  const keep = ['nivel', 'metrica', 'pressure', 'tiwater'];
  return !keep.includes(t);
}

/** Normalize product_type for UI after API load when switch_1 is present. */
export function normalizeProductTypeFromStatus<T extends Pick<Product, 'product_type' | 'status'>>(product: T): T {
  const t = (product.product_type || '').trim().toLowerCase();
  if (t === 'apagador') return product;
  if (!productHasSwitch1Status(product)) return product;
  const keep = ['nivel', 'metrica', 'pressure', 'tiwater'];
  if (keep.includes(t)) return product;
  return { ...product, product_type: 'Apagador' };
}
