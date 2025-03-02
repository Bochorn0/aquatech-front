import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import { Box, Chip, Table, Paper, Avatar, Button, Select, MenuItem,TableRow, TableCell, TableBody, TableHead, InputLabel, Typography, FormControl, TableContainer, CircularProgress } from '@mui/material';

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

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;

        const params: any = {};
        if (statusFilter) params.status = statusFilter;
        if (roleFilter) params.role = roleFilter;

        const response = await axios.get(`${CONFIG.API_BASE_URL}/users`, { params });
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token'); // Remove token if unauthorized
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [statusFilter, roleFilter]);

  const updateUser = async (userId: string, data: Partial<User>) => {
    try {
      const token = localStorage.getItem('token');
      const updatedUser = { ...data };
      console.log('updatedUser', updatedUser);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      await axios.patch(`${CONFIG.API_BASE_URL}/users/${userId}`, updatedUser);
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user._id === userId ? { ...user, ...data } : user))
      );
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const currentUser = users.find((user) => user._id === userId);
      if (!currentUser) return;
      currentUser.status = 'active';
      await updateUser(userId, currentUser);
    } catch (error) {
      console.error('Error approving user:', error);
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
        <title>Usuarios - {CONFIG.appName}</title>
      </Helmet>

      <Box display="flex" gap={2} mb={2}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter || ''} onChange={(e) => setStatusFilter(e.target.value || null)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Role</InputLabel>
          <Select value={roleFilter || ''} onChange={(e) => setRoleFilter(e.target.value || null)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="tecnico">Tecnico</MenuItem>
            <MenuItem value="usuario">Usuario</MenuItem>
          </Select>
        </FormControl>
      </Box>

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
              <TableRow key={user._id}>
                <TableCell>
                  <Box gap={2} display="flex" alignItems="center">
                    <Avatar alt={user.nombre} src={user.avatar} />
                    {user.nombre}
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.empresa}</TableCell>
                <TableCell>{user.puesto}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <Chip
                    label={user.verified ? 'Verificado' : 'No verificado'}
                    color={user.verified ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.status === 'pending' ? (
                    <Button variant="contained" color="primary" size="small" onClick={() => approveUser(user._id)}>
                      Approve
                    </Button>
                  ) : (
                    <Chip
                      label={user.status}
                      color={user.status === 'active' ? 'success' : 'error'}
                      size="small"
                    />
                  )}
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
