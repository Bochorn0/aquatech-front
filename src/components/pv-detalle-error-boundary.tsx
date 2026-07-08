import { Component, type ErrorInfo, type ReactNode } from 'react';

import Alert from '@mui/material/Alert';

import { pvDetalleLog } from 'src/utils/punto-venta-detalle-debug';

type Props = {
  name: string;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/** Isolates Tuya detalle sub-section crashes so the rest of the page stays visible. */
export class PvDetalleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const { name } = this.props;
    console.error(`[PVDetalle] ${name} render error`, error, info.componentStack);
    pvDetalleLog(`${name} render error`, {
      message: error.message,
      stack: error.stack?.slice(0, 400),
    });
  }

  render() {
    const { error } = this.state;
    const { children, name } = this.props;
    if (error) {
      return (
        <Alert severity="warning" sx={{ my: 2 }}>
          No se pudo mostrar {name}. El resto del detalle sigue disponible.
        </Alert>
      );
    }
    return children;
  }
}
