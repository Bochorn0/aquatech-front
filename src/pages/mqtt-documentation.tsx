import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import {
  Box,
  Chip,
  Link,
  List,
  Stack,
  Table,
  Button,
  Divider,
  ListItem,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  ListItemButton,
  ListItemText,
  InputAdornment,
} from '@mui/material';

import { CONFIG } from 'src/config-global';
import axiosInstance from 'src/api/axiosInstance';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const MQTT_DOC_HOST =
  (import.meta.env?.VITE_MQTT_PUBLIC_HOSTNAME as string | undefined) ||
  'tiwatermqtt.eastus-1.ts.eventgrid.azure.net';

const MQTT_EXAMPLE_CLIENT_AUTH = 'lcc-mqtt-mocker';

const API_BASE_V1 = CONFIG.API_BASE_URL.replace(/\/$/, '');
const API_BASE_V2 = CONFIG.API_BASE_URL_V2.replace(/\/$/, '');

type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';
type ApiVersion = 'v1' | 'v2';

type ParamRow = {
  name: string;
  in: 'header' | 'path' | 'query' | 'body';
  required?: boolean;
  type: string;
  description: string;
};

type ResponseRow = {
  code: string;
  description: string;
  sample?: string;
};

type Operation = {
  id: string;
  tag: string;
  version: ApiVersion;
  method: HttpMethod;
  path: string;
  title: string;
  summary: string;
  params?: ParamRow[];
  bodySchema?: string;
  responses: ResponseRow[];
  requestSample?: string;
};

type GuideSection = {
  id: string;
  tag: string;
  title: string;
  kind: 'guide';
};

type NavItem = Operation | GuideSection;

function isGuide(item: NavItem): item is GuideSection {
  return (item as GuideSection).kind === 'guide';
}

const METHOD_COLOR: Record<HttpMethod, string> = {
  get: '#2aa876',
  post: '#186faf',
  patch: '#d4a017',
  put: '#d4a017',
  delete: '#c0392b',
};

const AUTH_HEADER: ParamRow = {
  name: 'Authorization',
  in: 'header',
  required: true,
  type: 'string',
  description: 'Bearer {token} — credencial de integración emitida por Aquatech / LCC',
};

