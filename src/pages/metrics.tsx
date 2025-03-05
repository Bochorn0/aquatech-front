import axios from "axios";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";

import { styled } from '@mui/material/styles';
import {
  Box,
  Grid,
  Paper,
  Table,
  Button,
  Dialog,
  TableRow,
  TableBody,
  TableHead,
  TableCell,
  TextField,
  IconButton,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  CircularProgress
} from "@mui/material";

import { CONFIG } from "src/config-global";

import { SvgColor } from 'src/components/svg-color';


interface Metric {
  _id?: string;
  cliente: string;
  product_type: string;
  tds_range: number;
  production_volume_range: number;
  temperature_range: number;
  rejected_volume_range: number;
  flow_rate_speed_range: number;
  active_time: number;
  metrics_description: string;
}

const StyledTableContainer = styled(TableContainer)({
  borderRadius: '12px',
  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
});

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

const StyledTableCell = styled(TableCell)({
  padding: '12px',
  fontSize: '14px',
});
const StyledTableCellHeader = styled(TableCell)({
  padding: '12px',
  fontSize: '14px',
  fontWeight: 'bold',
});

export function MetricForm() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [formData, setFormData] = useState<Metric>({
    cliente: "",
    product_type: "",
    tds_range: 0,
    production_volume_range: 0,
    temperature_range: 0,
    rejected_volume_range: 0,
    flow_rate_speed_range: 0,
    active_time: 0,
    metrics_description: "",
  });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/metrics`);
      setMetrics(response.data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: name.includes("range") || name === "active_time" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editingId) {
        await axios.patch(`${CONFIG.API_BASE_URL}/metrics/${editingId}`, formData);
      } else {
        await axios.post(`${CONFIG.API_BASE_URL}/metrics`, formData);
      }
      handleCloseModal();
      fetchMetrics();
    } catch (error) {
      console.error("Error submitting metric:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (metric: Metric) => {
    setFormData(metric);
    setEditingId(metric._id || null);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${CONFIG.API_BASE_URL}/metrics/${id}`);
      fetchMetrics();
    } catch (error) {
      console.error("Error deleting metric:", error);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      cliente: "",
      product_type: "",
      tds_range: 0,
      production_volume_range: 0,
      temperature_range: 0,
      rejected_volume_range: 0,
      flow_rate_speed_range: 0,
      active_time: 0,
      metrics_description: "",
    });
    setEditingId(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  return (
    <>
      <Helmet>
        <title>Gestionar Métricas - {CONFIG.appName}</title>
      </Helmet>
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h4">Lista de metricas</Typography>
              <Grid item xs={12} textAlign='right'>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Button variant="contained" color="primary" onClick={handleOpenModal}>
                    Nueva Métrica
                  </Button>
                </Box>
              </Grid>
              <Paper>
                {/* Metrics Table */}
                <StyledTableContainer sx={{ mt: 4 }}>
                    <Table>
                      <TableHead>
                        <StyledTableRow>
                          <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                          <StyledTableCellHeader>Tipo de Producto</StyledTableCellHeader>
                          <StyledTableCellHeader>TDS Range</StyledTableCellHeader>
                          <StyledTableCellHeader>Production Volume</StyledTableCellHeader>
                          <StyledTableCellHeader>Temperature</StyledTableCellHeader>
                          <StyledTableCellHeader>Actions</StyledTableCellHeader>
                        </StyledTableRow>
                      </TableHead>
                      <TableBody>
                        {metrics.map((metric) => (
                          <StyledTableRow key={metric._id}>
                            <StyledTableCell>{metric.cliente}</StyledTableCell>
                            <StyledTableCell>{metric.product_type}</StyledTableCell>
                            <StyledTableCell>{metric.tds_range}</StyledTableCell>
                            <StyledTableCell>{metric.production_volume_range}</StyledTableCell>
                            <StyledTableCell>{metric.temperature_range}</StyledTableCell>
                            <StyledTableCell>
                              <IconButton onClick={() => handleEdit(metric)} sx={{ mr: 1, color: 'primary.main' }}>
                                <SvgColor src='./assets/icons/actions/edit.svg' />
                              </IconButton>
                              <IconButton onClick={() => handleDelete(metric._id!)} sx={{ mr: 1, color: 'danger.main' }}>
                                <SvgColor src='./assets/icons/actions/delete.svg' />
                              </IconButton>
                            </StyledTableCell>
                          </StyledTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </StyledTableContainer>
              </Paper>
            </Grid>
            {/* Modal for Creating / Editing */}
            <Grid item xs={12}>
              <Dialog open={modalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
                <DialogTitle>{editingId ? "Editar Métrica" : "Nueva Métrica"}</DialogTitle>
                <DialogContent>
                  <Box display="flex" flexDirection="column" gap={2} mt={1}>
                    <TextField label="Cliente" name="cliente" value={formData.cliente} onChange={handleChange} fullWidth />
                    <TextField label="Tipo de Producto" name="product_type" value={formData.product_type} onChange={handleChange} fullWidth />
                    <TextField label="TDS Range" name="tds_range" type="number" value={formData.tds_range} onChange={handleChange} fullWidth />
                    <TextField label="Production Volume" name="production_volume_range" type="number" value={formData.production_volume_range} onChange={handleChange} fullWidth />
                    <TextField label="Temperature" name="temperature_range" type="number" value={formData.temperature_range} onChange={handleChange} fullWidth />
                    <TextField label="Rejected Volume" name="rejected_volume_range" type="number" value={formData.rejected_volume_range} onChange={handleChange} fullWidth />
                    <TextField label="Flow Rate Speed" name="flow_rate_speed_range" type="number" value={formData.flow_rate_speed_range} onChange={handleChange} fullWidth />
                    <TextField label="Active Time" name="active_time" type="number" value={formData.active_time} onChange={handleChange} fullWidth />
                    <TextField label="Descripción" name="metrics_description" value={formData.metrics_description} onChange={handleChange} fullWidth multiline rows={3} />
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseModal} color="secondary">Cancelar</Button>
                  <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : editingId ? "Actualizar" : "Guardar"}
                  </Button>
                </DialogActions>
              </Dialog>
            </Grid>
        </Grid>
      </Box>
    </>
  );
}

export default MetricForm;
