import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-surface p-12 text-center m-8 rounded-xl">
          <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tx-primary mb-2">Something went wrong</h3>
          <p className="text-sm text-tx-tertiary mb-6 max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected error occurred in this component.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
