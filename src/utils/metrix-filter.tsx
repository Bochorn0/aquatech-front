import type { Product, MetricsData, DashboardMetrics } from '../pages/types'


export const getMetricsByProducts = (productosByCliente: Product[], metricsData: MetricsData):DashboardMetrics[] => {
  const tdsOnRangeProds: Product[] = [];
  const tdsOffRangeProds: Product[] = [];
  const proOnRangeProds: Product[] = [];
  const proOffRangeProds: Product[] = [];
  const rejectedOnRangeProds: Product[] = [];
  const rejectedOffRangeProds: Product[] = [];
  const prodOnline: Product[] =  productosByCliente.filter((p) => p.online) as Product[];
  const prodOffline: Product[] =  productosByCliente.filter((p) => !p.online) as Product[];
  console.log('prodOnline:', prodOnline);
  console.log('prodOffline:', prodOffline);
  if (metricsData.filter_only_online) {
    productosByCliente = productosByCliente.filter((p) => p.online) as Product[];
  }

  productosByCliente.forEach((product) => {
    const tdsRange = product.status.find((s) => s.code === "tds_out")?.value;
    const productionVolume = product.status.find((s) => s.code === "flowrate_total_1")?.value;
    const rejectedVolume = product.status.find((s) => s.code === "flowrate_total_2")?.value;

    if (tdsRange >= metricsData.tds_range) {
      tdsOnRangeProds.push(product);
    } else {
      tdsOffRangeProds.push(product);
    }

    if (productionVolume >= metricsData.production_volume_range / 10) {
      proOnRangeProds.push(product);
    } else {
      proOffRangeProds.push(product);
    }
    if (rejectedVolume >= metricsData.rejected_volume_range / 10) {
      rejectedOnRangeProds.push(product);
    } else {
      rejectedOffRangeProds.push(product);
    }
  });

  return [
    {
      title: "Equipos Conectados",
      series: [
        { label: "Equipos online", color: "#1877F2", value: prodOnline.length, products: prodOnline },
        { label: "Equipos offline", color: "#FF5630", value: prodOffline.length, products: prodOffline },
      ],
    },
    {
      title: "TDS",
      series: [
        { label: `Rango < ${metricsData.tds_range} ppm`, color: "#C00", value: tdsOffRangeProds.length, products: tdsOffRangeProds as Product[] },
        { label: `Rango >= ${metricsData.tds_range} ppm`, color: "#22C55E", value: tdsOnRangeProds.length, products: tdsOnRangeProds as Product[] },
      ],
    },
    {
      title: "PRODUCCIÓN",
      series: [
        { label: `Rango < ${metricsData.production_volume_range} ml/min`, color: "#FFAB00", value: proOnRangeProds.length, products: proOnRangeProds as Product[] },
        { label: `Rango >= ${metricsData.production_volume_range} ml/min`, color: "#00B8D9", value: proOffRangeProds.length, products: proOffRangeProds as Product[] },
      ],
    },
    {
      title: "RECHAZO",
      series: [
        { label: `Rango < ${metricsData.rejected_volume_range} ml/min`, color: "#8E33FF", value: rejectedOnRangeProds.length, products: rejectedOnRangeProds as Product[] },
        { label: `Rango >= ${metricsData.rejected_volume_range} ml/min`, color: "#E00", value: rejectedOffRangeProds.length, products: rejectedOffRangeProds as Product[] },
      ],
    },
  ];
};