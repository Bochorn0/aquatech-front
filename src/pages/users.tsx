import Swal from "sweetalert2";
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import {
  Box,
  Grid,
  Paper,
  Table,
  Select,
  Button,
  Dialog,
  MenuItem,
  TableRow,
  Checkbox,
  TableBody,
  TableHead,
  TextField,
  FormGroup,
  InputLabel,
  IconButton,
  Typography,
  FormControl,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormControlLabel
} from "@mui/material";

import { CustomTab, CustomTabs, StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { CONFIG } from "src/config-global";
import { get, post, patch, remove } from "src/api/axiosHelper";

import { SvgColor } from 'src/components/svg-color';

import type { User, Role, Cliente } from './types';

const defaultUser = { _id: '', nombre: '', email: '', password:'',  client_name: '', role_name: '', cliente: '', role: { _id: '', name: '' }, verified: false, puesto: '', status: '', mqtt_zip_password: '' };
export default function UserRoleManagement() {
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [userForm, setUserForm] = useState<User>(defaultUser);
  const [roleForm, setRoleForm] = useState<Role>({ name: '', permissions: [] });
  
  // Definir todas las rutas disponibles del menú
  const availableRoutes = [
    { path: '/', label: 'Dashboard' },
    { path: '/equipos', label: 'Equipos' },
    { path: '/personalizacion', label: 'Personalizacion' },
    { path: '/usuarios', label: 'Usuarios' },
    { path: '/controladores', label: 'Controladores' },
    { path: '/puntoVenta', label: 'Puntos De Venta' },
    { path: '/tiwater-catalog', label: 'Catálogo TI Water' },
    { path: '/api-ti-water', label: 'API TI Water' },
  ];
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await get<Cliente[]>(`/clients`);
      setClients(response);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchUsers = async () => {
    const response = await get<User[]>(`/users`);
    setUsers(response);
  };

  const fetchRoles = async () => {
    const response = await get<Role[]>(`/roles`);
    setRoles(response);
  };

  const confirmationAlert = () => Swal.fire({
    icon: 'warning',
    title: 'Advertencia',
    text: '¿Estás seguro de que deseas eliminar este registro?',
    showCancelButton: true,
    confirmButtonText: 'Sí, Continuar',
    cancelButtonText: 'Cancelar',
  });
  
  const handleUserEdit = (user: User) => {
    console.log(user);
    setUserForm(user);
    setUserModalOpen(true);
  };

  const handleRoleEdit = (role: Role) => {
    setRoleForm({ ...role, permissions: role.permissions || [] });
    setRoleModalOpen(true);
  };

  const handleUserSubmit = async () => {
    setLoading(true);
    try {
      if (userForm._id) {
        await patch(`/users/${userForm._id}`, userForm);
      } else {
        await post(`/users`, userForm);
      }
      fetchUsers();
      setUserModalOpen(false);
    } catch (error) {
      console.error("Error submitting user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSubmit = async () => {
    setLoading(true);
    try {
      if (roleForm._id) {
        await patch(`/roles/${roleForm._id}`, roleForm);
      } else {
        await post(`/roles`, roleForm);
      }
      fetchRoles();
      setRoleModalOpen(false);
    } catch (error) {
      console.error("Error submitting role:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await remove(`/users/${id}`);
        fetchUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleRoleDelete = async (id: string) => {
    try {
      const result = await confirmationAlert();
      if (result.isConfirmed) {
        await remove(`/roles/${id}`);
        fetchRoles();
      }
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  const handleOpenUserModal = () => {
    setUserForm(defaultUser);
    setUserModalOpen(true);
  };

  const handleOpenRoleModal = () => {
    setRoleForm({ name: '', permissions: [] });
    setRoleModalOpen(true);
  };

  const handleCloseModal = () => {
    setUserModalOpen(false);
    setRoleModalOpen(false);
  };

  const handleUserChange = (e: any) => {
    console.log(e.target);
    const { name, value } = e.target;
    const updatedForm = {
      ...userForm,
      [name]: value,
    };
    
    // Si se cambia el password, también actualizar mqtt_zip_password con el mismo valor
    if (name === 'password' && value.trim() !== '') {
      updatedForm.mqtt_zip_password = value;
    }
    
    setUserForm(updatedForm);
  };

  const handleRoleChange = (e: any) => {
    setRoleForm({ ...roleForm, [e.target.name]: e.target.value });
  };

  const handlePermissionChange = (routePath: string) => {
    setRoleForm((prev) => {
      const currentPermissions = prev.permissions || [];
      const isSelected = currentPermissions.includes(routePath);
      return {
        ...prev,
        permissions: isSelected
          ? currentPermissions.filter((p) => p !== routePath)
          : [...currentPermissions, routePath],
      };
    });
  };

  return (
    <>
      <Helmet>
        <title>Usuarios - {CONFIG.appName}</title>
      </Helmet>

    <Box sx={{ p: 2 }}>
      <CustomTabs value={tabIndex} onChange={(_, newIndex) => setTabIndex(newIndex)}>
        <CustomTab label="Users" />
        <CustomTab label="Roles" />
      </CustomTabs>
      <Box mt={2}>
        {tabIndex === 0 && (
          <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ overflowX: 'auto' }}> {/* Ensures table responsiveness */}
              <Grid container>
                <Grid item xs={12} sm={9}>
                  <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                  Lista de Usuarios
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3} textAlign='right'>
                  <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                  <Button variant="contained" color="primary" onClick={handleOpenUserModal} fullWidth>
                    Añadir Usuario
                  </Button>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            <StyledTableContainer>
              <Paper elevation={3}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                        <StyledTableCellHeader>Name</StyledTableCellHeader>
                        <StyledTableCellHeader>Email</StyledTableCellHeader>
                        <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                        <StyledTableCellHeader>Role</StyledTableCellHeader>
                        <StyledTableCellHeader>Status</StyledTableCellHeader>
                        <StyledTableCellHeader>Actions</StyledTableCellHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <StyledTableRow key={user._id}>
                          <StyledTableCell>{user.nombre}</StyledTableCell>
                          <StyledTableCell>{user.email}</StyledTableCell>
                          <StyledTableCell>{user.client_name}</StyledTableCell>
                          <StyledTableCell>{user.role_name}</StyledTableCell>
                          <StyledTableCell>{user.status}</StyledTableCell>
                          <StyledTableCell>
                            <IconButton sx={{ mr: 1, color: 'primary.main' }} onClick={() => handleUserEdit(user)}>
                              <SvgColor src='./assets/icons/actions/edit.svg' />
                            </IconButton>
                            <IconButton sx={{ mr: 1, color: 'danger.main' }} onClick={() => handleUserDelete(user._id!)}>
                              <SvgColor src='./assets/icons/actions/delete.svg' />
                            </IconButton>
                          </StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </StyledTableContainer>
          </Grid>
        </Grid>
        )}
        {tabIndex === 1 && (
          <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ overflowX: 'auto' }}> {/* Ensures table responsiveness */}
              <Grid container>
                <Grid item xs={12} sm={9}>
                  <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                  Lista de roles
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3} textAlign='right'>
                  <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
                  <Button variant="contained" color="primary" onClick={handleOpenRoleModal} fullWidth>
                    Nuevo Rol
                  </Button>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            <StyledTableContainer>
              <Paper elevation={3}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f4f6f8' }}>
                        <StyledTableCellHeader>Role Name</StyledTableCellHeader>
                        <StyledTableCellHeader>Actions</StyledTableCellHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roles.map((role) => (
                        <StyledTableRow key={role._id}>
                          <StyledTableCell>
                            <Box>
                              <Typography variant="body2">{role.name}</Typography>
                              {role.permissions && role.permissions.length > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  {role.permissions.length} permiso(s)
                                </Typography>
                              )}
                            </Box>
                          </StyledTableCell>
                          <StyledTableCell>
                            <IconButton sx={{ mr: 1, color: 'primary.main' }} onClick={() => handleRoleEdit(role)}>
                              <SvgColor src='./assets/icons/actions/edit.svg' />
                            </IconButton>
                            <IconButton sx={{ mr: 1, color: 'danger.main' }} onClick={() => handleRoleDelete(role._id!)}>
                              <SvgColor src='./assets/icons/actions/delete.svg' />
                            </IconButton>
                          </StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </StyledTableContainer>
          </Grid>
        </Grid>
        )}
      </Box>
    </Box>
    <Grid item xs={12}>
      <Dialog open={userModalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <DialogTitle>{userForm._id ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Nombre" name="nombre" value={userForm.nombre} onChange={handleUserChange} fullWidth />
            <TextField label="Email" name="email" value={userForm.email} onChange={handleUserChange} fullWidth />
            <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select value={userForm.cliente} name="cliente" onChange={handleUserChange} fullWidth>
                  {clients.map((cliente) => (
                    <MenuItem key={cliente._id} value={cliente._id}>{cliente.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            <FormControl fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select value={userForm.role} name="role" onChange={handleUserChange} fullWidth>
                {roles.map((role) => (
                  <MenuItem key={role._id} value={role._id}>{role.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Puesto" name="puesto" value={userForm.puesto} onChange={handleUserChange} fullWidth />
            <TextField label="Password" name="password" type="password" value={userForm.password} onChange={handleUserChange} fullWidth />
            <TextField 
              label="Contraseña ZIP MQTT" 
              name="mqtt_zip_password" 
              type="password"
              value={userForm.mqtt_zip_password || ''} 
              onChange={handleUserChange} 
              fullWidth 
              helperText="Se sincroniza automáticamente con la contraseña de inicio de sesión. La contraseña del ZIP será la misma que la de inicio de sesión."
              disabled={!!userForm.password && userForm.password.trim() !== ''}
            />
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select value={userForm.status} name="status" onChange={handleUserChange} fullWidth>
                <MenuItem value="active">Activo</MenuItem>
                <MenuItem value="inactive">Inactivo</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="secondary">Cancelar</Button>
          <Button onClick={handleUserSubmit} variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : userForm._id ? "Actualizar" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
      </Grid>
      <Grid item xs={12}>
        <Dialog open={roleModalOpen} onClose={handleCloseModal} fullWidth maxWidth="md">
          <DialogTitle>{roleForm._id ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField label="Nombre" name="name" value={roleForm.name} onChange={handleRoleChange} fullWidth />
              
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                  Permisos de Menú (Rutas Permitidas)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Selecciona las rutas que los usuarios con este rol podrán ver en el menú
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                  <FormGroup>
                    {availableRoutes.map((route) => (
                      <FormControlLabel
                        key={route.path}
                        control={
                          <Checkbox
                            checked={(roleForm.permissions || []).includes(route.path)}
                            onChange={() => handlePermissionChange(route.path)}
                          />
                        }
                        label={route.label}
                      />
                    ))}
                  </FormGroup>
                </Paper>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal} color="secondary">Cancelar</Button>
            <Button onClick={handleRoleSubmit} variant="contained" color="primary" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : roleForm._id ? "Actualizar" : "Guardar"}
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
    </>
  );
}
