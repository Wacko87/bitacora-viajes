import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught UI error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-zinc-900 border border-rose-500/40 rounded-3xl text-center flex flex-col items-center gap-3 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {this.props.fallbackTitle || 'Algo no ha ido bien en esta sección'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm">
            {this.state.error?.message || 'Se ha producido un error inesperado al renderizar el contenido.'}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-amber-500/20"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
