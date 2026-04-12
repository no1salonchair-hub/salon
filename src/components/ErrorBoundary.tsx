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
      let operation = '';
      let path = '';
      
      try {
        const parsed = JSON.parse(this.state.error?.message || '');
        if (parsed.error) {
          errorMessage = parsed.error;
          operation = parsed.operationType;
          path = parsed.path;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      const isOfflineError = errorMessage.toLowerCase().includes('offline') || 
                            errorMessage.toLowerCase().includes('unavailable') ||
                            errorMessage.toLowerCase().includes('reach cloud firestore');

      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative z-10">
            <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter">System Error</h1>
            <p className="text-white/60 mb-6 text-sm leading-relaxed">
              {errorMessage}
              {operation && <span className="block mt-2 text-[10px] text-white/20 uppercase font-black tracking-widest">Operation: {operation} {path && `at ${path}`}</span>}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity shadow-xl shadow-purple-600/20"
              >
                <RefreshCcw className="w-4 h-4" />
                Reload Application
              </button>
            </div>

            {isOfflineError && (
              <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                <p className="text-[10px] text-purple-300 font-bold uppercase tracking-widest leading-relaxed">
                  Connection Issue Detected: This usually happens due to temporary network issues or blocked third-party cookies. 
                  If it persists, check your Firebase configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
