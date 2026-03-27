import * as React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      try {
        const parsed = JSON.parse(this.state.error?.message || '');
        if (parsed.error) {
          errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} at ${parsed.path})`;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      const isOfflineError = errorMessage.toLowerCase().includes('offline');

      return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h1>
            <p className="text-gray-400 mb-6">{errorMessage}</p>
            
            <div className="space-y-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/10"
              >
                <RefreshCcw className="w-5 h-5" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <RefreshCcw className="w-5 h-5" />
                Reload Application
              </button>
            </div>

            {isOfflineError && (
              <p className="mt-6 text-xs text-gray-500">
                This often happens due to temporary connection issues. Clicking "Try Again" usually fixes it.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
