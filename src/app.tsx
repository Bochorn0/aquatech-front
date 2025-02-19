import 'src/global.css';

import { Router } from 'src/routes/sections';

import { ThemeProvider } from 'src/theme/theme-provider';

// ----------------------------------------------------------------------

export default function App() {

  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
}
