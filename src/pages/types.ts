interface Status {
    code: string;
    value: any;  // Adjust this if you want more specific types for the value
  };
  
  export type Product  = {
    id: string;
    name: string;
    city: string;
    state: string;
    product_type: string;
    cliente: Cliente;
    drive: string;
    online: boolean;
    icon: string;
    status: Status[];
  lat: number;
  lon: number;
  /** Unix timestamp (seconds). Tuya last update time. */
  update_time?: number;
  /** Unix timestamp (seconds). When device was last seen active (if set by API). */
  last_time_active?: number;
  /** Unix timestamp (seconds). Max of update_time and latest ProductLog with non-zero value; used for "Última vez actualizado". */
  last_updated_display?: number;
  /** When true, product is included in the Tuya logs routine (cron). Admin-configurable in Personalización > Productos rutina logs. */
  tuya_logs_routine_enabled?: boolean;
  // Allow dynamic properties (strings) to be added to a product object
  [key: string]: any;  // This allows any string as a key on the product object
}

  export type Sing = {
    _id?: string;
    name: string;
    user: string;
    email: string;
    password: string;
    role: string;
    token: string;
  }
  export type MetricsData = {
    tds_range: number;
    production_volume_range: number;
    rejected_volume_range: number;
    filter_only_online: boolean;
  }

  /** Explicit severity for rule evaluation; avoids label parsing. */
  export type RuleSeverity = 'normal' | 'preventivo' | 'critico';

  export type MetricRule = {
    min: number | null;
    max: number | null;
    color: string;
    label: string;
    /** Explicit severity: normal | preventivo | critico. Use this instead of inferring from label. */
    severity?: RuleSeverity;
    /** Custom alert message shown in dashboard when this rule matches (optional). */
    message?: string;
  };

  export type MetricCondition = {
    depends_on?: string;
    flujo_condition?: string;
    level_ranges?: MetricRule[];
    rules?: any[];
  };

  export type MetricAlert = {
    _id?: string;
    id?: string;
    metricId?: string;
    metric_id?: string;
    usuario: string;
    correo: string;
    celular?: string;
    celularAlert?: boolean;
    celular_alert?: boolean;
    dashboardAlert?: boolean;
    dashboard_alert?: boolean;
    emailAlert?: boolean;
    email_alert?: boolean;
    preventivo?: boolean;
    correctivo?: boolean;
    emailCooldownMinutes?: number;
    emailMaxPerDay?: number;
  };

  export type  Metric = {
    _id?: string;
    id?: string; // For PostgreSQL compatibility
    cliente?: string;
    clientId?: string; // For PostgreSQL compatibility
    client_name?: string;
    product_type?: string; // For v1 (MongoDB) compatibility
    punto_venta_id?: string; // For v2 (PostgreSQL)
    punto_venta_name?: string; // For v2 (PostgreSQL)
    // New configuration fields
    metric_name?: string;
    metric_type?: string;
    sensor_type?: string;
    sensor_unit?: string;
    rules?: MetricRule[];
    conditions?: MetricCondition;
    enabled?: boolean;
    read_only?: boolean;
    display_order?: number;
    // Legacy fields
    tds_range?: number;
    production_volume_range?: number;
    temperature_range?: number; // For v1 (MongoDB) compatibility
    rejected_volume_range?: number;
    flow_rate_speed_range?: number;
    active_time?: number;
    filter_only_online?: boolean; // For v1 (MongoDB) compatibility
    metrics_description?: string;
  }
  export type Cliente = {
    _id?: string;
    id?: string; // For PostgreSQL compatibility
    name: string;
    email: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      lat: string;
      lon: string;
    };
  }
  
  export type City = {
    _id?: string;
    id?: string; // For PostgreSQL compatibility
    state: string;
    city: string;
    lat: number;
    lon: number;
  }

  export type DisplayFields = {
    product: boolean;
    city: boolean;
    cliente: boolean;
    drive: boolean;
    status: boolean;
    tds: boolean;
    volumeTotal: boolean;
    volumeReject: boolean;
    flowRate: boolean;
    rejectFlow: boolean;
    sedimentFilter: boolean;
    granularCarbonFilter: boolean;
    blockCarbonFilter: boolean;
    oiMembrane: boolean;
    temperature: boolean;
  }
  
  export type MarkerType = {
    name: string;
    state: string;
    state_code: number;
    color: string;
    total: number;
    tdsEnRango: number;
    tdsFueraRango: number;
    enRangoProduccion: number;
    fueraRangoProduccion: number;
    totalOnline: number;
    totalEnRango: number;
    coordinates: [number, number];
  }
  export type StateProperties = {
    state_name: string;
    state_code: number;
    centroid: [number, number];
  }
  
  export type GeoJSONFeature = {
    type: string;
    properties: StateProperties;
    geometry: {
      type: string;
      coordinates: any;
    };
  }
  
  export type VisitData = {
    series: { label: string; value: number }[];
  }
  
  export type MexicoMapProps = {
    originProducts: Product[]; // Accepting the array of products as a prop
    currentMetrics: MetricsData;
  }

  export type DashboardMetrics = {
    title: string;
    series: { label: string; color: string; value: number, products: Product[] }[];
  };
  
  export type MetricCardProps = {
    title: string;
    value: string | number | object;
    unit?: string;
  }

  export type Log = {
  _id: string;
  flujo_produccion: number;
  flujo_rechazo: number;
  production_volume: number;
  rejected_volume: number;
  tds: number;
  createdAt: string;
  source: string;
  tiempo_fin: number;
  tiempo_inicio: number;
  date: string;
  }

  export type User = {
    _id: string;
    nombre: string;
    email: string;
    client_name: string;
    password: string;
    role_name: string;
    cliente: string; // MongoDB Client reference
    postgresClientId?: string; // PostgreSQL Client reference for dashboard v2
    role: Role;
    verified: boolean;
    puesto: string;
    status: string;
    mqtt_zip_password?: string; // Contraseña para el ZIP del certificado MQTT
  }
  
  export type DashboardVersion = 'v1' | 'v2' | 'both';

  export type Role = {
    _id?: string;
    name: string;
    permissions?: string[]; // Array de rutas permitidas (ej: ['/', '/equipos', '/usuarios'])
    dashboardVersion?: DashboardVersion; // Landing dashboard: v1 (metrics by product), v2 (general metrics), both (user can switch)
  }

