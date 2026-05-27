"use client";
import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8 relative z-10">
          <div className="glass-strong rounded-xl p-6 max-w-md text-center">
            <div className="text-[var(--red)] text-3xl mb-2">⚠</div>
            <h2 className="text-lg font-semibold mb-1">Something broke.</h2>
            <p className="text-[var(--text-dim)] text-[13px] mb-4">
              {this.state.error?.message || "Unknown error"}
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={this.reset} className="btn btn-primary">
                try again
              </button>
              <button onClick={() => window.location.reload()} className="btn">
                reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
