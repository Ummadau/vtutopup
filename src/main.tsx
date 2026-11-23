import './lib/apiShield.ts';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Application render error:', error);
  }

  handleResetSession = () => {
    try {
      localStorage.removeItem('naeem_user_session');
      localStorage.removeItem('naeem_remembered_user');
    } catch {
      // Ignore storage errors
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-center">
            <h1 className="text-lg font-extrabold text-slate-900">Unable to Display Page</h1>
            <p className="text-sm text-slate-600">
              Something interrupted loading the interface. Reloading or resetting your browser session usually resolves this.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-bold hover:bg-purple-800 transition"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleResetSession}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-sm font-bold hover:bg-slate-300 transition"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
