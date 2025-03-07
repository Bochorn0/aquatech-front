// vite.config.ts
import path from "path";
import checker from "file:///Users/lcordova/Documents/Projects/aquatech/aquatech-front/node_modules/vite-plugin-checker/dist/esm/main.js";
import { defineConfig } from "file:///Users/lcordova/Documents/Projects/aquatech/aquatech-front/node_modules/vite/dist/node/index.js";
import react from "file:///Users/lcordova/Documents/Projects/aquatech/aquatech-front/node_modules/@vitejs/plugin-react-swc/index.mjs";
var PORT = 3039;
var vite_config_default = defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
        dev: { logLevel: ["error"] }
      },
      overlay: {
        position: "tl",
        initialIsOpen: false
      }
    })
  ],
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: path.join(process.cwd(), "node_modules/$1")
      },
      {
        find: /^src(.+)/,
        replacement: path.join(process.cwd(), "src/$1")
      }
    ]
  },
  server: { port: PORT, host: true },
  preview: { port: PORT, host: true }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbGNvcmRvdmEvRG9jdW1lbnRzL1Byb2plY3RzL2FxdWF0ZWNoL2FxdWF0ZWNoLWZyb250XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbGNvcmRvdmEvRG9jdW1lbnRzL1Byb2plY3RzL2FxdWF0ZWNoL2FxdWF0ZWNoLWZyb250L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9sY29yZG92YS9Eb2N1bWVudHMvUHJvamVjdHMvYXF1YXRlY2gvYXF1YXRlY2gtZnJvbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGVja2VyIGZyb20gJ3ZpdGUtcGx1Z2luLWNoZWNrZXInO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5jb25zdCBQT1JUID0gMzAzOTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgY2hlY2tlcih7XG4gICAgICB0eXBlc2NyaXB0OiB0cnVlLFxuICAgICAgZXNsaW50OiB7XG4gICAgICAgIGxpbnRDb21tYW5kOiAnZXNsaW50IFwiLi9zcmMvKiovKi57anMsanN4LHRzLHRzeH1cIicsXG4gICAgICAgIGRldjogeyBsb2dMZXZlbDogWydlcnJvciddIH0sXG4gICAgICB9LFxuICAgICAgb3ZlcmxheToge1xuICAgICAgICBwb3NpdGlvbjogJ3RsJyxcbiAgICAgICAgaW5pdGlhbElzT3BlbjogZmFsc2UsXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IFtcbiAgICAgIHtcbiAgICAgICAgZmluZDogL15+KC4rKS8sXG4gICAgICAgIHJlcGxhY2VtZW50OiBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJ25vZGVfbW9kdWxlcy8kMScpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogL15zcmMoLispLyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnc3JjLyQxJyksXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG4gIHNlcnZlcjogeyBwb3J0OiBQT1JULCBob3N0OiB0cnVlIH0sXG4gIHByZXZpZXc6IHsgcG9ydDogUE9SVCwgaG9zdDogdHJ1ZSB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdXLE9BQU8sVUFBVTtBQUNqWCxPQUFPLGFBQWE7QUFDcEIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBSWxCLElBQU0sT0FBTztBQUViLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLFlBQVk7QUFBQSxNQUNaLFFBQVE7QUFBQSxRQUNOLGFBQWE7QUFBQSxRQUNiLEtBQUssRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFO0FBQUEsTUFDN0I7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLFVBQVU7QUFBQSxRQUNWLGVBQWU7QUFBQSxNQUNqQjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLEtBQUssS0FBSyxRQUFRLElBQUksR0FBRyxpQkFBaUI7QUFBQSxNQUN6RDtBQUFBLE1BQ0E7QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLGFBQWEsS0FBSyxLQUFLLFFBQVEsSUFBSSxHQUFHLFFBQVE7QUFBQSxNQUNoRDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRLEVBQUUsTUFBTSxNQUFNLE1BQU0sS0FBSztBQUFBLEVBQ2pDLFNBQVMsRUFBRSxNQUFNLE1BQU0sTUFBTSxLQUFLO0FBQ3BDLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
