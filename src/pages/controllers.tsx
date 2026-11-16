import Swal from "sweetalert2";
import { Helmet } from "react-helmet-async";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Chip,
  Paper,
  Table,
  Button,
  Select,
  MenuItem,
  TableRow,
  TableBody,
  TableHead,
  TextField,
  IconButton,
  Typography,
  InputLabel,
  FormControl,
  TablePagination,
} from "@mui/material";

import { get, remove } from "src/api/axiosHelper";

import { SvgColor } from "src/components/svg-color";
import { StyledTableRow, StyledTableCell, StyledTableContainer, StyledTableCellHeader } from "src/utils/styles";

import { rulesFromController } from "./controller-rules-dialog";

import type { Cliente, Controller } from "./types";

const RELAY_LABELS = ["Cruda", "Flush", "Cloro", "Pura"];

function clientId(client: Cliente) {
  return client._id || client.id || "";
}

function clientName(clients: Cliente[], id?: string) {
  if (!id) return "Sin cliente";
  return clients.find((client) => clientId(client) === id)?.name || "Sin cliente";
}

function deviceKey(controller: Controller) {
  const device = String(controller.device_id || "").trim();
  const id = String(controller.id || "").trim();
  return device || (id && id !== String(controller._id || "") ? id : "") || controller._id;
}

function controllerPath(controller: Controller) {
  return `/controladores/${encodeURIComponent(deviceKey(controller))}`;
}

export default function ControllersPage() {
  const navigate = useNavigate();
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    get<Cliente[]>(`/clients`).then(setClients).catch((error) => console.error("Error fetching clients:", error));
    get<Controller[]>(`/controllers`).then(setControllers).catch((error) => console.error("Error fetching controllers:", error));
  }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return controllers.filter((controller) => {
      if (statusFilter === "online" && !controller.online) return false;
      if (statusFilter === "offline" && controller.online) return false;
      if (clientFilter && String(controller.cliente || "") !== clientFilter) return false;
      if (!text) return true;
      const haystack = [
        controller.name,
        deviceKey(controller),
        clientName(clients, controller.cliente),
      ].join(" ").toLowerCase();
      return haystack.includes(text);
    });
  }, [controllers, clients, query, clientFilter, statusFilter]);

  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));
  const visible = filtered.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);

  const removeController = async (controller: Controller) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Eliminar controlador",
      text: `Se va a eliminar ${controller.name || "este controlador"}.`,
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed || !controller._id) return;
    await remove(`/controllers/${controller._id}`);
    setControllers((prev) => prev.filter((item) => item._id !== controller._id));
  };

  return (
    <>
      <Helmet>
        <title>Controladores</title>
      </Helmet>

      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, width: "100%" }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-end" }, gap: 2, mb: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4">Controladores</Typography>
            <Typography variant="body2" color="text.secondary">
              Bombas de cruda y purificada por interruptor. Flush y cloro por las reglas.
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => navigate("/controladores/nuevo")} sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}>
            Nuevo
          </Button>
        </Box>

        <Box sx={{ display: "grid", gap: 2, mb: 2, gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(180px, 1fr)" } }}>
          <TextField
            label="Buscar"
            placeholder="Nombre, id o cliente"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="controller-filter-client" shrink>Cliente</InputLabel>
            <Select
              labelId="controller-filter-client"
              label="Cliente"
              notched
              displayEmpty
              value={clientFilter}
              onChange={(event) => {
                setClientFilter(String(event.target.value));
                setPage(0);
              }}
            >
              <MenuItem value="">Todos</MenuItem>
              {clients.map((client) => (
                <MenuItem key={clientId(client)} value={clientId(client)}>{client.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="controller-filter-status" shrink>Estado</InputLabel>
            <Select
              labelId="controller-filter-status"
              label="Estado"
              notched
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(String(event.target.value));
                setPage(0);
              }}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="online">En línea</MenuItem>
              <MenuItem value="offline">Fuera de línea</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <StyledTableContainer>
          <Paper elevation={3}>
            <Box sx={{ overflowX: "auto" }}>
              <Table sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f4f6f8" }}>
                    <StyledTableCellHeader>Nombre</StyledTableCellHeader>
                    <StyledTableCellHeader>Id</StyledTableCellHeader>
                    <StyledTableCellHeader>Cliente</StyledTableCellHeader>
                    <StyledTableCellHeader>Estado</StyledTableCellHeader>
                    {RELAY_LABELS.map((label) => (
                      <StyledTableCellHeader key={label}>{label}</StyledTableCellHeader>
                    ))}
                    <StyledTableCellHeader>Acciones</StyledTableCellHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <StyledTableCell colSpan={9}>
                        <Typography color="text.secondary">
                          {controllers.length === 0 ? "Todavía no hay controladores." : "Ningún controlador coincide con los filtros."}
                        </Typography>
                      </StyledTableCell>
                    </TableRow>
                  ) : visible.map((controller) => {
                    const flags = rulesFromController(controller.rules).relays.map((relay) => relay.enabled);
                    return (
                      <StyledTableRow
                        key={controller._id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(controllerPath(controller))}
                      >
                        <StyledTableCell>{controller.name || "Sin nombre"}</StyledTableCell>
                        <StyledTableCell sx={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{deviceKey(controller)}</StyledTableCell>
                        <StyledTableCell>{clientName(clients, controller.cliente)}</StyledTableCell>
                        <StyledTableCell>
                          <Chip
                            size="small"
                            label={controller.online ? "En línea" : "Fuera de línea"}
                            color={controller.online ? "success" : "default"}
                          />
                        </StyledTableCell>
                        {RELAY_LABELS.map((label, index) => (
                          <StyledTableCell key={label}>
                            <Chip
                              size="small"
                              variant={flags[index] ? "filled" : "outlined"}
                              color={flags[index] ? "primary" : "default"}
                              label={flags[index] ? "Activo" : "Apagado"}
                            />
                          </StyledTableCell>
                        ))}
                        <StyledTableCell>
                          <IconButton
                            aria-label="Editar"
                            sx={{ mr: 1, color: "primary.main" }}
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(controllerPath(controller));
                            }}
                          >
                            <SvgColor src="./assets/icons/actions/edit.svg" />
                          </IconButton>
                          <IconButton
                            aria-label="Eliminar"
                            sx={{ color: "error.main" }}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeController(controller);
                            }}
                          >
                            <SvgColor src="./assets/icons/actions/delete.svg" />
                          </IconButton>
                        </StyledTableCell>
                      </StyledTableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              component="div"
              count={filtered.length}
              page={safePage}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="Filas"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
          </Paper>
        </StyledTableContainer>
      </Box>
    </>
  );
}
