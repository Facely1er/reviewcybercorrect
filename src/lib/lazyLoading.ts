// Production Lazy Loading and Code Splitting
import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import { Loader2 } from 'lucide-react';
import { monitoring } from './monitoring';

interface LazyComponentOptions {
  fallback?: React.ComponentType;
  onError?: (error: Error) => void;
  preload?: boolean;
}

// Enhanced loading spinner
const DefaultLoadingSpinner: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  </div>
);

// Page-level loading component
const PageLoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <h2 className="text-xl font-medium text-gray-900">Loading Page...</h2>
      <p className="text-gray-600">Please wait while we prepare your content</p>
    </div>
  </div>
);

// Component-level loading
const ComponentLoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-6">
    <div className="flex items-center space-x-2">
      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      <span className="text-sm text-gray-600">Loading component...</span>
    </div>
  </div>
);

// Enhanced lazy loading with error handling and preloading
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): LazyExoticComponent<T> {
  const { fallback = ComponentLoadingSpinner, onError, preload = false } = options;

  // Create the lazy component with performance monitoring
  const LazyComponent = React.lazy(async () => {
    const startTime = Date.now();
    
    try {
      monitoring.performance.mark('lazy-load-start');
      
      const module = await importFn();
      
      const loadTime = Date.now() - startTime;
      monitoring.recordMetric({
        name: 'lazy-component-load-time',
        value: loadTime,
        metadata: {
          componentName: module.default.name || 'Anonymous'
        }
      });

      monitoring.performance.mark('lazy-load-end');
      monitoring.performance.measure('lazy-load-duration', 'lazy-load-start', 'lazy-load-end');

      return module;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      monitoring.recordError(error as Error, {
        operation: 'lazy-component-load',
        loadTime,
        importFunction: importFn.toString()
      });

      onError?.(error as Error);
      throw error;
    }
  });

  // Preload if requested
  if (preload && typeof window !== 'undefined') {
    // Preload after a short delay to not interfere with initial load
    setTimeout(() => {
      importFn().catch(error => {
        console.warn('Preload failed:', error);
      });
    }, 100);
  }

  return LazyComponent;
}

// Lazy-loaded route components with enhanced loading states
export const LazyRoutes = {
  // Main Dashboard
  Dashboard: createLazyComponent(
    () => import('../features/assessment/components/AdvancedDashboard'),
    { 
      fallback: PageLoadingSpinner,
      preload: true // Preload dashboard as it's commonly accessed
    }
  ),

  // Assessment Components
  AssessmentView: createLazyComponent(
    () => import('../features/assessment/components/EnhancedAssessmentView'),
    { fallback: PageLoadingSpinner }
  ),

  AssessmentCreator: createLazyComponent(
    () => import('../features/assessment/components/AssessmentCreator'),
    { fallback: ComponentLoadingSpinner }
  ),

  // Evidence Management
  EvidenceManagement: createLazyComponent(
    () => import('../features/evidence/components/EvidenceManagementView'),
    { fallback: PageLoadingSpinner }
  ),

  // Asset Management
  AssetInventory: createLazyComponent(
    () => import('../features/assets/components/AssetInventoryView'),
    { fallback: PageLoadingSpinner }
  ),

  // Compliance Monitoring
  ComplianceStatus: createLazyComponent(
    () => import('../features/compliance/components/RealTimeComplianceStatus'),
    { fallback: PageLoadingSpinner }
  ),

  // Policy Management
  PolicyManagement: createLazyComponent(
    () => import('../features/policies/components/PolicyManagementView'),
    { fallback: PageLoadingSpinner }
  ),

  // Reporting
  ReportingDashboard: createLazyComponent(
    () => import('../features/reporting/components/ReportingDashboard'),
    { fallback: PageLoadingSpinner }
  ),

  ReportViewer: createLazyComponent(
    () => import('../features/reporting/components/ReportViewer'),
    { fallback: ComponentLoadingSpinner }
  ),

  // Task Management
  TaskManagement: createLazyComponent(
    () => import('../features/tasks/components/TaskManagementDashboard'),
    { fallback: PageLoadingSpinner }
  ),

  // Settings
  Settings: createLazyComponent(
    () => import('../shared/components/ui/SettingsView'),
    { fallback: PageLoadingSpinner }
  ),

  // Authentication
  SignIn: createLazyComponent(
    () => import('../features/auth/components/SignInPage'),
    { fallback: PageLoadingSpinner }
  )
};

