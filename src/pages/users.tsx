import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import { Box, Chip, Table, Paper, Avatar, TableRow, TableCell, TableBody, TableHead, Typography, TableContainer, CircularProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';


export function UserList() {
  const [users, setUsers] = useState([ {id: '1', name: '', company: true, isVerified: '', avatarUrl:'', status: 'active', 'role': 'Consultor'} ]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/users`);
        console.log(response, 'response');
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
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
              <TableCell>Empresa</TableCell>
              <TableCell>Puesto</TableCell>
              <TableCell>Vericicado</TableCell>
              <TableCell>Estatus</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box gap={2} display="flex" alignItems="center">
                    <Box gap={2} display="flex" alignItems="center">
                      <Avatar alt={user.name} src={user.avatarUrl} />
                      {user.name}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body1">{user.company}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body1">{user.role}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isVerified ? 'Verificado' : 'No verificado'}
                    color={user.isVerified ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
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