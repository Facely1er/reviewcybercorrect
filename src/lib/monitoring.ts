// Production Monitoring and Analytics
import { ENV } from '../config/environment';
import { auditLogger } from './auditLog';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ErrorMetric {
  error: Error;
  context?: Record<string, any>;
  userId?: string;
  timestamp: number;
}

interface UserEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp: number;
}

class ProductionMonitoring {
  private static instance: ProductionMonitoring;
  private metricsBuffer: PerformanceMetric[] = [];
  private errorBuffer: ErrorMetric[] = [];
  private userEventBuffer: UserEvent[] = [];
  private flushInterval?: NodeJS.Timeout;
  private isInitialized = false;

  static getInstance(): ProductionMonitoring {
    if (!ProductionMonitoring.instance) {
      ProductionMonitoring.instance = new ProductionMonitoring();
    }
    return ProductionMonitoring.instance;
  }

  private constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;

    // Initialize external monitoring services
    this.initializeSentry();
    this.initializeAnalytics();
    this.initializePerformanceObserver();
    
    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 30000); // Flush every 30 seconds

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushMetrics();
    });

    this.isInitialized = true;
  }

  private initializeSentry() {
    if (ENV.isProduction && ENV.SENTRY_DSN) {
      // Dynamically load Sentry to avoid blocking
      import('@sentry/browser').then(({ init, configureScope }) => {
        init({
          dsn: ENV.SENTRY_DSN,
          environment: ENV.NODE_ENV,
          release: ENV.APP_VERSION,
          tracesSampleRate: 0.1,
          beforeSend: (event) => {
            // Filter out noise
            if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
              return null;
            }
            return event;
          }
        });

        configureScope((scope) => {
          scope.setTag('component', 'cybersecurity-platform');
        });

        window.Sentry = { init, configureScope };
      }).catch(error => {
        console.warn('Failed to load Sentry:', error);
      });
    }
  }

  private initializeAnalytics() {
    if (ENV.isProduction && ENV.ANALYTICS_ID) {
      // Initialize Google Analytics 4
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ENV.ANALYTICS_ID}`;
      document.head.appendChild(script);

      script.onload = () => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function(...args: any[]) {
          window.dataLayer.push(args);
        };
        
        window.gtag('js', new Date());
        window.gtag('config', ENV.ANALYTICS_ID, {
          anonymize_ip: true,
          allow_google_signals: false,
          allow_ad_personalization_signals: false
        });
      };
    }
  }

  private initializePerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Monitor Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            value: entry.value || entry.duration,
            timestamp: Date.now(),
            metadata: {
              entryType: entry.entryType,
              startTime: entry.startTime
            }
          });
        });
      });

      try {
        observer.observe({ type: 'measure', buffered: true });
        observer.observe({ type: 'navigation', buffered: true });
        observer.observe({ type: 'resource', buffered: true });
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }
  }

  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    this.metricsBuffer.push({
      ...metric,
      timestamp: Date.now()
    });

    // Limit buffer size
    if (this.metricsBuffer.length > 1000) {
      this.metricsBuffer = this.metricsBuffer.slice(-500);
    }
  }

  recordError(error: Error, context?: Record<string, any>, userId?: string): void {
    const errorMetric: ErrorMetric = {
      error,
      context,
      userId,
      timestamp: Date.now()
    };

    this.errorBuffer.push(errorMetric);

    // Send to external services immediately for errors
    if (ENV.isProduction) {
      this.sendErrorToServices(errorMetric);
    }

    // Log to audit system
    auditLogger.logEvent('ERROR_RECORDED', {
      message: error.message,
      stack: error.stack,
      context,
      userId
    });

    // Limit buffer size
    if (this.errorBuffer.length > 100) {
      this.errorBuffer = this.errorBuffer.slice(-50);
    }
  }

  recordUserEvent(event: string, properties?: Record<string, any>, userId?: string): void {
    const userEvent: UserEvent = {
      event,
      properties,
      userId,
      timestamp: Date.now()
    };

    this.userEventBuffer.push(userEvent);

    // Limit buffer size
    if (this.userEventBuffer.length > 500) {
      this.userEventBuffer = this.userEventBuffer.slice(-250);
    }
  }

  private sendErrorToServices(errorMetric: ErrorMetric): void {
    // Send to Sentry
    if (window.Sentry?.captureException) {
      window.Sentry.captureException(errorMetric.error, {
        extra: errorMetric.context,
        user: errorMetric.userId ? { id: errorMetric.userId } : undefined
      });
    }

    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: errorMetric.error.message,
        fatal: false,
        custom_map: {
          custom_parameter_1: JSON.stringify(errorMetric.context)
        }
      });
    }
  }

  private flushMetrics(): void {
    if (!ENV.isProduction) return;

    // Send user events to analytics
    if (this.userEventBuffer.length > 0 && window.gtag) {
      this.userEventBuffer.forEach(event => {
        window.gtag('event', event.event, {
          custom_map: event.properties,
          user_id: event.userId
        });
      });
      this.userEventBuffer = [];
    }

    // Send performance metrics
    if (this.metricsBuffer.length > 0) {
      const performanceData = {
        metrics: this.metricsBuffer.slice(),
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Send to monitoring endpoint
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(performanceData)
      }).catch(error => {
        console.warn('Failed to send metrics:', error);
      });

      this.metricsBuffer = [];
    }
  }

  // Application health monitoring
  performHealthCheck(): Promise<HealthCheckResult> {
    return new Promise(async (resolve) => {
      const healthCheck: HealthCheckResult = {
        status: 'healthy',
        timestamp: Date.now(),
        checks: {},
        version: ENV.APP_VERSION
      };

      try {
        // Check localStorage availability
        healthCheck.checks.localStorage = await this.checkLocalStorage();
        
        // Check Supabase connection
        healthCheck.checks.database = await this.checkDatabase();
        
        // Check memory usage
        healthCheck.checks.memory = this.checkMemoryUsage();
        
        // Check performance
        healthCheck.checks.performance = this.checkPerformance();

        // Determine overall status
        const hasFailures = Object.values(healthCheck.checks).some(check => !check.healthy);
        healthCheck.status = hasFailures ? 'degraded' : 'healthy';

      } catch (error) {
        healthCheck.status = 'unhealthy';
        healthCheck.error = error.message;
      }

      resolve(healthCheck);
    });
  }

  private async checkLocalStorage(): Promise<HealthCheckItem> {
    try {
      const testKey = 'health-check-test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { healthy: true, responseTime: 1 };
    } catch {
      return { healthy: false, error: 'localStorage unavailable' };
    }
  }

  private async checkDatabase(): Promise<HealthCheckItem> {
    const start = Date.now();
    try {
      // Simple ping to Supabase
      const response = await fetch(`${ENV.SUPABASE_URL}/rest/v1/`, {
        headers: { 'apikey': ENV.SUPABASE_ANON_KEY }
      });
      
      const responseTime = Date.now() - start;
      return {
        healthy: response.ok,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }

  private checkMemoryUsage(): HealthCheckItem {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemoryMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMemoryMB = memory.totalJSHeapSize / 1024 / 1024;
      const usagePercent = (usedMemoryMB / totalMemoryMB) * 100;

      return {
        healthy: usagePercent < 90,
        metadata: {
          usedMemoryMB: Math.round(usedMemoryMB),
          totalMemoryMB: Math.round(totalMemoryMB),
          usagePercent: Math.round(usagePercent)
        }
      };
    }

    return { healthy: true, metadata: { available: false } };
  }

  private checkPerformance(): HealthCheckItem {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      
      return {
        healthy: loadTime < 5000, // Less than 5 seconds
        metadata: {
          loadTime: Math.round(loadTime),
          domContentLoaded: Math.round(domContentLoaded),
          type: navigation.type
        }
      };
    }

    return { healthy: true, metadata: { available: false } };
  }

  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushMetrics();
  }
}

interface HealthCheckItem {
  healthy: boolean;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: Record<string, HealthCheckItem>;
  version: string;
  error?: string;
}

// Analytics helper functions
export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    monitoring.recordUserEvent(event, properties);
  },
  
  page: (pageName: string) => {
    if (ENV.isProduction && window.gtag) {
      window.gtag('config', ENV.ANALYTICS_ID, {
        page_title: pageName,
        page_location: window.location.href
      });
    }
  },

  identify: (userId: string, traits?: Record<string, any>) => {
    if (ENV.isProduction && window.gtag) {
      window.gtag('config', ENV.ANALYTICS_ID, {
        user_id: userId,
        custom_map: traits
      });
    }
  }
};

// Performance monitoring helpers
export const performance = {
  mark: (name: string) => {
    if ('performance' in window && 'mark' in window.performance) {
      window.performance.mark(name);
    }
  },

  measure: (name: string, startMark?: string, endMark?: string) => {
    if ('performance' in window && 'measure' in window.performance) {
      try {
        window.performance.measure(name, startMark, endMark);
        monitoring.recordMetric({
          name,
          value: window.performance.getEntriesByName(name)[0]?.duration || 0
        });
      } catch (error) {
        console.warn('Performance measure failed:', error);
      }
    }
  },

  time: <T>(name: string, fn: () => T): T => {
    const start = Date.now();
    try {
      const result = fn();
      monitoring.recordMetric({
        name,
        value: Date.now() - start
      });
      return result;
    } catch (error) {
      monitoring.recordError(error as Error, { operation: name });
      throw error;
    }
  }
};

// Export singleton instance
export const monitoring = ProductionMonitoring.getInstance();

// Global error handler
window.addEventListener('error', (event) => {
  monitoring.recordError(event.error || new Error(event.message), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  monitoring.recordError(
    new Error(event.reason?.message || 'Unhandled Promise Rejection'),
    { reason: event.reason }
  );
});

// Declare global types
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
      init: (config: any) => void;
      configureScope: (callback: (scope: any) => void) => void;
    };
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}