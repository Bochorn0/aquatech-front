import fs from 'fs';
import path from 'path';
import checker from 'vite-plugin-checker';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// ----------------------------------------------------------------------

const PORT = 3039;
const HTTPS_KEY = process.env.VITE_HTTPS_KEY;
const HTTPS_CERT = process.env.VITE_HTTPS_CERT;
const HTTPS_CONFIG =
  HTTPS_KEY && HTTPS_CERT
    ? {
        key: fs.readFileSync(HTTPS_KEY),
        cert: fs.readFileSync(HTTPS_CERT),
      }
    : undefined;

export default defineConfig({
  define: {
    // Expose REACT_APP_* env vars to the client (Vite only exposes VITE_* by default)
    'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || ''),
    'process.env.REACT_APP_API_BASE_URL_V2': JSON.stringify(process.env.REACT_APP_API_BASE_URL_V2 || ''),
    'process.env.REACT_APP_TIWATER_API_KEY': JSON.stringify(process.env.REACT_APP_TIWATER_API_KEY || ''),
    'process.env.REACT_APP_ICON_URL': JSON.stringify(process.env.REACT_APP_ICON_URL || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
        dev: { logLevel: ['error'] },
      },
      overlay: {
        position: 'tl',
        initialIsOpen: false,
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: path.join(process.cwd(), 'node_modules/$1'),
      },
      {
        find: /^src(.+)/,
        replacement: path.join(process.cwd(), 'src/$1'),
      },
    ],
  },
  server: { port: PORT, host: true, https: HTTPS_CONFIG },
  preview: { port: PORT, host: true },
});
