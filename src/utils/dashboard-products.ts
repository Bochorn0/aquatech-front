import type { Product } from '../pages/types';

/**
 * Dashboard / map: do not list canonical locked rows (merged_from_device_ids non-empty).
 * Flow totals for live + locked (_) are merged in the API (getAllProducts); avoid double-adding here.
 */
export function prepareDashboardProducts(products: Product[]): Product[] {
  return products.filter(
    (p) => !(Array.isArray(p.merged_from_device_ids) && p.merged_from_device_ids.length > 0)
  );
}
