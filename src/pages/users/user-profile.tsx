import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import { Box, Avatar, Button, TextField, Typography, IconButton, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';

interface User {
  _id: string;
  nombre: string;
  email: string;
  empresa: string;
  role: string;
  verified: boolean;
  puesto: string;
  status: string;
  avatar: string;
}

export function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<User>({
    _id: '',
    nombre: '',
    email: '',
    empresa: '',
    role: '',
    verified: false,
    puesto: '',
    status: '',
    avatar: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    try {
      const localUser = localStorage.getItem('user');
      if (localUser) {
        const parsedUser: User = JSON.parse(localUser);
        setUser(parsedUser);
        setFormData(parsedUser);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Email validation function
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Handle input changes with validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Validate fields
    let errorMsg = '';
    if (name === 'email' && !isValidEmail(value)) {
      errorMsg = 'Correo inválido';
    } else if (['nombre', 'empresa', 'puesto'].includes(name) && value.trim() === '') {
      errorMsg = 'Este campo no puede estar vacío';
    }

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: errorMsg,
    }));
  };

  const handleSave = async () => {
    try {
      if (Object.values(errors).some((error) => error !== '') || !formData.email || !formData.nombre) {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const updatedUser = await axios.patch(
        `${CONFIG.API_BASE_URL}/users/${user?._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser.data));
        setUser(updatedUser.data);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prevData) => ({
          ...prevData,
          avatar: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>Perfil - {CONFIG.appName}</title>
      </Helmet>
      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        <Typography variant="h4">Perfil</Typography>
        <label htmlFor="avatar-upload">
          <IconButton component="span">
            <Avatar src={formData.avatar} sx={{ width: 100, height: 100 }} />
          </IconButton>
        </label>
        <input
          type="file"
          accept="image/*"
          id="avatar-upload"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
        <TextField
          label="Nombre"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          fullWidth
          error={!!errors.nombre}
          helperText={errors.nombre}
        />
        <TextField
          label="Correo"
          name="email"
          value={formData.email}
          onChange={handleChange}
          fullWidth
          error={!!errors.email}
          helperText={errors.email}
        />
        <TextField
          label="Empresa"
          name="empresa"
          value={formData.empresa}
          onChange={handleChange}
          fullWidth
          error={!!errors.empresa}
          helperText={errors.empresa}
        />
        <TextField
          label="Puesto"
          name="puesto"
          value={formData.puesto}
          onChange={handleChange}
          fullWidth
          error={!!errors.puesto}
          helperText={errors.puesto}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={Object.values(errors).some((error) => error !== '') || !formData.email || !formData.nombre}
        >
          Guardar Cambios
        </Button>
      </Box>
    </>
  );
}

export default Profile;