// Lazy-loaded utility components
export const LazyComponents = {
  // Charts and Visualizations
  ComplianceChart: createLazyComponent(
    () => import('../features/reporting/components/ComplianceChart'),
    { fallback: ComponentLoadingSpinner }
  ),

  TrendAnalysis: createLazyComponent(
    () => import('../features/reporting/components/TrendAnalysis'),
    { fallback: ComponentLoadingSpinner }
  ),

  // Advanced Forms
  AdvancedFormBuilder: createLazyComponent(
    () => import('../shared/components/forms/AdvancedFormBuilder'),
    { fallback: ComponentLoadingSpinner }
  ),

  // File Upload
  FileUploader: createLazyComponent(
    () => import('../shared/components/ui/FileUploader'),
    { fallback: ComponentLoadingSpinner }
  ),

  // Data Tables
  DataTable: createLazyComponent(
    () => import('../shared/components/ui/DataTable'),
    { fallback: ComponentLoadingSpinner }
  )
};

// HOC for wrapping components with Suspense and error boundaries
export function withLazyLoading<P extends object>(
  Component: LazyExoticComponent<ComponentType<P>>,
  fallback: React.ComponentType = ComponentLoadingSpinner
) {
  return function LazyWrapper(props: P) {
    return (
      <Suspense fallback={React.createElement(fallback)}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Preloader utility for critical routes
export class RoutePreloader {
  private static preloadedRoutes = new Set<string>();
  private static preloadPromises = new Map<string, Promise<any>>();

  static preload(routeName: keyof typeof LazyRoutes): Promise<void> {
    if (this.preloadedRoutes.has(routeName)) {
      return Promise.resolve();
    }

    if (this.preloadPromises.has(routeName)) {
      return this.preloadPromises.get(routeName)!;
    }

    const Component = LazyRoutes[routeName];
    if (!Component || !Component._payload) {
      return Promise.resolve();
    }

    const preloadPromise = Component._payload._result
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          // Trigger the lazy loading
          const mockRender = React.createElement(Component);
          Promise.resolve()
            .then(() => {
              this.preloadedRoutes.add(routeName);
              resolve();
            })
            .catch(reject);
        });

    this.preloadPromises.set(routeName, preloadPromise);
    return preloadPromise;
  }

  static preloadCritical(): Promise<void[]> {
    // Preload commonly used routes
    const criticalRoutes: (keyof typeof LazyRoutes)[] = [
      'Dashboard',
      'AssessmentView',
      'ComplianceStatus'
    ];

    return Promise.all(
      criticalRoutes.map(route => this.preload(route))
    );
  }

  static getPreloadedRoutes(): string[] {
    return Array.from(this.preloadedRoutes);
  }
}

// Image lazy loading utility
export class ImageLazyLoader {
  private static observer?: IntersectionObserver;

  static initialize() {
    if ('IntersectionObserver' in window && !this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              
              if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                this.observer!.unobserve(img);
              }
            }
          });
        },
        { rootMargin: '50px' }
      );
    }
  }

  static observe(img: HTMLImageElement) {
    if (this.observer) {
      this.observer.observe(img);
    }
  }

  static cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Initialize image lazy loading
if (typeof window !== 'undefined') {
  ImageLazyLoader.initialize();
}

// Bundle size analyzer helper (development only)
export const bundleAnalyzer = {
  logChunkInfo: () => {
    if (process.env.NODE_ENV === 'development') {
      console.group('📦 Bundle Analysis');
      console.log('Lazy Routes:', Object.keys(LazyRoutes));
      console.log('Lazy Components:', Object.keys(LazyComponents));
      console.log('Preloaded Routes:', RoutePreloader.getPreloadedRoutes());
      console.groupEnd();
    }
  },

  measureChunkLoad: async (chunkName: string, loadFn: () => Promise<any>) => {
    const start = Date.now();
    try {
      const result = await loadFn();
      const loadTime = Date.now() - start;
      
      monitoring.recordMetric({
        name: 'chunk-load-time',
        value: loadTime,
        metadata: { chunkName }
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`📦 Chunk "${chunkName}" loaded in ${loadTime}ms`);
      }

      return result;
    } catch (error) {
      monitoring.recordError(error as Error, {
        operation: 'chunk-load',
        chunkName
      });
      throw error;
    }
  }
};