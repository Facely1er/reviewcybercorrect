// Framework-specific Error Boundary
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Info } from 'lucide-react';
import { getFramework, getAvailableFrameworks } from '../data/frameworks';

interface Props {
  children: ReactNode;
  frameworkId?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class FrameworkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `framework_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log detailed framework information
    console.error('Framework Error Boundary caught an error:', error);
    console.error('Framework ID:', this.props.frameworkId);
    console.error('Available frameworks:', getAvailableFrameworks().map(f => ({ id: f.id, name: f.name, sectionsCount: f.sections?.length || 0 })));
    
    if (this.props.frameworkId) {
      try {
        const framework = getFramework(this.props.frameworkId);
        console.error('Retrieved framework:', {
          id: framework?.id,
          name: framework?.name,
          sectionsCount: framework?.sections?.length || 0,
          hasValidSections: Array.isArray(framework?.sections)
        });
      } catch (e) {
        console.error('Error retrieving framework:', e);
      }
    }

    console.error('Component stack:', errorInfo.componentStack);

    this.props.onError?.(error, errorInfo);
  }

  private handleRefresh = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/dashboard';
  };

  private handleReportBug = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      frameworkId: this.props.frameworkId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      availableFrameworks: getAvailableFrameworks().map(f => f.id)
    };

    const mailtoLink = `mailto:support@cybersecurity-platform.com?subject=Framework Error Report - ${this.state.errorId}&body=${encodeURIComponent(
      `Framework Error Details:\n${JSON.stringify(errorDetails, null, 2)}\n\nPlease describe what you were doing when this error occurred:`
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
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Framework Loading Error
            </h1>
            
            <p className="text-gray-600 mb-4">
              There was an error loading the assessment framework. This might be due to:
            </p>
            
            <ul className="text-left text-sm text-gray-600 mb-6 space-y-1">
              <li>• Invalid framework configuration</li>
              <li>• Missing framework data</li>
              <li>• Corrupt assessment data</li>
              <li>• Network connectivity issues</li>
            </ul>

            {this.state.errorId && (
              <div className="mb-6 p-3 bg-gray-100 rounded-md">
                <p className="text-sm text-gray-600">
                  Error ID: <code className="font-mono">{this.state.errorId}</code>
                </p>
                {this.props.frameworkId && (
                  <p className="text-sm text-gray-600 mt-1">
                    Framework ID: <code className="font-mono">{this.props.frameworkId}</code>
                  </p>
                )}
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
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
                Go to Dashboard
              </button>

              <button
                onClick={this.handleReportBug}
                className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <Bug className="h-4 w-4 mr-2" />
                Report Bug
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="flex items-start">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-xs text-blue-700">
                  <strong>Troubleshooting:</strong> Try refreshing the page or going back to the dashboard. 
                  If the problem persists, please report the bug with the error ID above.
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}