import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { post } from 'src/api/axiosHelper'; // Import the post function from axiosHelper
import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

import type { Sing } from './types';

export function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // To manage loading state
  const [errorMessage, setErrorMessage] = useState(null); // To manage error state
  
  // Forgot password modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem('token')) return; // Skip if no token exists
      post(`/auth/verify`, {}).then((response) => {
        router.push('/'); // Redirect to home if token exists
      });
    } catch (error) {
      console.error('ERROR REMOVE LOGIN', error);
      localStorage.removeItem('token'); // Remove token if invalid
      localStorage.removeItem('user'); // Remove token if invalid
    }
  }, [router]);

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null); // Clear any previous error messages

    try {
      // Send login request to backend
      const response = await  post<Sing>(`/auth/login`, { email, password });
      // Assuming response contains a token
      localStorage.setItem('token', response.token); // Store token in localStorage
      localStorage.setItem('user', JSON.stringify(response.user)); // Store user in localStorage
      router.push('/'); // Redirect to home page after successful login
    } catch (error) {
      console.error('ERROR REMOVE LOGIN', error);
      setErrorMessage(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false); // Stop loading state
    }
  }, [router, email, password]);

  // Explicitly typing the event parameter as React.KeyboardEvent
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSignIn();
    }
  };

  const handleForgotPassword = useCallback(async () => {
    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      setForgotPasswordMessage('Por favor ingresa un correo electrónico válido');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordMessage(null);

    try {
      const response = await post<{ message?: string; success?: boolean }>(`/auth/forgot-password`, { email: forgotPasswordEmail });
      setForgotPasswordMessage(response.message || 'Si el correo existe, se enviará un enlace de recuperación');
      setTimeout(() => {
        setForgotPasswordOpen(false);
        setForgotPasswordEmail('');
        setForgotPasswordMessage(null);
      }, 3000);
    } catch (error: any) {
      setForgotPasswordMessage(error.response?.data?.message || 'Error al solicitar recuperación de contraseña');
    } finally {
      setForgotPasswordLoading(false);
    }
  }, [forgotPasswordEmail]);

  const handleOpenForgotPassword = () => {
    setForgotPasswordOpen(true);
    setForgotPasswordEmail(email); // Pre-fill with current email if available
    setForgotPasswordMessage(null);
  };

  const renderForm = (
    <Box display="flex" flexDirection="column" alignItems="flex-end">
      <TextField
        fullWidth
        name="email"
        label="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown} // Add onKeyDown event here
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />
      <Link 
        variant="body2" 
        color="inherit" 
        sx={{ mb: 1.5, cursor: 'pointer' }}
        onClick={handleOpenForgotPassword}
      >
        Olvidaste tu contraseña?
      </Link>
      <TextField
        fullWidth
        name="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown} // Add onKeyDown event here
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
        <Typography variant="h5">Login</Typography>
        <Typography variant="body2" color="text.secondary">
          No tienes una cuenta?
          <Link variant="subtitle2" sx={{ ml: 0.5 }} href="/Registrarse">
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

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Recuperar Contraseña</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </Typography>
          <TextField
            fullWidth
            label="Correo Electrónico"
            type="email"
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleForgotPassword();
              }
            }}
            sx={{ mb: 2 }}
            autoFocus
          />
          {forgotPasswordMessage && (
            <Typography 
              variant="body2" 
              color={forgotPasswordMessage.includes('Error') ? 'error' : 'success.main'}
              sx={{ mt: 1 }}
            >
              {forgotPasswordMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotPasswordOpen(false)} color="secondary">
            Cancelar
          </Button>
          <LoadingButton
            onClick={handleForgotPassword}
            loading={forgotPasswordLoading}
            variant="contained"
            disabled={!forgotPasswordEmail || !forgotPasswordEmail.includes('@')}
          >
            Enviar
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default LoginPage;
