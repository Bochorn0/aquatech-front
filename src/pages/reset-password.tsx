import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { post } from 'src/api/axiosHelper';
import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Verify token on mount
    if (!token) {
      setErrorMessage('Token de recuperación no encontrado');
      setVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await post<{ success?: boolean; email?: string; message?: string }>(`/auth/verify-reset-token`, { token });
        if (response.success) {
          setUserEmail(response.email || '');
          setVerifying(false);
        } else {
          setErrorMessage('Token inválido o expirado');
          setVerifying(false);
        }
      } catch (error: any) {
        setErrorMessage(error.response?.data?.message || 'Token inválido o expirado');
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleResetPassword = useCallback(async () => {
    if (!token) {
      setErrorMessage('Token de recuperación no encontrado');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await post<{ message?: string; success?: boolean }>(`/auth/reset-password`, { token, password });
      setSuccessMessage(response.message || 'Contraseña restablecida exitosamente');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  }, [token, password, confirmPassword, navigate]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleResetPassword();
    }
  };

  if (verifying) {
    return (
      <>
        <Helmet>
          <title>{`Verificando - ${CONFIG.appName}`}</title>
        </Helmet>
        <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 5 }}>
          <Typography variant="h5">Verificando token...</Typography>
        </Box>
      </>
    );
  }

  if (errorMessage && !token) {
    return (
      <>
        <Helmet>
          <title>{`Error - ${CONFIG.appName}`}</title>
        </Helmet>
        <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 5 }}>
          <Typography variant="h5">Error</Typography>
          <Alert severity="error" sx={{ width: '100%', maxWidth: 400 }}>
            {errorMessage}
          </Alert>
          <Link variant="subtitle2" sx={{ mt: 2 }} href="/login">
            Volver al inicio de sesión
          </Link>
        </Box>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Restablecer Contraseña - ${CONFIG.appName}`}</title>
      </Helmet>
      <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 5 }}>
        <Typography variant="h5">Restablecer Contraseña</Typography>
        {userEmail && (
          <Typography variant="body2" color="text.secondary">
            Restableciendo contraseña para: {userEmail}
          </Typography>
        )}
      </Box>

      <Box display="flex" flexDirection="column" alignItems="flex-end">
        {errorMessage && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        <TextField
          fullWidth
          name="password"
          label="Nueva Contraseña"
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
        <TextField
          fullWidth
          name="confirmPassword"
          label="Confirmar Contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          InputLabelProps={{ shrink: true }}
          type={showConfirmPassword ? 'text' : 'password'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                  <Iconify icon={showConfirmPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />
        <LoadingButton
          fullWidth
          size="large"
          type="submit"
          color="inherit"
          variant="contained"
          onClick={handleResetPassword}
          loading={loading}
          disabled={!!successMessage}
        >
          {successMessage ? 'Redirigiendo...' : 'Restablecer Contraseña'}
        </LoadingButton>
        <Link variant="subtitle2" sx={{ mt: 2 }} href="/login">
          Volver al inicio de sesión
        </Link>
      </Box>
    </>
  );
}

export default ResetPasswordPage;
