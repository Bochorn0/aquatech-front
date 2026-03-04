import Swal from 'sweetalert2';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';

import { get, post } from 'src/api/axiosHelper';

import type { User, Role } from './types';

// ----------------------------------------------------------------------

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Info' },
  { value: 'alert', label: 'Alerta' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'news', label: 'Noticias' },
  { value: 'updates', label: 'Actualizaciones' },
];

export default function NotificationsDashboard() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<string>('info');

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await get<User[]>('/users');
      setUsers(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await get<Role[]>('/roles');
      setRoles(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const selectedUsers = users.filter((u) => selectedUserIds.includes(u._id));
  const selectedRoles = roles.filter((r) => r._id && selectedRoleIds.includes(String(r._id)));
  const recipientIds = new Set(selectedUserIds);
  selectedRoles.forEach((role) => {
    users
      .filter((u) => String(u.role_id ?? u.role) === String(role._id))
      .forEach((u) => recipientIds.add(u._id));
  });
  const totalRecipients = recipientIds.size;

  const canSubmit =
    (selectedUserIds.length > 0 || selectedRoleIds.length > 0) &&
    title.trim().length > 0 &&
    description.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const result = await Swal.fire({
      icon: 'question',
      title: 'Confirmar envío',
      html: `
        <p>Se enviará la notificación a <strong>${totalRecipients}</strong> usuario(s).</p>
        <p><strong>Título:</strong> ${title}</p>
        <p><strong>Mensaje:</strong> ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      await post('/notifications/generate', {
        userIds: selectedUserIds,
        roleIds: selectedRoleIds,
        title: title.trim(),
        description: description.trim(),
        type,
        url: url.trim() || undefined,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Notificaciones enviadas',
        text: `Se crearon ${totalRecipients} notificación(es) correctamente.`,
      });

      setSelectedUserIds([]);
      setSelectedRoleIds([]);
      setTitle('');
      setDescription('');
      setUrl('');
    } catch (error: any) {
      console.error('Error generating notifications:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'No se pudieron enviar las notificaciones.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Notificaciones | TI Water</title>
      </Helmet>

      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h4">Crear notificaciones</Typography>
          <Typography variant="body2" color="text.secondary">
            Selecciona usuarios o roles para enviar una notificación personalizada.
          </Typography>

          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Autocomplete
                multiple
                options={users}
                getOptionLabel={(u) => `${u.nombre || u.email} (${u.email})`}
                value={selectedUsers}
                onChange={(_, newValue) => setSelectedUserIds(newValue.map((u) => u._id))}
                renderInput={(params) => (
                  <TextField {...params} label="Usuarios específicos" placeholder="Buscar usuario..." />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option._id}
                      size="small"
                      label={option.nombre || option.email}
                    />
                  ))
                }
              />

              <Autocomplete
                multiple
                options={roles}
                getOptionLabel={(r) => r.name}
                value={selectedRoles}
                onChange={(_, newValue) =>
                  setSelectedRoleIds(newValue.map((r) => String(r._id!)).filter(Boolean))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Roles" placeholder="Seleccionar roles..." />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option._id}
                      size="small"
                      label={option.name}
                    />
                  ))
                }
              />

              {totalRecipients > 0 && (
                <Typography variant="body2" color="primary">
                  Total de destinatarios: {totalRecipients}
                </Typography>
              )}

              <TextField
                label="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                fullWidth
              />

              <TextField
                label="Mensaje"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                fullWidth
                multiline
                rows={4}
              />

              <TextField
                label="URL (opcional)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={type}
                  label="Tipo"
                  onChange={(e) => setType(e.target.value)}
                >
                  {NOTIFICATION_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <LoadingButton
                variant="contained"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={loading}
              >
                Generar notificaciones
              </LoadingButton>
            </Stack>
          </Card>
        </Stack>
      </Box>
    </>
  );
}
