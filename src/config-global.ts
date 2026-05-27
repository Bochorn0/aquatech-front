import packageJson from '../package.json';

// ----------------------------------------------------------------------

const DEFAULT_LOCAL_API = 'http://localhost:3009/api/v1.0';
const DEFAULT_PROD_API =
  'https://lccapp-aefcbwh0ecd7b8cz.canadacentral-01.azurewebsites.net/api/v1.0';

function trimEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Vite replaces import.meta.env.* at build time.
 * - `vite` (dev) → import.meta.env.DEV === true → local API by default.
 * - `vite build --mode devlocal` → MODE === 'devlocal' → local API (.env loads via `.env.devlocal`).
 * - `vite build` (production) → explicit env vars or prod default below.
 */
const explicitVite = trimEnv(import.meta.env.VITE_API_BASE_URL);
const explicitLegacy = trimEnv(
  typeof process !== 'undefined' ? process.env.REACT_APP_API_BASE_URL : ''
);

const USE_LOCAL_FALLBACK =
  Boolean(import.meta.env.DEV) || String(import.meta.env.MODE) === 'devlocal';

const API_BASE_URL =
  explicitVite ||
  explicitLegacy ||
  (USE_LOCAL_FALLBACK ? DEFAULT_LOCAL_API : DEFAULT_PROD_API);

const explicitViteV2 = trimEnv(import.meta.env.VITE_API_BASE_URL_V2);
const explicitLegacyV2 = trimEnv(
  typeof process !== 'undefined' ? process.env.REACT_APP_API_BASE_URL_V2 : ''
);
const API_BASE_URL_V2 =
  explicitViteV2 ||
  explicitLegacyV2 ||
  API_BASE_URL.replace('/v1.0', '/v2.0');
const TIWATER_API_KEY = process.env.REACT_APP_TIWATER_API_KEY || '';
const ICON_URL = process.env.REACT_APP_ICON_URL || 'https://images.tuyacn.com';
const PORT = process.env.PORT || '3000';


/** Timezone for display (Hermosillo, Sonora - UTC-7) */
export const APP_TIMEZONE = 'America/Hermosillo';

export type ConfigValue = {
  appName: string;
  appVersion: string;
  API_BASE_URL: string;
  API_BASE_URL_V2: string;
  TIWATER_API_KEY: string;
  ICON_URL: string;
  PORT: string;
  timezone: string;
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'TI Water',
  appVersion: packageJson.version,
  API_BASE_URL,
  API_BASE_URL_V2,
  TIWATER_API_KEY,
  ICON_URL,
  PORT,
  timezone: APP_TIMEZONE,
};