const OPERATIONS: Operation[] = [
  // —— API v1.0 · Equipos (/products) — lectura + ingreso de lecturas (sin admin)
  {
    id: 'products-list',
    tag: 'v1 · /products',
    version: 'v1',
    method: 'get',
    path: '/products',
    title: 'Listado de equipos',
    summary:
      'Listado de equipos (productos / dispositivos) asociados a tu cuenta. Requiere token válido y permiso de equipos.',
    params: [AUTH_HEADER],
    responses: [
      {
        code: '200',
        description: 'Listado de equipos generado correctamente.',
        sample: JSON.stringify(
          [
            {
              id: 12,
              device_id: 'bfxxxxxxxx',
              name: 'Osmosis Tienda 001',
              product_type: 'Osmosis',
              online: true,
              city: 'Hermosillo',
              state: 'Sonora',
              status: [
                { code: 'flujo_prod', value: 12.5 },
                { code: 'tds', value: 45 },
              ],
            },
          ],
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '403', description: 'Sin permiso para /equipos.' },
      { code: '429', description: 'Demasiadas solicitudes.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'products-detail',
    tag: 'v1 · /products',
    version: 'v1',
    method: 'get',
    path: '/products/{id}',
    title: 'Detalle de equipo',
    summary:
      'Consulta el detalle y estado en vivo de un equipo por id interno o device_id (p. ej. Tuya). Requiere token válido.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id interno o device_id del equipo' },
    ],
    responses: [
      {
        code: '200',
        description: 'Detalle del equipo.',
        sample: JSON.stringify(
          {
            id: 12,
            device_id: 'bfxxxxxxxx',
            name: 'Osmosis Tienda 001',
            product_type: 'Osmosis',
            online: true,
            status: [
              { code: 'flujo_prod', value: 12.5 },
              { code: 'flujo_rech', value: 3.2 },
              { code: 'tds', value: 45 },
            ],
            last_time_active: 1730000000,
          },
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Equipo no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'products-logs',
    tag: 'v1 · /products',
    version: 'v1',
    method: 'get',
    path: '/products/{id}/logs',
    title: 'Logs del equipo',
    summary:
      'Histórico de lecturas / reportes del equipo (origen Tuya o base de datos según configuración). Requiere token válido.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id o device_id del equipo' },
      { name: 'start_date', in: 'query', type: 'string', description: 'Inicio (epoch ms o ISO), opcional' },
      { name: 'end_date', in: 'query', type: 'string', description: 'Fin (epoch ms o ISO), opcional' },
    ],
    responses: [
      {
        code: '200',
        description: 'Logs obtenidos correctamente.',
        sample: JSON.stringify(
          {
            logs: [
              { date: '2026-07-30T18:00:00.000Z', source: 'tuya', flujo_prod: 10.2, tds: 48 },
              { date: '2026-07-30T19:00:00.000Z', source: 'database', flujo_prod: 11.1, tds: 46 },
            ],
          },
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Equipo no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'products-historico',
    tag: 'v1 · /products',
    version: 'v1',
    method: 'get',
    path: '/products/{id}/logs/historico',
    title: 'Histórico agregado',
    summary:
      'Histórico de totales / TDS (requiere rutina de logs habilitada en el equipo). Requiere token válido.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id o device_id del equipo' },
      {
        name: 'refresh_tuya',
        in: 'query',
        type: 'string',
        description: 'Si es 1, descarga logs frescos desde Tuya antes de leer la BD',
      },
    ],
    responses: [
      {
        code: '200',
        description: 'Histórico generado correctamente.',
        sample: JSON.stringify(
          {
            days: [{ date: '2026-07-30', total_produccion: 1250.5, tds_avg: 47 }],
            refresh_tuya_performed: false,
          },
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Equipo no encontrado o rutina no habilitada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'products-metrics',
    tag: 'v1 · /products',
    version: 'v1',
    method: 'get',
    path: '/products/{id}/metrics',
    title: 'Métricas del equipo',
    summary: 'Métricas derivadas del equipo. Requiere token válido.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id o device_id del equipo' },
    ],
    responses: [
      {
        code: '200',
        description: 'Métricas obtenidas correctamente.',
        sample: JSON.stringify({ product_id: 12, metrics: [{ code: 'eficiencia', value: 58.5 }] }, null, 2),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Equipo no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'products-component-input',
    tag: 'v1 · /products',
    version: 'v1',
    method: 'post',
    path: '/products/componentInput',
    title: 'Ingreso de lecturas (HTTP)',
    summary:
      'Reporta lecturas de presión, nivel, flujo o TDS asociadas a un productId. Para telemetría continua de tienda preferir MQTT (ver Guía de conexión).',
    params: [
      AUTH_HEADER,
      { name: 'productId', in: 'body', required: true, type: 'string', description: 'Id o device_id del equipo' },
      { name: 'presion_in', in: 'body', type: 'number', description: 'Presión entrada (PSI/bar)' },
      { name: 'presion_out', in: 'body', type: 'number', description: 'Presión salida' },
      { name: 'flujo_prod', in: 'body', type: 'number', description: 'Flujo producción L/min' },
      { name: 'flujo_rech', in: 'body', type: 'number', description: 'Flujo rechazo L/min' },
      { name: 'tds', in: 'body', type: 'number', description: 'TDS ppm' },
      { name: 'liquid_level_percent', in: 'body', type: 'number', description: 'Nivel %' },
      { name: 'timestamp', in: 'body', type: 'number', description: 'Unix timestamp (opcional)' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify(
      {
        productId: 'bfxxxxxxxx',
        flujo_prod: 12.5,
        flujo_rech: 3.1,
        tds: 45,
        timestamp: 1730000000,
      },
      null,
      2
    ),
    responses: [
      {
        code: '200',
        description: 'Lectura registrada correctamente.',
        sample: JSON.stringify({ success: true, message: 'Updated' }, null, 2),
      },
      { code: '400', description: 'Datos incompletos (falta productId).' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Producto no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  // —— API v2.0 · Sensores / puntos de venta
  {
    id: 'v2-pv-all',
    tag: 'v2 · /puntoVentas',
    version: 'v2',
    method: 'get',
    path: '/puntoVentas/all',
    title: 'Listado de puntos de venta',
    summary:
      'Lista puntos de venta V2 (PostgreSQL) con origen mqtt / tuya / hybrid. Requiere token y permiso de dashboard o punto de venta.',
    params: [AUTH_HEADER],
    responses: [
      {
        code: '200',
        description: 'Listado generado correctamente.',
        sample: JSON.stringify(
          [
            {
              id: 101,
              name: 'Tienda Centro',
              codigo_tienda: 'TIENDA_001',
              source_type: 'mqtt',
              online: true,
            },
          ],
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '403', description: 'Sin permiso.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-pv-detail',
    tag: 'v2 · /puntoVentas',
    version: 'v2',
    method: 'get',
    path: '/puntoVentas/{id}',
    title: 'Detalle de punto de venta',
    summary:
      'Detalle del punto de venta con sensores / osmosis (MQTT y/o Tuya según source_type). El id puede ser numérico o codigo_tienda.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id numérico o codigo_tienda' },
    ],
    responses: [
      {
        code: '200',
        description: 'Detalle obtenido correctamente.',
        sample: JSON.stringify(
          {
            id: 101,
            codigo_tienda: 'TIENDA_001',
            source_type: 'hybrid',
            online: true,
            sensores: [{ name: 'TDS', value: 45, unit: 'ppm' }],
          },
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Punto de venta no encontrado.' },
      { code: '503', description: 'Servicio temporalmente ocupado. Reintente.' },
    ],
  },
  {
    id: 'v2-pv-historico',
    tag: 'v2 · /puntoVentas',
    version: 'v2',
    method: 'get',
    path: '/puntoVentas/{id}/historico',
    title: 'Histórico de niveles',
    summary: 'Histórico de niveles (purificada, cruda, recuperada) para gráficas del punto de venta.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id o codigo_tienda' },
      {
        name: 'type',
        in: 'query',
        type: 'string',
        description: 'purificada | cruda | recuperada',
      },
      { name: 'resourceId', in: 'query', type: 'string', description: 'p. ej. tiwater-system' },
    ],
    responses: [
      {
        code: '200',
        description: 'Serie histórica generada.',
        sample: JSON.stringify(
          { points: [{ t: '2026-07-30T12:00:00Z', value: 62.5 }] },
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Punto de venta no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-sensors-latest',
    tag: 'v2 · /sensors',
    version: 'v2',
    method: 'get',
    path: '/sensors/latest',
    title: 'Últimas lecturas por sensor',
    summary: 'Valor más reciente por sensor desde sensor_latest (sin escanear time-series).',
    params: [
      AUTH_HEADER,
      {
        name: 'codigo_tienda',
        in: 'query',
        required: true,
        type: 'string',
        description: 'Código de tienda o lista separada por comas',
      },
    ],
    responses: [
      {
        code: '200',
        description: 'Lecturas obtenidas.',
        sample: JSON.stringify(
          {
            TIENDA_001: {
              TDS: { value: 45, timestamp: 1730000000 },
              'CAUDAL PURIFICADA': { value: 1.2, timestamp: 1730000000 },
            },
          },
          null,
          2
        ),
      },
      { code: '400', description: 'Falta codigo_tienda.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-sensors-timeseries',
    tag: 'v2 · /sensors',
    version: 'v2',
    method: 'get',
    path: '/sensors/timeseries',
    title: 'Serie temporal de sensores',
    summary: 'Serie temporal para gráficas (caudal, nivel, TDS, etc.).',
    params: [
      AUTH_HEADER,
      { name: 'codigoTienda', in: 'query', required: true, type: 'string', description: 'Código de tienda' },
      { name: 'sensorName', in: 'query', type: 'string', description: 'Nombre del sensor' },
      { name: 'startDate', in: 'query', type: 'string', description: 'Inicio ISO' },
      { name: 'endDate', in: 'query', type: 'string', description: 'Fin ISO' },
      { name: 'interval', in: 'query', type: 'string', description: 'Agregación opcional' },
    ],
    responses: [
      {
        code: '200',
        description: 'Serie generada correctamente.',
        sample: JSON.stringify(
          { series: [{ t: '2026-07-30T12:00:00Z', value: 12.5 }] },
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-sensors-tiwater',
    tag: 'v2 · /sensors',
    version: 'v2',
    method: 'get',
    path: '/sensors/tiwater',
    title: 'Datos TI Water del punto',
    summary: 'Últimos datos tiwater agregados para un punto de venta (telemetría MQTT).',
    params: [
      AUTH_HEADER,
      { name: 'codigoTienda', in: 'query', required: true, type: 'string', description: 'Código de tienda' },
    ],
    responses: [
      {
        code: '200',
        description: 'Datos obtenidos.',
        sample: JSON.stringify(
          {
            codigo_tienda: 'TIENDA_001',
            flujo_produccion: 1.2,
            tds: 45,
            timestamp: 1730000000,
          },
          null,
          2
        ),
      },
      { code: '400', description: 'Falta codigoTienda.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-sensors-osmosis',
    tag: 'v2 · /sensors',
    version: 'v2',
    method: 'get',
    path: '/sensors/osmosis',
    title: 'Sistema de ósmosis por tienda',
    summary: 'Datos del sistema de ósmosis asociados al punto de venta.',
    params: [
      AUTH_HEADER,
      { name: 'codigoTienda', in: 'query', required: true, type: 'string', description: 'Código de tienda' },
      { name: 'resourceId', in: 'query', type: 'string', description: 'Recurso opcional' },
    ],
    responses: [
      {
        code: '200',
        description: 'Datos de ósmosis.',
        sample: JSON.stringify(
          { codigoTienda: 'TIENDA_001', sistemas: [{ name: 'Osmosis 1', online: true }] },
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  // —— API v2.0 · Personalización (métricas, PV, sensores, catálogos)
  {
    id: 'v2-metrics-list',
    tag: 'v2 · /metrics',
    version: 'v2',
    method: 'get',
    path: '/metrics',
    title: 'Listado de métricas',
    summary: 'Lista métricas configuradas (umbrales / reglas de monitoreo) en personalización V2.',
    params: [AUTH_HEADER],
    responses: [
      {
        code: '200',
        description: 'Listado de métricas.',
        sample: JSON.stringify(
          [{ id: 1, name: 'Nivel bajo cruda', code: 'nivel_cruda', threshold: 20 }],
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-metrics-get',
    tag: 'v2 · /metrics',
    version: 'v2',
    method: 'get',
    path: '/metrics/{id}',
    title: 'Detalle de métrica',
    summary: 'Obtiene una métrica por id.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la métrica' },
    ],
    responses: [
      {
        code: '200',
        description: 'Métrica encontrada.',
        sample: JSON.stringify(
          { id: 1, name: 'Nivel bajo cruda', code: 'nivel_cruda', threshold: 20, enabled: true },
          null,
          2
        ),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Métrica no encontrada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-metrics-create',
    tag: 'v2 · /metrics',
    version: 'v2',
    method: 'post',
    path: '/metrics',
    title: 'Crear métrica',
    summary: 'Crea una métrica / regla de monitoreo.',
    params: [
      AUTH_HEADER,
      { name: 'name', in: 'body', required: true, type: 'string', description: 'Nombre de la métrica' },
      { name: 'code', in: 'body', required: true, type: 'string', description: 'Código del sensor / campo' },
      { name: 'threshold', in: 'body', type: 'number', description: 'Umbral (según tipo de regla)' },
      { name: 'punto_venta_id', in: 'body', type: 'string', description: 'PV asociado (si aplica)' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify(
      { name: 'Nivel bajo cruda', code: 'nivel_cruda', threshold: 20, enabled: true },
      null,
      2
    ),
    responses: [
      {
        code: '200',
        description: 'Métrica creada.',
        sample: JSON.stringify({ id: 1, name: 'Nivel bajo cruda', code: 'nivel_cruda' }, null, 2),
      },
      { code: '400', description: 'Datos inválidos.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-metrics-update',
    tag: 'v2 · /metrics',
    version: 'v2',
    method: 'patch',
    path: '/metrics/{id}',
    title: 'Actualizar métrica',
    summary: 'Actualiza una métrica existente.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la métrica' },
      { name: 'name', in: 'body', type: 'string', description: 'Nombre' },
      { name: 'threshold', in: 'body', type: 'number', description: 'Umbral' },
      { name: 'enabled', in: 'body', type: 'boolean', description: 'Activa / inactiva' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ threshold: 15, enabled: true }, null, 2),
    responses: [
      { code: '200', description: 'Métrica actualizada.', sample: JSON.stringify({ id: 1, threshold: 15 }, null, 2) },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Métrica no encontrada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-metrics-delete',
    tag: 'v2 · /metrics',
    version: 'v2',
    method: 'delete',
    path: '/metrics/{id}',
    title: 'Eliminar métrica',
    summary: 'Elimina una métrica.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la métrica' },
    ],
    responses: [
      { code: '200', description: 'Métrica eliminada.', sample: JSON.stringify({ success: true }, null, 2) },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Métrica no encontrada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-metrics-alerts-list',
    tag: 'v2 · /metrics/.../alerts',
    version: 'v2',
    method: 'get',
    path: '/metrics/{id}/alerts',
    title: 'Alertas de una métrica',
    summary: 'Lista alertas configuradas para una métrica.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la métrica' },
    ],
    responses: [
      {
        code: '200',
        description: 'Alertas de la métrica.',
        sample: JSON.stringify([{ id: 10, type: 'email', destination: 'ops@empresa.com' }], null, 2),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-metrics-alerts-create',
    tag: 'v2 · /metrics/.../alerts',
    version: 'v2',
    method: 'post',
    path: '/metrics/{id}/alerts',
    title: 'Agregar alerta a métrica',
    summary: 'Crea una alerta asociada a la métrica.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la métrica' },
      { name: 'type', in: 'body', required: true, type: 'string', description: 'Tipo de alerta' },
      { name: 'destination', in: 'body', type: 'string', description: 'Destino (si aplica)' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ type: 'threshold', operator: 'lt', value: 20 }, null, 2),
    responses: [
      { code: '200', description: 'Alerta creada.', sample: JSON.stringify({ id: 10 }, null, 2) },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-metrics-alerts-update',
    tag: 'v2 · /metrics/.../alerts',
    version: 'v2',
    method: 'patch',
    path: '/metrics/{id}/alerts/{alertId}',
    title: 'Actualizar alerta de métrica',
    summary: 'Actualiza una alerta de la métrica.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la métrica' },
      { name: 'alertId', in: 'path', required: true, type: 'string', description: 'Id de la alerta' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ value: 15, enabled: true }, null, 2),
    responses: [
      { code: '200', description: 'Alerta actualizada.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Alerta no encontrada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-metrics-alerts-delete',
    tag: 'v2 · /metrics/.../alerts',
    version: 'v2',
    method: 'delete',
    path: '/metrics/{id}/alerts/{alertId}',
    title: 'Eliminar alerta de métrica',
    summary: 'Elimina una alerta de la métrica.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la métrica' },
      { name: 'alertId', in: 'path', required: true, type: 'string', description: 'Id de la alerta' },
    ],
    responses: [
      { code: '200', description: 'Alerta eliminada.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Alerta no encontrada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-pv-create',
    tag: 'v2 · /puntoVentas',
    version: 'v2',
    method: 'post',
    path: '/puntoVentas',
    title: 'Crear punto de venta',
    summary:
      'Crea un punto de venta V2 (código de tienda, cliente, ciudad, source_type mqtt|tuya|hybrid).',
    params: [
      AUTH_HEADER,
      { name: 'name', in: 'body', required: true, type: 'string', description: 'Nombre del PV' },
      { name: 'codigo_tienda', in: 'body', required: true, type: 'string', description: 'Código MQTT / tienda' },
      { name: 'source_type', in: 'body', type: 'string', description: 'mqtt | tuya | hybrid' },
      { name: 'cliente', in: 'body', type: 'string', description: 'Id o referencia de cliente' },
      { name: 'lat', in: 'body', type: 'number', description: 'Latitud' },
      { name: 'long', in: 'body', type: 'number', description: 'Longitud' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify(
      {
        name: 'Tienda Centro',
        codigo_tienda: 'TIENDA_001',
        source_type: 'mqtt',
        city: 'Hermosillo',
      },
      null,
      2
    ),
    responses: [
      {
        code: '200',
        description: 'Punto de venta creado.',
        sample: JSON.stringify({ id: 101, codigo_tienda: 'TIENDA_001' }, null, 2),
      },
      { code: '400', description: 'Datos inválidos.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-pv-update',
    tag: 'v2 · /puntoVentas',
    version: 'v2',
    method: 'patch',
    path: '/puntoVentas/{id}',
    title: 'Actualizar punto de venta',
    summary: 'Actualiza datos del punto de venta (nombre, source_type, ubicación, productos Tuya, etc.).',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del PV' },
      { name: 'name', in: 'body', type: 'string', description: 'Nombre' },
      { name: 'source_type', in: 'body', type: 'string', description: 'mqtt | tuya | hybrid' },
      { name: 'productos', in: 'body', type: 'array', description: 'Ids de productos Tuya (hybrid/tuya)' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ name: 'Tienda Centro Norte', source_type: 'hybrid' }, null, 2),
    responses: [
      { code: '200', description: 'Punto de venta actualizado.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Punto de venta no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-pv-delete',
    tag: 'v2 · /puntoVentas',
    version: 'v2',
    method: 'delete',
    path: '/puntoVentas/{id}',
    title: 'Eliminar punto de venta',
    summary: 'Elimina un punto de venta V2.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del PV' },
    ],
    responses: [
      { code: '200', description: 'Punto de venta eliminado.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Punto de venta no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-pv-sensors-list',
    tag: 'v2 · /puntoVentas/.../sensors',
    version: 'v2',
    method: 'get',
    path: '/puntoVentas/{id}/sensors',
    title: 'Sensores configurados del PV',
    summary: 'Lista la configuración de sensores del punto de venta.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del PV' },
    ],
    responses: [
      {
        code: '200',
        description: 'Sensores del PV.',
        sample: JSON.stringify([{ id: 5, name: 'TDS', unit: 'ppm', enabled: true }], null, 2),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Punto de venta no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-pv-sensors-readings',
    tag: 'v2 · /puntoVentas/.../sensors',
    version: 'v2',
    method: 'get',
    path: '/puntoVentas/{id}/sensors/readings',
    title: 'Lecturas históricas de sensores',
    summary: 'Histórico de lecturas de sensores del PV (rango de fechas).',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del PV' },
      { name: 'startDate', in: 'query', type: 'string', description: 'Inicio ISO' },
      { name: 'endDate', in: 'query', type: 'string', description: 'Fin ISO' },
    ],
    responses: [
      {
        code: '200',
        description: 'Lecturas obtenidas.',
        sample: JSON.stringify({ readings: [{ sensor: 'TDS', value: 45, t: '2026-07-30T12:00:00Z' }] }, null, 2),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-pv-sensors-add',
    tag: 'v2 · /puntoVentas/.../sensors',
    version: 'v2',
    method: 'post',
    path: '/puntoVentas/{id}/sensors',
    title: 'Agregar sensor al PV',
    summary: 'Agrega configuración de sensor a un punto de venta.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del PV' },
      { name: 'name', in: 'body', required: true, type: 'string', description: 'Nombre del sensor' },
      { name: 'unit', in: 'body', type: 'string', description: 'Unidad' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ name: 'TDS', unit: 'ppm', enabled: true }, null, 2),
    responses: [
      { code: '200', description: 'Sensor agregado.', sample: JSON.stringify({ id: 5, name: 'TDS' }, null, 2) },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-pv-sensors-update',
    tag: 'v2 · /puntoVentas/.../sensors',
    version: 'v2',
    method: 'patch',
    path: '/puntoVentas/{id}/sensors/{sensorId}',
    title: 'Actualizar sensor del PV',
    summary: 'Actualiza la configuración de un sensor.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del PV' },
      { name: 'sensorId', in: 'path', required: true, type: 'string', description: 'Id del sensor' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ enabled: false, unit: 'ppm' }, null, 2),
    responses: [
      { code: '200', description: 'Sensor actualizado.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Sensor no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-pv-sensors-delete',
    tag: 'v2 · /puntoVentas/.../sensors',
    version: 'v2',
    method: 'delete',
    path: '/puntoVentas/{id}/sensors/{sensorId}',
    title: 'Eliminar sensor del PV',
    summary: 'Elimina la configuración de un sensor del PV.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del PV' },
      { name: 'sensorId', in: 'path', required: true, type: 'string', description: 'Id del sensor' },
    ],
    responses: [
      { code: '200', description: 'Sensor eliminado.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Sensor no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-clients-list',
    tag: 'v2 · /clients',
    version: 'v2',
    method: 'get',
    path: '/clients',
    title: 'Listado de clientes',
    summary: 'Lista clientes (catálogo V2 para personalización).',
    params: [AUTH_HEADER],
    responses: [
      {
        code: '200',
        description: 'Clientes.',
        sample: JSON.stringify([{ id: 1, name: 'FEMSA OXXO' }], null, 2),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-clients-create',
    tag: 'v2 · /clients',
    version: 'v2',
    method: 'post',
    path: '/clients',
    title: 'Crear cliente',
    summary: 'Crea un cliente en el catálogo V2.',
    params: [
      AUTH_HEADER,
      { name: 'name', in: 'body', required: true, type: 'string', description: 'Nombre del cliente' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ name: 'FEMSA OXXO' }, null, 2),
    responses: [
      { code: '200', description: 'Cliente creado.', sample: JSON.stringify({ id: 1, name: 'FEMSA OXXO' }, null, 2) },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-clients-update',
    tag: 'v2 · /clients',
    version: 'v2',
    method: 'patch',
    path: '/clients/{id}',
    title: 'Actualizar cliente',
    summary: 'Actualiza un cliente.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del cliente' },
      { name: 'name', in: 'body', type: 'string', description: 'Nombre' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ name: 'FEMSA OXXO MX' }, null, 2),
    responses: [
      { code: '200', description: 'Cliente actualizado.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Cliente no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-clients-delete',
    tag: 'v2 · /clients',
    version: 'v2',
    method: 'delete',
    path: '/clients/{id}',
    title: 'Eliminar cliente',
    summary: 'Elimina un cliente del catálogo V2.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del cliente' },
    ],
    responses: [
      { code: '200', description: 'Cliente eliminado.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Cliente no encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-cities-list',
    tag: 'v2 · /cities',
    version: 'v2',
    method: 'get',
    path: '/cities',
    title: 'Listado de ciudades',
    summary: 'Lista ciudades del catálogo V2.',
    params: [AUTH_HEADER],
    responses: [
      {
        code: '200',
        description: 'Ciudades.',
        sample: JSON.stringify([{ id: 1, name: 'Hermosillo', state: 'Sonora' }], null, 2),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-cities-create',
    tag: 'v2 · /cities',
    version: 'v2',
    method: 'post',
    path: '/cities',
    title: 'Crear ciudad',
    summary: 'Crea una ciudad en el catálogo V2.',
    params: [
      AUTH_HEADER,
      { name: 'name', in: 'body', required: true, type: 'string', description: 'Nombre' },
      { name: 'state', in: 'body', type: 'string', description: 'Estado' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ name: 'Hermosillo', state: 'Sonora' }, null, 2),
    responses: [
      { code: '200', description: 'Ciudad creada.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-cities-update',
    tag: 'v2 · /cities',
    version: 'v2',
    method: 'patch',
    path: '/cities/{id}',
    title: 'Actualizar ciudad',
    summary: 'Actualiza una ciudad.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la ciudad' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ name: 'Hermosillo', state: 'Sonora' }, null, 2),
    responses: [
      { code: '200', description: 'Ciudad actualizada.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Ciudad no encontrada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-cities-delete',
    tag: 'v2 · /cities',
    version: 'v2',
    method: 'delete',
    path: '/cities/{id}',
    title: 'Eliminar ciudad',
    summary: 'Elimina una ciudad del catálogo V2.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la ciudad' },
    ],
    responses: [
      { code: '200', description: 'Ciudad eliminada.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'Ciudad no encontrada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-region-metrics-list',
    tag: 'v2 · /region-metrics',
    version: 'v2',
    method: 'get',
    path: '/region-metrics',
    title: 'Métricas regionales',
    summary: 'Lista métricas a nivel región.',
    params: [AUTH_HEADER],
    responses: [
      {
        code: '200',
        description: 'Métricas regionales.',
        sample: JSON.stringify([{ id: 1, region: 'Noroeste', code: 'eficiencia' }], null, 2),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-region-metrics-create',
    tag: 'v2 · /region-metrics',
    version: 'v2',
    method: 'post',
    path: '/region-metrics',
    title: 'Crear métrica regional',
    summary: 'Crea una métrica asociada a una región.',
    params: [AUTH_HEADER],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ region_id: 1, code: 'eficiencia', threshold: 50 }, null, 2),
    responses: [
      { code: '200', description: 'Métrica regional creada.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-region-metrics-update',
    tag: 'v2 · /region-metrics',
    version: 'v2',
    method: 'patch',
    path: '/region-metrics/{id}',
    title: 'Actualizar métrica regional',
    summary: 'Actualiza una métrica regional.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la métrica regional' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ threshold: 55 }, null, 2),
    responses: [
      { code: '200', description: 'Métrica regional actualizada.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'No encontrada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-region-metrics-delete',
    tag: 'v2 · /region-metrics',
    version: 'v2',
    method: 'delete',
    path: '/region-metrics/{id}',
    title: 'Eliminar métrica regional',
    summary: 'Elimina una métrica regional.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id de la métrica regional' },
    ],
    responses: [
      { code: '200', description: 'Métrica regional eliminada.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'No encontrada.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-calidad-list',
    tag: 'v2 · /calidad-agua',
    version: 'v2',
    method: 'get',
    path: '/calidad-agua',
    title: 'Calidad de agua',
    summary: 'Consulta registros de calidad de agua.',
    params: [AUTH_HEADER],
    responses: [
      {
        code: '200',
        description: 'Registros de calidad.',
        sample: JSON.stringify([{ id: 1, estado: 'Sonora', valor: 85 }], null, 2),
      },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-calidad-create',
    tag: 'v2 · /calidad-agua',
    version: 'v2',
    method: 'post',
    path: '/calidad-agua',
    title: 'Crear calidad de agua',
    summary: 'Crea un registro de calidad de agua.',
    params: [AUTH_HEADER],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ estado: 'Sonora', valor: 85 }, null, 2),
    responses: [
      { code: '200', description: 'Registro creado.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-calidad-update',
    tag: 'v2 · /calidad-agua',
    version: 'v2',
    method: 'patch',
    path: '/calidad-agua/{id}',
    title: 'Actualizar calidad de agua',
    summary: 'Actualiza un registro de calidad de agua.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del registro' },
    ],
    bodySchema: 'application/json',
    requestSample: JSON.stringify({ valor: 88 }, null, 2),
    responses: [
      { code: '200', description: 'Registro actualizado.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'No encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
  {
    id: 'v2-calidad-delete',
    tag: 'v2 · /calidad-agua',
    version: 'v2',
    method: 'delete',
    path: '/calidad-agua/{id}',
    title: 'Eliminar calidad de agua',
    summary: 'Elimina un registro de calidad de agua.',
    params: [
      AUTH_HEADER,
      { name: 'id', in: 'path', required: true, type: 'string', description: 'Id del registro' },
    ],
    responses: [
      { code: '200', description: 'Registro eliminado.' },
      { code: '401', description: 'Usuario no autorizado.' },
      { code: '404', description: 'No encontrado.' },
      { code: '503', description: 'Mantenimiento de los servicios.' },
    ],
  },
];

const GUIDE_SECTIONS: GuideSection[] = [
  { id: 'guide-overview', tag: 'Guía de conexión', title: 'Introducción MQTT', kind: 'guide' },
  { id: 'guide-broker', tag: 'Guía de conexión', title: 'Broker y seguridad', kind: 'guide' },
  { id: 'guide-topics', tag: 'Guía de conexión', title: 'Topics y payload', kind: 'guide' },
  { id: 'guide-examples', tag: 'Guía de conexión', title: 'Ejemplos de publicación', kind: 'guide' },
  { id: 'guide-diag', tag: 'Guía de conexión', title: 'Diagnóstico', kind: 'guide' },
];

const ALL_ITEMS: NavItem[] = [...OPERATIONS, ...GUIDE_SECTIONS];

const TAGS = [
  'v1 · /products',
  'v2 · /metrics',
  'v2 · /metrics/.../alerts',
  'v2 · /puntoVentas',
  'v2 · /puntoVentas/.../sensors',
  'v2 · /sensors',
  'v2 · /clients',
  'v2 · /cities',
  'v2 · /region-metrics',
  'v2 · /calidad-agua',
  'Guía de conexión',
];

function baseForVersion(version: ApiVersion) {
  return version === 'v2' ? API_BASE_V2 : API_BASE_V1;
}

// ----------------------------------------------------------------------

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        minWidth: 52,
        px: 0.75,
        py: 0.25,
        borderRadius: 0.5,
        bgcolor: METHOD_COLOR[method],
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        textAlign: 'center',
        fontFamily: 'monospace',
        lineHeight: 1.4,
      }}
    >
      {method}
    </Box>
  );
}

function CodeBlock({ children, dark }: { children: string; dark?: boolean }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        borderRadius: 1,
        overflow: 'auto',
        maxHeight: 420,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.75rem',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        bgcolor: dark ? '#1e2128' : 'grey.100',
        color: dark ? '#e6edf3' : 'text.primary',
        border: dark ? '1px solid #30363d' : '1px solid',
        borderColor: dark ? '#30363d' : 'divider',
      }}
    >
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------

export default function MQTTDocumentationPage() {
  const [activeId, setActiveId] = useState('products-list');
  const [search, setSearch] = useState('');
  const [responseTab, setResponseTab] = useState('200');
  const [downloading, setDownloading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_ITEMS;
    return ALL_ITEMS.filter((item) => {
      if (isGuide(item)) {
        return item.title.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q);
      }
      return (
        item.title.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.method.includes(q) ||
        item.version.includes(q) ||
        `api ${item.version}`.includes(q)
      );
    });
  }, [search]);

  const active = ALL_ITEMS.find((i) => i.id === activeId) ?? OPERATIONS[0];
  const activeOp = !isGuide(active) ? active : null;
  const activeGuide = isGuide(active) ? active : null;

  const handleDownloadCertificate = async () => {
    try {
      setDownloading(true);
      const response = await axiosInstance({
        url: '/mqtt/certificate/download',
        method: 'GET',
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'aquatech_ca_certificate.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando certificado:', error);
    } finally {
      setDownloading(false);
    }
  };

  const selectItem = (id: string) => {
    setActiveId(id);
    const op = OPERATIONS.find((o) => o.id === id);
    setResponseTab(op?.responses[0]?.code ?? '200');
  };

  return (
    <>
      <Helmet>
        <title>API TI Water — Documentación | Aquatech</title>
      </Helmet>

      <Box
        sx={{
          display: 'flex',
          height: 'calc(100vh - 64px)',
          minHeight: 560,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {/* Sidebar */}
        <Box
          sx={{
            width: 280,
            flexShrink: 0,
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={700}>
              API TI Water
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Documentación oficial · {CONFIG.appVersion}
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Filter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ mt: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ overflow: 'auto', flex: 1, py: 1 }}>
            {TAGS.map((tag) => {
              const items = filtered.filter((i) => i.tag === tag);
              if (items.length === 0) return null;
              return (
                <Box key={tag} sx={{ mb: 1.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 2,
                      py: 0.5,
                      display: 'block',
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tag}
                  </Typography>
                  <List dense disablePadding>
                    {items.map((item) => {
                      const selected = item.id === activeId;
                      return (
                        <ListItem key={item.id} disablePadding>
                          <ListItemButton
                            selected={selected}
                            onClick={() => selectItem(item.id)}
                            sx={{ py: 0.75, px: 2, gap: 1, alignItems: 'flex-start' }}
                          >
                            {!isGuide(item) ? (
                              <MethodBadge method={item.method} />
                            ) : (
                              <Box
                                sx={{
                                  minWidth: 52,
                                  textAlign: 'center',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: 'primary.main',
                                  pt: 0.25,
                                }}
                              >
                                DOC
                              </Box>
                            )}
                            <ListItemText
                              primary={item.title}
                              primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: selected ? 600 : 400,
                                sx: { lineHeight: 1.35 },
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Center + right */}
        <Box sx={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ flex: 1.15, overflow: 'auto', p: { xs: 2, md: 3 } }}>
            {activeOp && (
              <Stack spacing={2.5}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="overline" color="text.secondary">
                      {activeOp.tag}
                    </Typography>
                    <Chip
                      size="small"
                      label={activeOp.version === 'v2' ? 'v2.0' : 'v1.0'}
                      color={activeOp.version === 'v2' ? 'secondary' : 'primary'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
                    />
                  </Stack>
                  <Typography variant="h4" component="h1" gutterBottom>
                    {activeOp.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {activeOp.summary}
                  </Typography>
                </Box>

                {activeOp.params && activeOp.params.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {activeOp.bodySchema ? 'Parameters & body' : 'Parameters'}
                    </Typography>
                    {activeOp.bodySchema && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Request Body schema: <strong>{activeOp.bodySchema}</strong>
                      </Typography>
                    )}
                    <Table size="small" sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>In</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activeOp.params.map((p) => (
                          <TableRow key={`${p.in}-${p.name}`}>
                            <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                              {p.name}
                              {p.required ? (
                                <Typography component="span" color="error" variant="caption" sx={{ ml: 0.5 }}>
                                  required
                                </Typography>
                              ) : null}
                            </TableCell>
                            <TableCell>{p.in}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{p.type}</TableCell>
                            <TableCell>{p.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Responses
                  </Typography>
                  <Stack spacing={1}>
                    {activeOp.responses.map((r) => (
                      <Box key={r.code} sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
                        <Chip
                          size="small"
                          label={r.code}
                          color={r.code.startsWith('2') ? 'success' : r.code.startsWith('4') ? 'warning' : 'default'}
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', minWidth: 52 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {r.description}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Divider />
                <Typography variant="caption" color="text.secondary">
                  Base URL:{' '}
                  <Link
                    href={baseForVersion(activeOp.version)}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                  >
                    {baseForVersion(activeOp.version)}
                  </Link>
                </Typography>
              </Stack>
            )}

            {activeGuide && (
              <GuideContent
                sectionId={activeGuide.id}
                downloading={downloading}
                onDownload={handleDownloadCertificate}
              />
            )}
          </Box>

          {/* Right samples panel */}
          {activeOp && (
            <Box
              sx={{
                width: { md: 380, lg: 440 },
                flexShrink: 0,
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                bgcolor: '#161b22',
                color: '#e6edf3',
                borderLeft: '1px solid #30363d',
                overflow: 'auto',
              }}
            >
              <Box sx={{ p: 2, borderBottom: '1px solid #30363d' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <MethodBadge method={activeOp.method} />
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#8b949e' }}
                  >
                    {activeOp.path}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: '#8b949e' }}>
                  {baseForVersion(activeOp.version)}
                  {activeOp.path.replace(/\{[^}]+\}/g, ':id')}
                </Typography>
              </Box>

              {activeOp.requestSample && (
                <Box sx={{ p: 2, borderBottom: '1px solid #30363d' }}>
                  <Typography variant="caption" sx={{ color: '#8b949e', fontWeight: 700 }}>
                    Request samples
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <CodeBlock dark>{activeOp.requestSample}</CodeBlock>
                  </Box>
                </Box>
              )}

              <Box sx={{ p: 2 }}>
                <Typography variant="caption" sx={{ color: '#8b949e', fontWeight: 700 }}>
                  Response samples
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  {activeOp.responses.map((r) => (
                    <Chip
                      key={r.code}
                      size="small"
                      label={r.code}
                      onClick={() => setResponseTab(r.code)}
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: responseTab === r.code ? '#30363d' : 'transparent',
                        color: responseTab === r.code ? '#e6edf3' : '#8b949e',
                        border: '1px solid #30363d',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Stack>
                <Typography variant="caption" sx={{ color: '#8b949e', display: 'block', mb: 1 }}>
                  Content type · application/json
                </Typography>
                <CodeBlock dark>
                  {activeOp.responses.find((r) => r.code === responseTab)?.sample ||
                    JSON.stringify(
                      { message: activeOp.responses.find((r) => r.code === responseTab)?.description },
                      null,
                      2
                    )}
                </CodeBlock>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}

// ----------------------------------------------------------------------

function GuideContent({
  sectionId,
  downloading,
  onDownload,
}: {
  sectionId: string;
  downloading: boolean;
  onDownload: () => void;
}) {
  if (sectionId === 'guide-overview') {
    return (
      <Stack spacing={2}>
        <Typography variant="overline" color="text.secondary">
          Guía de conexión
        </Typography>
        <Typography variant="h4">Introducción MQTT</Typography>
        <Typography color="text.secondary">
          Además de la API REST <code>/products/…</code>, la telemetría continua de tienda se publica hacia la nube por{' '}
          <strong>MQTT</strong> (Azure Event Grid). El consumidor Aquatech suscribe los topics, normaliza el JSON y guarda en
          PostgreSQL para tableros y alertas.
        </Typography>
        <Typography color="text.secondary">
          Debes completar el <strong>alta del punto de venta</strong> (código de tienda, región y ciudad) y recibir un{' '}
          <strong>certificado de cliente X.509</strong> más el <strong>nombre de autenticación MQTT</strong> registrado en
          Azure. Contacta a un representante Aquatech para el onboarding.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Flujo: gateway → Event Grid MQTT → consumidor Aquatech → PostgreSQL → API REST / dashboard.
        </Typography>
      </Stack>
    );
  }

  if (sectionId === 'guide-broker') {
    return (
      <Stack spacing={2.5}>
        <Typography variant="overline" color="text.secondary">
          Guía de conexión
        </Typography>
        <Typography variant="h4">Broker y seguridad</Typography>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Endpoint
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {MQTT_DOC_HOST}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip label="8883" color="success" size="small" />
            <Chip label="mqtts (TLS)" color="primary" size="small" />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            TLS obligatorio. No uses 1883 ni conexiones sin cifrado hacia Event Grid. Override con{' '}
            <code>VITE_MQTT_PUBLIC_HOSTNAME</code> si aplica.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Seguridad (X.509)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Autenticación con <strong>mutual TLS</strong>: certificado de cliente registrado en Azure +{' '}
            <strong>username</strong> = Client authentication name. <strong>No envíes contraseña MQTT</strong> contra Event
            Grid.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Topic space (p. ej. <code>tiwater/#</code>) + Permission binding Publisher para tu grupo de clientes.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:download-bold-duotone" width={20} />}
            onClick={onDownload}
            disabled={downloading}
          >
            {downloading ? 'Descargando…' : 'Descargar material Aquatech (ZIP)'}
          </Button>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Variables de entorno (referencia)
          </Typography>
          <CodeBlock>{`MQTT_BROKER=${MQTT_DOC_HOST}
MQTT_PORT=8883
MQTT_USE_TLS=true
MQTT_USERNAME=${MQTT_EXAMPLE_CLIENT_AUTH}
# No definir MQTT_PASSWORD
MQTT_CLIENT_CERT_B64=...
MQTT_CLIENT_KEY_B64=...`}</CodeBlock>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            El cliente <code>{MQTT_EXAMPLE_CLIENT_AUTH}</code> es solo del simulador interno; no lo reutilices.
          </Typography>
        </Box>
      </Stack>
    );
  }

  if (sectionId === 'guide-topics') {
    return (
      <Stack spacing={2.5}>
        <Typography variant="overline" color="text.secondary">
          Guía de conexión
        </Typography>
        <Typography variant="h4">Topics y payload</Typography>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Topic recomendado
          </Typography>
          <CodeBlock>{`{CLIENTE}/{CODIGO_REGION}/{CIUDAD}/{CODIGO_TIENDA}/data
# ej. tiwater/Noroeste/Hermosillo/TIENDA_001/data`}</CodeBlock>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Legacy: <code>tiwater/&#123;CODIGO_TIENDA&#125;/data</code>. El <code>CODIGO_TIENDA</code> debe existir en la
            plataforma.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Payload JSON
          </Typography>
          <CodeBlock>{`{
  "CAUDAL PURIFICADA": 1.2,
  "CAUDAL RECHAZO": 0.12,
  "NIVEL PURIFICADA": 62.5,
  "PORCENTAJE NIVEL CRUDA": 55.0,
  "TDS": 45,
  "ch1": 2.1,
  "timestamp": 1730000000,
  "lat": 29.07,
  "long": -110.95
}`}</CodeBlock>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Publica con QoS 1 si tu cliente lo permite. También se aceptan nombres snake_case normalizados.
          </Typography>
        </Box>
      </Stack>
    );
  }

  if (sectionId === 'guide-examples') {
    return (
      <Stack spacing={2.5}>
        <Typography variant="overline" color="text.secondary">
          Guía de conexión
        </Typography>
        <Typography variant="h4">Ejemplos de publicación</Typography>
        <Typography variant="body2" color="text.secondary">
          Necesitas <code>client.pem</code>, <code>client.key</code> y el Client authentication name. Event Grid no usa
          contraseña MQTT.
        </Typography>

        <Typography variant="subtitle2">Node.js</Typography>
        <CodeBlock>{`import fs from 'fs';
import mqtt from 'mqtt';

const url = \`mqtts://\${process.env.MQTT_BROKER ?? '${MQTT_DOC_HOST}'}:8883\`;
const client = mqtt.connect(url, {
  username: process.env.MQTT_USERNAME ?? '${MQTT_EXAMPLE_CLIENT_AUTH}',
  cert: fs.readFileSync('./client.pem'),
  key: fs.readFileSync('./client.key'),
});

client.on('connect', () => {
  client.publish(
    'tiwater/Noroeste/Hermosillo/TIENDA_001/data',
    JSON.stringify({ TDS: 45, timestamp: Math.floor(Date.now() / 1000) }),
    { qos: 1 },
    () => client.end()
  );
});`}</CodeBlock>

        <Typography variant="subtitle2">mosquitto_pub</Typography>
        <CodeBlock>{`mosquitto_pub \\
  -h ${MQTT_DOC_HOST} -p 8883 \\
  --tls-version tlsv1.2 \\
  -u "${MQTT_EXAMPLE_CLIENT_AUTH}" \\
  --cert client.pem --key client.key \\
  -t "tiwater/Noroeste/Hermosillo/TIENDA_001/data" \\
  -m '{"TDS":45,"timestamp":1730000000}' -q 1`}</CodeBlock>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="overline" color="text.secondary">
        Guía de conexión
      </Typography>
      <Typography variant="h4">Diagnóstico</Typography>
      <Typography variant="body2" color="text.secondary">
        <strong>OK:</strong> handshake TLS + CONNECT aceptado (certificado y permisos de publicación correctos).
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <strong>Not authorized:</strong> thumbprint distinto, username ≠ Client authentication name, o falta Permission
        binding Publisher.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <strong>TLS error:</strong> revisa hostname/SNI, reloj del dispositivo y CA de Azure.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <strong>Topic rechazado:</strong> el Topic space no incluye tu ruta (ajusta template, p. ej.{' '}
        <code>tiwater/#</code>).
      </Typography>
    </Stack>
  );
}
