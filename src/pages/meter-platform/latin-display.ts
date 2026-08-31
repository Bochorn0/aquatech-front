/** Keep A–Z / a–z only for letters. Digits and punctuation stay. */

const KNOWN_VENDOR_TEXT: Array<[string, string]> = [
  ['NB智能水表', 'NB water meter'],
  ['智能水表', 'water meter'],
  ['阀门开', 'Valve open'],
  ['阀门关', 'Valve closed'],
  ['阀门', 'Valve'],
  ['浙江省', 'Zhejiang'],
];

function applyKnownVendorText(value: string): string {
  let out = value;
  KNOWN_VENDOR_TEXT.forEach(([from, to]) => {
    out = out.split(from).join(to);
  });
  return out;
}

/** Drop any Unicode letter that is not A–Z / a–z (CJK, kana, Cyrillic, etc.). */
export function stripNonAmericanLetters(value: string): string {
  return value
    .replace(/[^\P{L}A-Za-z]/gu, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
}

export function toLatinDisplay(value: unknown, fallback = '—'): string {
  if (value == null) return fallback;
  const raw = String(value);
  if (!raw.trim()) return fallback;
  const translated = applyKnownVendorText(raw);
  const cleaned = stripNonAmericanLetters(translated);
  return cleaned || fallback;
}

export function latinJson(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, nested) =>
      typeof nested === 'string' ? stripNonAmericanLetters(applyKnownVendorText(nested)) : nested,
    2
  );
}
