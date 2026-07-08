import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-4">
          <div className="text-center space-y-4 max-w-md p-8 rounded-3xl border border-red-500/20 bg-slate-900/50 backdrop-blur-xl">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 text-3xl">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-slate-100">Something went wrong</h2>
            <p className="text-sm text-slate-400">
              We encountered an unexpected error on this page. Try reloading or contact support if the issue persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-red-500/10"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