export interface Controller {
  _id: string;
  active_time: number;
  create_time: number;
  product_type: string;
  kfactor_tds: number;
  kfactor_flujo: number;
  id: string;
  ip: string;
  cliente: string;
  product: string;
  online: boolean;
  icon?: string;
  city?: string;
  state?: string;
  drive?: string;
  lat?: string;
  lon?: string;
  model?: string;
  name: string;
  owner_id?: string;
  product_id?: string;
  product_name?: string;
  sub?: boolean;
  time_zone?: string;
  restart?: boolean;               // reinicio remoto
  reset_pending?: boolean;         // indica que ESP32 debe reiniciarse
  flush_pending?: boolean; // indica que el esp32 debe forzar flush
  update_controller_time?: number;    // intervalo para actualizar datos
  ultima_actualizacion?: number;   // timestamp de la última actualización
  modo_reinicio?: string;          // "manual" | "programado"
  loop_time?: number;             // frecuencia del loop principal en ms o seg
  flush_time?: number;
  sensor_factor?: number;
  tipo_sensor?: string;
}

export interface PuntosVenta {
    _id?: string;
    id?: string; // For PostgreSQL compatibility
    codigo_tienda?: string; // Required for v2.0 PostgreSQL (maps to code)
    cliente: Cliente | string;
    client_name: string;
    city: City | string;
    city_name: String;
    name: String;
    productos: Product[] | string[];
    /** When true, cron generates random sensor data for this punto. Source: puntoventa.dev_mode column only. */
    dev_mode?: boolean;
    /** Form/edit: used for PATCH body (API accepts camelCase) */
    devMode?: boolean;
}