import packageJson from '../package.json';

// ----------------------------------------------------------------------
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'development'
  ? 'http://localhost:3009/api/v1.0'
    : 'https://lccapp-aefcbwh0ecd7b8cz.canadacentral-01.azurewebsites.net/api/v1.0');
const API_BASE_URL_V2 = process.env.REACT_APP_API_BASE_URL_V2 || API_BASE_URL.replace('/v1.0', '/v2.0');
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



