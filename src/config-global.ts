import packageJson from '../package.json';

// ----------------------------------------------------------------------
// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3009/api/v1.0';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://164.92.95.176:3009/api/v1.0';
const API_BASE_URL_V2 = process.env.REACT_APP_API_BASE_URL_V2 || API_BASE_URL.replace('/v1.0', '/v2.0');
const TIWATER_API_KEY = process.env.REACT_APP_TIWATER_API_KEY || '';
const ICON_URL = process.env.REACT_APP_ICON_URL || 'https://images.tuyacn.com';
const PORT = process.env.PORT || '3000';


export type ConfigValue = {
  appName: string;
  appVersion: string;
  API_BASE_URL: string;
  API_BASE_URL_V2: string;
  TIWATER_API_KEY: string;
  ICON_URL: string;
  PORT: string;
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
};



