import axios from 'axios'; // For making HTTP requests
import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter, } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

export function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // To manage loading state
  const [errorMessage, setErrorMessage] = useState(null); // To manage error state

  useEffect(() => {
    const token = localStorage.getItem('token');
    try {
      // Send login request to backend
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      axios.post(`${CONFIG.API_BASE_URL}/auth/verify`).then((response) => {
        console.log('response', response);
        router.push('/'); // Redirect to home if token exists
      });
    } catch (error) {
      localStorage.removeItem('token'); // Remove token if invalid
      console.error('Error validating token:', error);
    }
  }, [router]);

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null); // Clear any previous error messages

    try {
      // Send login request to backend
      const response = await axios.post(`${CONFIG.API_BASE_URL}/auth/login`, { email, password });
      
      // Assuming response contains a token
      localStorage.setItem('token', response.data.token); // Store token in localStorage
      router.push('/'); // Redirect to home page after successful login
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false); // Stop loading state
    }
  }, [email, password, router]);

  const renderForm = (
    <Box display="flex" flexDirection="column" alignItems="flex-end">
      <TextField
        fullWidth
        name="email"
        label="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />
      <Link variant="body2" color="inherit" sx={{ mb: 1.5 }}>
        Olvidaste tu contraseña?
      </Link>
      <TextField
        fullWidth
        name="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        InputLabelProps={{ shrink: true }}
        type={showPassword ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />
      {errorMessage && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {errorMessage}
        </Typography>
      )}
      <LoadingButton
        fullWidth
        size="large"
        type="submit"
        color="inherit"
        variant="contained"
        onClick={handleSignIn}
        loading={loading}
      >
        Login
      </LoadingButton>
    </Box>
  );

  return (
    <>
      <Helmet>
        <title> {`Login - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 5 }}>
        <Typography variant="h5">Sign in</Typography>
        <Typography variant="body2" color="text.secondary">
          No tienes una cuenta?
          <Link variant="subtitle2" sx={{ ml: 0.5 }}>
            Solicitar acceso
          </Link>
        </Typography>
      </Box>

      {renderForm}

      <Divider sx={{ my: 3, '&::before, &::after': { borderTopStyle: 'dashed' } }}>
        {/* <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 'fontWeightMedium' }}
        >
          OR
        </Typography> */}
      </Divider>

      {/* <Box gap={1} display="flex" justifyContent="center">
        <IconButton color="inherit">
          <Iconify icon="logos:google-icon" />
        </IconButton>
        <IconButton color="inherit">
          <Iconify icon="eva:github-fill" />
        </IconButton>
        <IconButton color="inherit">
          <Iconify icon="ri:twitter-x-fill" />
        </IconButton>
      </Box> */}
    </>
  );
}
export default RegisterPage;