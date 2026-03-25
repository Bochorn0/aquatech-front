import type { Product } from '../pages/types';

function getFlowTotalNum(status: { code: string; value: unknown }[] | undefined, code: string): number {
  const v = status?.find((s) => s.code === code)?.value;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function upsertStatusValue(
  status: { code: string; value: unknown }[],
  code: string,
  value: number
): { code: string; value: unknown }[] {
  const out = status.map((s) => ({ ...s }));
  const idx = out.findIndex((s) => s.code === code);
  const display = Number.isFinite(value) ? value.toFixed(2) : '0';
  if (idx >= 0) out[idx] = { ...out[idx], value: display };
  else out.push({ code, value: display });
  return out;
}

/**
 * Dashboard / map: do not list canonical locked rows (merged_from_device_ids non-empty).
 * For each live row whose id appears in a locked row's merged_from_device_ids, add that locked
 * row's flowrate_total_1 / flowrate_total_2 to the live row (same idea as mergeOsmosisTotals
 * baseline from archived + live, expressed here as _device + plain device).
 */
export function prepareDashboardProducts(products: Product[]): Product[] {
  const lockedRows = products.filter(
    (p) => Array.isArray(p.merged_from_device_ids) && p.merged_from_device_ids.length > 0
  );

  const withoutLocked = products.filter(
    (p) => !(Array.isArray(p.merged_from_device_ids) && p.merged_from_device_ids.length > 0)
  );

  /** Same pairing as lock + live (_ebdd + ebdd): one live id in merged_from. Multi-id merges use API merge elsewhere. */
  const lockedRowsReferencing = (liveId: string): Product[] =>
    lockedRows.filter((L) => {
      const m = L.merged_from_device_ids as unknown[] | undefined;
      if (!Array.isArray(m) || m.length !== 1) return false;
      return String(m[0]) === String(liveId);
    });

  return withoutLocked.map((p) => {
    const isOsmosis = String(p.product_type || 'Osmosis').toLowerCase() === 'osmosis';
    if (!isOsmosis) return p;

    const lockedForLive = lockedRowsReferencing(String(p.id));
    if (lockedForLive.length === 0) return p;

    let extra1 = 0;
    let extra2 = 0;
    for (const L of lockedForLive) {
      extra1 += getFlowTotalNum(L.status, 'flowrate_total_1');
      extra2 += getFlowTotalNum(L.status, 'flowrate_total_2');
    }

    const base1 = getFlowTotalNum(p.status, 'flowrate_total_1');
    const base2 = getFlowTotalNum(p.status, 'flowrate_total_2');
    let nextStatus = Array.isArray(p.status) ? p.status.map((s) => ({ ...s })) : [];
    nextStatus = upsertStatusValue(nextStatus, 'flowrate_total_1', base1 + extra1);
    nextStatus = upsertStatusValue(nextStatus, 'flowrate_total_2', base2 + extra2);
    return { ...p, status: nextStatus };
  });
}
