import 'src/global.css';

import { ToastContainer } from 'react-toastify';

import { Router } from 'src/routes/sections';

import { ThemeProvider } from 'src/theme/theme-provider';

// ----------------------------------------------------------------------

export default function App() {

  return (
    <ThemeProvider>
      <ToastContainer 
        position="top-right" // You can customize position
        autoClose={5000} // Auto close duration
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored" // or "light" | "dark"
      />
      <Router />
    </ThemeProvider>
  );
}
