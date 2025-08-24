import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { auditLogger } from '../lib/auditLog';
import { ENV } from '../config/environment';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ProductionErrorBoundary extends Component<Props, State> {
  private errorReportTimeout?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error for monitoring
    auditLogger.logEvent('UNHANDLED_ERROR', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Report to external monitoring service
    this.reportErrorToMonitoring(error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private reportErrorToMonitoring(error: Error, errorInfo: ErrorInfo) {
    // Debounce error reporting to prevent spam
    if (this.errorReportTimeout) {
      clearTimeout(this.errorReportTimeout);
    }

    this.errorReportTimeout = setTimeout(() => {
      if (ENV.isProduction) {
        // Report to Sentry or other monitoring service
        if (window.Sentry) {
          window.Sentry.captureException(error, {
            contexts: {
              react: {
                componentStack: errorInfo.componentStack
              }
            },
            tags: {
              errorBoundary: true,
              errorId: this.state.errorId
            }
          });
        }

        // Report to analytics if available
        if (window.gtag) {
          window.gtag('event', 'exception', {
            description: error.message,
            fatal: true,
            error_id: this.state.errorId
          });
        }
      }
    }, 1000);
  }

  private handleRefresh = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const mailtoLink = `mailto:support@cybersecurity-platform.com?subject=Error Report - ${this.state.errorId}&body=${encodeURIComponent(
      `Error Details:\n${JSON.stringify(errorDetails, null, 2)}\n\nPlease describe what you were doing when this error occurred:`
    )}`;

    window.open(mailtoLink);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We apologize for the inconvenience. An unexpected error has occurred.
            </p>

            {this.state.errorId && (
              <div className="mb-6 p-3 bg-gray-100 rounded-md">
                <p className="text-sm text-gray-600">
                  Error ID: <code className="font-mono">{this.state.errorId}</code>
                </p>
              </div>
            )}

            {!ENV.isProduction && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Error Details (Development Mode)
                </summary>
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    {this.state.error.message}
                  </p>
                  <pre className="text-xs text-red-700 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-red-700 whitespace-pre-wrap mt-2">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleRefresh}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </button>

              <button
                onClick={this.handleReportBug}
                className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <Bug className="h-4 w-4 mr-2" />
                Report Bug
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              If this problem persists, please contact support with the error ID above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  componentWillUnmount() {
    if (this.errorReportTimeout) {
      clearTimeout(this.errorReportTimeout);
    }
  }
}

// Route-specific error boundary
export const RouteErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ProductionErrorBoundary
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Page Error</h3>
            <p className="text-gray-600">This section couldn't be loaded.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reload
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ProductionErrorBoundary>
  );
};

// Component-specific error boundary
export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode; 
  componentName?: string;
}> = ({ children, componentName = 'Component' }) => {
  return (
    <ProductionErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                {componentName} Error
              </h4>
              <p className="text-sm text-red-700 mt-1">
                This component failed to load. Please refresh the page.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ProductionErrorBoundary>
  );
};