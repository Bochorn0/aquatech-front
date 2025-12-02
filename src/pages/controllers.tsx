import Swal from "sweetalert2";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";

import {
  Box,
  Grid,
  Table,
  Select,
  Button,
  Dialog,
  MenuItem,
  TableRow,
  TableBody,
  TableHead,
  TextField,
  InputLabel,
  IconButton,
  Typography,
  FormControl,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";

import { CustomTab, CustomTabs, StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { get, post, patch, remove } from "src/api/axiosHelper";

import { SvgColor } from "src/components/svg-color";

import type { Cliente, Product, Controller } from "./types";

const defaultController: Controller = {
  _id: "",
  name: "",
  ip: "",
  id: "",
  product_type: "",
  kfactor_tds: 0,
  kfactor_flujo: 0,
  cliente: "",
  product: "",
  online: false,
  active_time: 0,
  create_time: 0,
  // 🔥 Nuevos
  reset_pending: false,
  flush_pending: false,
  update_controller_time: 10000,
  loop_time: 1000,
  flush_time: 20000,
  sensor_factor: 0,
  tipo_sensor: "1"
};


export default function ControllersPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [controllerForm, setControllerForm] = useState<Controller>(defaultController);
  const [controllerModalOpen, setControllerModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tab 2: inventario
  // const [inventory, setInventory] = useState([]);

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchControllers();
    fetchInventory();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await get<Cliente[]>(`/clients`);
      setClients(response);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await get<Product[]>(`/products`);
      setProducts(response);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchControllers = async () => {
    try {
      const response = await get<Controller[]>(`/controllers`);
      setControllers(response);
    } catch (error) {
      console.error("Error fetching controllers:", error);
    }
  };

  const fetchInventory = async () => {
    try {
      // const response = await get<InventoryItem[]>(`/inventorys`);
      // setInventory(response);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const confirmationAlert = () => Swal.fire({
    icon: 'warning',
    title: 'Advertencia',
    text: '¿Estás seguro de que deseas eliminar este registro?',
    showCancelButton: true,
    confirmButtonText: 'Sí, Continuar',
    cancelButtonText: 'Cancelar',
  });

  // Handlers
  const handleControllerEdit = (controller: Controller) => {
    setControllerForm(controller);
    setControllerModalOpen(true);
  };

  const handleControllerSubmit = async () => {
    setLoading(true);

    // 🔥 Validación forzada
    let loopTime = Number(controllerForm.loop_time);
    if (loopTime < 1000) loopTime = 1000;
    if (loopTime > 10000) loopTime = 10000;

    const controllerToSubmit = { ...controllerForm, lapso_loop: loopTime };

    try {
      if (controllerForm._id) {
        await patch(`/controllers/${controllerForm._id}`, controllerToSubmit);
      } else {
        await post(`/controllers`, controllerToSubmit);
      }
      fetchControllers();
      setControllerModalOpen(false);
    } catch (error) {
      console.error("Error submitting controller:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleControllerDelete = async (id: string) => {
    const result = await confirmationAlert();
    if (result.isConfirmed) {
      await remove(`/controllers/${id}`);
      fetchControllers();
    }
  };

  const handleOpenControllerModal = () => {
    setControllerForm(defaultController);
    setControllerModalOpen(true);
  };

  const handleCloseModal = () => setControllerModalOpen(false);

  const handleControllerChange = (e: any) => {
    const { name, value } = e.target;
    setControllerForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <Helmet>
        <title>Controladores</title>
      </Helmet>

      <Box sx={{ p: 2 }}>
        <CustomTabs value={tabIndex} onChange={(_, newIndex) => setTabIndex(newIndex)}>
          <CustomTab label="Controladores" />
          <CustomTab label="Inventario" />
        </CustomTabs>

        <Box mt={2}>
          {tabIndex === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5">Lista de Controladores</Typography>
                  <Button variant="contained" color="primary" onClick={handleOpenControllerModal}>
                    Añadir Controlador
                  </Button>
                </Box>

                <StyledTableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                        <StyledTableCellHeader>IP</StyledTableCellHeader>
                        <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                        <StyledTableCellHeader>Producto</StyledTableCellHeader>
                        <StyledTableCellHeader>Ajuste TDS</StyledTableCellHeader>
                        <StyledTableCellHeader>Ajuste Flujo</StyledTableCellHeader>
                        <StyledTableCellHeader>Lapso Actualización</StyledTableCellHeader>
                        <StyledTableCellHeader>Lapso Loop</StyledTableCellHeader>
                        <StyledTableCellHeader>Reset Pendiente</StyledTableCellHeader>
                        <StyledTableCellHeader>Online</StyledTableCellHeader>
                        <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {controllers.map((ctrl) => (
                        <StyledTableRow key={ctrl._id}>
                          <StyledTableCell>{ctrl.name}</StyledTableCell>
                          <StyledTableCell>{ctrl.ip}</StyledTableCell>
                          <StyledTableCell>{clients.find(c => c._id === ctrl.cliente)?.name || ""}</StyledTableCell>
                          <StyledTableCell>{products.find(p => p._id === ctrl.product)?.name || ""}</StyledTableCell>
                          <StyledTableCell>{ctrl.kfactor_tds}</StyledTableCell>
                          <StyledTableCell>{ctrl.kfactor_flujo}</StyledTableCell>
                          <StyledTableCell>{ctrl.update_controller_time} ms</StyledTableCell>
                          <StyledTableCell>{ctrl.loop_time} ms</StyledTableCell>
                          <StyledTableCell>{ctrl.reset_pending ? "Sí" : "No"}</StyledTableCell>
                          <StyledTableCell>{ctrl.flush_pending ? "Sí" : "No"}</StyledTableCell>

                          <StyledTableCell>{ctrl.online ? "Sí" : "No"}</StyledTableCell>
                          <StyledTableCell>
                            <IconButton onClick={() => handleControllerEdit(ctrl)}>
                              <SvgColor src='./assets/icons/actions/edit.svg' />
                            </IconButton>
                            <IconButton onClick={() => handleControllerDelete(ctrl._id)}>
                              <SvgColor src='./assets/icons/actions/delete.svg' />
                            </IconButton>
                          </StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              </Grid>
            </Grid>
          )}

          {tabIndex === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>Inventario</Typography>
                <StyledTableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <StyledTableCellHeader>Nombre Item</StyledTableCellHeader>
                        <StyledTableCellHeader>Cantidad</StyledTableCellHeader>
                        <StyledTableCellHeader>Controlador</StyledTableCellHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      Proximament disponible ...
                      {/* {inventory.map((item) => (
                        <StyledTableRow key={item._id}>
                          <StyledTableCell>{item.name}</StyledTableCell>
                          <StyledTableCell>{item.quantity}</StyledTableCell>
                          <StyledTableCell>
                            {item.controllers
                              .map(id => controllers.find(c => c._id === id)?.name)
                              .filter(Boolean)
                              .join(", ")}
                          </StyledTableCell>
                        </StyledTableRow>
                      ))} */}
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              </Grid>
            </Grid>
          )}
        </Box>
      </Box>

      {/* Modal Crear / Editar Controlador */}
      <Dialog open={controllerModalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <DialogTitle>{controllerForm._id ? "Editar Controlador" : "Nuevo Controlador"}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Nombre" name="name" value={controllerForm.name} onChange={handleControllerChange} fullWidth />
            <TextField label="IP" name="ip" value={controllerForm.ip} onChange={handleControllerChange} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Cliente</InputLabel>
              <Select name="cliente" value={controllerForm.cliente} onChange={handleControllerChange}>
                {clients.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Producto</InputLabel>
              <Select name="product" value={controllerForm.product} onChange={handleControllerChange}>
                {products.map(p => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField type="number" label="Ajuste TDS" name="kfactor_tds" value={controllerForm.kfactor_tds} onChange={handleControllerChange} fullWidth />
            <TextField type="number" label="Ajuste Flujo" name="kfactor_flujo" value={controllerForm.kfactor_flujo} onChange={handleControllerChange} fullWidth />
            <TextField
              type="number"
              label="Lapso de Actualización (ms)"
              name="update_controller_time"
              value={controllerForm.update_controller_time}
              onChange={handleControllerChange}
              fullWidth
            />

            <TextField
              type="number"
              label="Loop Time (ms)  Min: 1s, Max: 10s"
              name="loop_time"
              value={controllerForm.loop_time}
              onChange={handleControllerChange}
              onBlur={() => {
                let val = Number(controllerForm.loop_time);
                if (val < 1000) val = 1000;
                if (val > 10000) val = 10000;
                setControllerForm((prev) => ({ ...prev, loop_time: val }));
              }}
              fullWidth
              inputProps={{ min: 1000, max: 10000 }}
            />

            <TextField
              type="number"
              label="Flush (ms)  Min: 20s, Max: 60s"
              name="flush_time"
              value={controllerForm.flush_time}
              onChange={handleControllerChange}
              onBlur={() => {
                let val = Number(controllerForm.flush_time);
                if (val < 20000) val = 20000;
                if (val > 60000) val = 60000;
                setControllerForm((prev) => ({ ...prev, flush_time: val }));
              }}
              fullWidth
              inputProps={{ min: 20000, max: 60000 }}
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Sensor</InputLabel>
              <Select name="tipo_sensor" value={controllerForm.tipo_sensor} onChange={handleControllerChange}>
                <MenuItem value="1">Sensor de Presion 1</MenuItem>
                <MenuItem value="2">Sensor de Presion 2</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type="number"
              label="Ajuste Factor de Sensor Presion"
              name="sensor_factor"
              value={controllerForm.sensor_factor}
              onChange={handleControllerChange}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Reinicio Remoto</InputLabel>
              <Select
                name="reset_pending"
                value={controllerForm.reset_pending ? "true" : "false"}
                onChange={(e) =>
                  setControllerForm({
                    ...controllerForm,
                    reset_pending: e.target.value === "true",
                  })
                }
              >
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Flush Remoto</InputLabel>
              <Select
                name="flush_pending"
                value={controllerForm.flush_pending ? "true" : "false"}
                onChange={(e) =>
                  setControllerForm({
                    ...controllerForm,
                    flush_pending: e.target.value === "true",
                  })
                }
              >
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>

            {/* <FormControl fullWidth>
              <InputLabel>Online</InputLabel>
              <Select name="online" value={controllerForm.online ? "true" : "false"} onChange={(e) => setControllerForm({...controllerForm, online: e.target.value === "true"})}>
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl> */}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="secondary">Cancelar</Button>
          <Button onClick={handleControllerSubmit} variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : controllerForm._id ? "Actualizar" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
