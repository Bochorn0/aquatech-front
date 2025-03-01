import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

export function RequestAccessPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');  // Name field
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');  // Default role as 'admin'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestAccess = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.post(`${CONFIG.API_BASE_URL}/auth/register`, { 
        email, 
        nombre, 
        password, 
        role 
      });

      // Assuming a successful response will lead to some confirmation or redirection
      router.push('/login'); // Redirect to confirmation page or wherever appropriate
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Request access failed');
    } finally {
      setLoading(false);
    }
  }, [email, nombre, password, role, router]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleRequestAccess();
    }
  };

  const renderForm = (
    <Box display="flex" flexDirection="column" alignItems="flex-end">
      <TextField
        fullWidth
        name="nombre"
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={handleKeyDown}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />
      <TextField
        fullWidth
        name="email"
        label="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />
      <TextField
        fullWidth
        name="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
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
        onClick={handleRequestAccess}
        loading={loading}
      >
        Solicitar Acceso
      </LoadingButton>
    </Box>
  );

  return (
    <>
      <Helmet>
        <title> {`Request Access - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 5 }}>
        <Typography variant="h5">Solicitar Acceso</Typography>
        <Typography variant="body2" color="text.secondary">
          Ya tienes una cuenta?
          <Link variant="subtitle2" sx={{ ml: 0.5 }} href="/login">
            Iniciar sesión
          </Link>
        </Typography>
      </Box>

      {renderForm}

      <Divider sx={{ my: 3, '&::before, &::after': { borderTopStyle: 'dashed' } }} />
    </>
  );
}

export default RequestAccessPage;
