"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-muted/20 p-6 text-center text-muted-foreground">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive opacity-50" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">3D Viewer Error</h3>
          <p className="max-w-md text-sm">
            {this.state.error?.message?.includes("WebGL") 
              ? "We couldn't start the 3D viewer. This usually means WebGL is disabled or not supported by your browser or graphics card."
              : "An unexpected error occurred while loading the 3D scene."}
          </p>
          <button 
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
