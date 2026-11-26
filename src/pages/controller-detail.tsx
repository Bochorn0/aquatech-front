import Swal from "sweetalert2";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Box,
  Stack,
  Button,
  Select,
  MenuItem,
  TextField,
  Typography,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@mui/material";

import { get, post, patch } from "src/api/axiosHelper";

import { defaultRules, rulesFromController, ControllerRulesFields, MarkedSection, validateControllerRules } from "./controller-rules-dialog";

import type { Cliente, Controller, Product } from "./types";

const emptyController: Controller = {
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
  time_zone: "-07:00",
};

function clientId(client: Cliente) {
  return client._id || client.id || "";
}

function clientName(clients: Cliente[], id?: string) {
  if (!id) return "Sin cliente";
  return clients.find((client) => clientId(client) === id)?.name || "Sin cliente";
}

function productKey(product: Product) {
  return String(product._id || "");
}

function productLabel(product: Product) {
  const device = String(product.device_id || product.id || "").trim();
  return device ? `${product.name} · ${device}` : product.name;
}

function sketchDeviceId(controller: Controller) {
  const device = String(controller.device_id || "").trim();
  if (device) return device;
  const id = String(controller.id || "").trim();
  if (id && id !== String(controller._id || "")) return id;
  return "";
}

export default function ControllerDetailPage() {
  const navigate = useNavigate();
  const { deviceId = "" } = useParams();
  const isNew = deviceId === "nuevo";
  const [clients, setClients] = useState<Cliente[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsNote, setProductsNote] = useState("Cargando productos…");
  const [form, setForm] = useState<Controller>(emptyController);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    get<Cliente[]>(`/clients`).then(setClients).catch((error) => console.error("Error fetching clients:", error));
    get<Product[]>(`/products`)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setProducts([...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es")));
        setProductsNote(list.length ? "" : "No hay productos.");
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        setProductsNote("No se pudieron cargar los productos.");
      });
  }, []);

  useEffect(() => {
    if (isNew) {
      setForm({ ...emptyController, rules: defaultRules() });
      setMissing(false);
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    setReady(false);
    setMissing(false);
    get<Controller>(`/controllers/${encodeURIComponent(deviceId)}`)
      .then((controller) => {
        if (cancelled) return;
        setForm({ ...controller, rules: rulesFromController(controller.rules) });
        setReady(true);
      })
      .catch((error) => {
        console.error("Error fetching controller:", error);
        if (cancelled) return;
        setMissing(true);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId, isNew]);

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      Swal.fire({ icon: "warning", title: "Falta el nombre", text: "El controlador necesita un nombre." });
      return;
    }
    const rules = rulesFromController(form.rules);
    const message = validateControllerRules(rules);
    if (message) {
      Swal.fire({ icon: "warning", title: "Revisa la regla", text: message });
      return;
    }

    setLoading(true);
    const linked = products.find((product) => productKey(product) === String(form.product || ""));
    const payload = {
      name,
      cliente: form.cliente || null,
      time_zone: form.time_zone || "-07:00",
      product: form.product || null,
      product_name: linked?.name || (form.product ? form.product_name || null : null),
      product_device_id: linked ? String(linked.device_id || linked.id || "") || null : (form.product ? form.product_device_id || null : null),
      rules,
    };
    try {
      if (form._id) {
        const updated = await patch<Controller>(`/controllers/${encodeURIComponent(deviceId)}`, payload);
        setForm({ ...form, ...updated, rules: rulesFromController(updated.rules) });
      } else {
        const created = await post<Controller>(`/controllers`, payload);
        const key = sketchDeviceId(created) || created._id;
        navigate(`/controladores/${encodeURIComponent(key)}`, { replace: true });
      }
    } catch (error) {
      console.error("Error guardando controlador:", error);
    } finally {
      setLoading(false);
    }
  };

  const title = isNew ? "Nuevo controlador" : (form.name.trim() || deviceId);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, width: "100%" }}>
        <Box
          sx={{
            position: "sticky",
            top: { xs: "var(--layout-header-mobile-height)", lg: "var(--layout-header-desktop-height)" },
            zIndex: 4,
            mb: 2,
            py: 1.25,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
            bgcolor: "background.default",
          }}
        >
          <Button onClick={() => navigate("/controladores")} color="secondary">
            Volver a controladores
          </Button>
          <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">
              {isNew ? "Nuevo" : "Detalle"}
            </Typography>
            <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>{title}</Typography>
            {!isNew && ready && !missing ? (
              <Typography variant="body2" color="text.secondary">{clientName(clients, form.cliente)}</Typography>
            ) : null}
          </Box>
          {!missing && (
            <Button onClick={save} variant="contained" disabled={loading || !ready} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : "Guardar"}
            </Button>
          )}
        </Box>

        {!ready ? (
          <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : missing ? (
          <Box sx={{ p: 4, borderRadius: 2, bgcolor: "background.paper", border: "1px dashed", borderColor: "divider" }}>
            <Typography>No hay un controlador con el id {deviceId}.</Typography>
          </Box>
        ) : (
          <>
            <Stack spacing={2}>
              <MarkedSection mark="1" color="#1877F2" title="Información del controlador" subtitle="Nombre, cliente y el producto donde se guardan las métricas.">
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr", "@container (min-width: 640px)": { gridTemplateColumns: "1fr 1fr" } }}>
                  <TextField
                    label="Nombre"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    fullWidth
                    sx={{ gridColumn: "1 / -1" }}
                  />
                  <Box sx={{ gridColumn: "1 / -1" }}>
                    <Typography variant="caption" color="text.secondary">Id del sistema</Typography>
                    <Typography sx={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", overflowWrap: "anywhere" }}>
                      {sketchDeviceId(form) || "Se asigna al guardar"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Cópialo en NET_DEVICE_ID del sketch. También es la dirección de esta página.</Typography>
                  </Box>
                  <FormControl fullWidth>
                    <InputLabel id="controller-client" shrink>Cliente</InputLabel>
                    <Select
                      labelId="controller-client"
                      label="Cliente"
                      notched
                      displayEmpty
                      value={form.cliente || ""}
                      onChange={(event) => setForm((prev) => ({ ...prev, cliente: String(event.target.value) }))}
                    >
                      <MenuItem value="">Sin cliente</MenuItem>
                      {clients.map((client) => (
                        <MenuItem key={clientId(client)} value={clientId(client)}>{client.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel id="controller-product" shrink>Producto</InputLabel>
                    <Select
                      labelId="controller-product"
                      label="Producto"
                      notched
                      displayEmpty
                      value={form.product ? String(form.product) : ""}
                      onChange={(event) => {
                        const nextId = String(event.target.value);
                        const linked = products.find((product) => productKey(product) === nextId);
                        setForm((prev) => ({
                          ...prev,
                          product: nextId,
                          product_name: linked?.name || "",
                          product_device_id: linked ? String(linked.device_id || linked.id || "") : "",
                        }));
                      }}
                    >
                      <MenuItem value="">Sin producto</MenuItem>
                      {form.product && !products.some((product) => productKey(product) === String(form.product)) ? (
                        <MenuItem value={String(form.product)}>{form.product_name || `Producto ${form.product}`}</MenuItem>
                      ) : null}
                      {products.filter((product) => productKey(product)).map((product) => (
                        <MenuItem key={productKey(product)} value={productKey(product)}>{productLabel(product)}</MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
                      {productsNote || (form.product
                        ? "Producción y rechazo de este controlador se guardan en los logs de este producto."
                        : "Sin producto, las métricas de la corrida no tienen dónde guardarse.")}
                    </Typography>
                  </FormControl>
                  <TextField
                    select
                    label="Zona horaria"
                    value={form.time_zone || "-07:00"}
                    onChange={(event) => setForm((prev) => ({ ...prev, time_zone: event.target.value }))}
                    fullWidth
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiNativeSelect-select": { paddingTop: "16px", paddingBottom: "8px" } }}
                  >
                    <option value="-08:00">-08:00 Pacífico norte</option>
                    <option value="-07:00">-07:00 Hermosillo / Pacífico</option>
                    <option value="-06:00">-06:00 Centro</option>
                    <option value="-05:00">-05:00 Este</option>
                  </TextField>
                  <TextField
                    label="Descripción"
                    value={rulesFromController(form.rules).description || ""}
                    onChange={(event) => {
                      const description = event.target.value.slice(0, 280);
                      setForm((prev) => ({ ...prev, rules: { ...rulesFromController(prev.rules), description } }));
                    }}
                    fullWidth
                    multiline
                    minRows={2}
                    sx={{ gridColumn: "1 / -1" }}
                  />
                </Box>
              </MarkedSection>

              <ControllerRulesFields
                rules={rulesFromController(form.rules)}
                onChange={(rules) => setForm((prev) => ({ ...prev, rules }))}
                active={ready}
              />
            </Stack>

            <Box
              sx={{
                display: { xs: "block", sm: "none" },
                position: "sticky",
                bottom: 0,
                zIndex: 4,
                mt: 2,
                py: 1.5,
                bgcolor: "background.default",
                borderTop: "1px solid",
                borderColor: "divider",
                pb: "calc(12px + env(safe-area-inset-bottom))",
              }}
            >
              <Button fullWidth size="large" onClick={save} variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={22} color="inherit" /> : "Guardar"}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </>
  );
}
