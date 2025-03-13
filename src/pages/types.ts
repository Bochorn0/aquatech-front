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

  export type  Metric = {
    _id?: string;
    cliente: String;
    client_name: string;
    product_type: string;
    tds_range: number;
    production_volume_range: number;
    temperature_range: number;
    rejected_volume_range: number;
    flow_rate_speed_range: number;
    active_time: number;
    filter_only_online: boolean;
    metrics_description: string;
  }
  export type Cliente = {
    _id?: string;
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
    event_time: string;
    value: number;
    code: string;
    list: string[];
  }

  export type LogDisplayFields = {
    [key: string]: boolean;
  }

  export type User = {
    _id: string;
    nombre: string;
    email: string;
    client_name: string;
    role_name: string;
    cliente: string;
    role: Role;
    verified: boolean;
    puesto: string;
    status: string;
  }
  
  export type Role = {
    _id?: string;
    name: string;
  }