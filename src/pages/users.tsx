import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import { Box, Chip, Table, Paper, Avatar, TableRow, TableCell, TableBody, TableHead, Typography, TableContainer, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';

interface User {
  id: string;
  nombre: string;
  email: string;
  empresa: string;
  role: string;
  verified: boolean;
  puesto: string;
  status: string;
  avatar: string;
}
export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        const response = await axios.get(`${CONFIG.API_BASE_URL}/users`);
        console.log(response, 'response');
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token'); // Remove token if invalid
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000); // Refresh every 30 seconds
  
    return () => clearInterval(interval);
  }, []);

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
        <title> {`Usuarios - ${CONFIG.appName}`}</title>
      </Helmet>
      <TableContainer component={Paper}>
        <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
          User List
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Puesto</TableCell>
              <TableCell>Permisos</TableCell>
              <TableCell>Verificado</TableCell>
              <TableCell>Estatus</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box gap={2} display="flex" alignItems="center">
                    <Box gap={2} display="flex" alignItems="center">
                      <Avatar alt={user.nombre} src={user.avatar} />
                      {user.nombre}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body1">{user.email}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body1">{user.empresa}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body1">{user.puesto}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body1">{user.role}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.verified ? 'Verificado' : 'No verificado'}
                    color={user.verified ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status ? 'Activo' : 'Inactivo'}
                    color={user.status ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export default UserList;