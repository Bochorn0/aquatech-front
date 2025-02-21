import packageJson from '../package.json';

// ----------------------------------------------------------------------
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://164.92.95.176:3009/api';
const ICON_URL = process.env.REACT_APP_ICON_URL || 'https://images.tuyacn.com';
const PORT = process.env.PORT || '3000';


export type ConfigValue = {
  appName: string;
  appVersion: string;
  API_BASE_URL: string;
  ICON_URL: string;
  PORT: string;
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'Aquatech',
  appVersion: packageJson.version,
  API_BASE_URL,
  ICON_URL,
  PORT,
};



