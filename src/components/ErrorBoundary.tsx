import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore Error: ${parsed.error} (Operation: ${parsed.operationType})`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message, use the raw message if available
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[2rem] border border-coral/20 p-10 space-y-6 text-center shadow-xl">
            <div className="w-16 h-16 bg-coral/10 rounded-2xl flex items-center justify-center text-coral mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-serif text-midnight italic">Something went wrong</h2>
              <p className="text-stone-500 text-base leading-relaxed">
                {errorMessage}
              </p>
              {isFirestoreError && (
                <p className="text-base text-stone-400 mt-2">
                  This might be a permission issue or a missing index.
                </p>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-midnight text-white rounded-full font-bold text-base uppercase tracking-widest hover:bg-lavender-dark transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
