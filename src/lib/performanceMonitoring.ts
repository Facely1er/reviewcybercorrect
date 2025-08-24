import { ENV } from '../config/environment';
import { errorMonitoring } from './errorMonitoring';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
}

interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceTiming {
  name: string;
  startTime: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitoring {
  private static instance: PerformanceMonitoring;
  private isInitialized = false;
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, PerformanceMark> = new Map();
  private timings: Map<string, PerformanceTiming> = new Map();
  private observers: Set<PerformanceObserver> = new Set();
  private readonly MAX_METRICS = 1000;
  private readonly MAX_MARKS = 500;

  static getInstance(): PerformanceMonitoring {
    if (!PerformanceMonitoring.instance) {
      PerformanceMonitoring.instance = new PerformanceMonitoring();
    }
    return PerformanceMonitoring.instance;
  }

  initialize() {
    if (this.isInitialized) return;

    try {
      this.setupPerformanceObservers();
      this.setupWebVitals();
      this.setupResourceTiming();
      this.setupLongTaskDetection();
      this.setupMemoryMonitoring();
      
      this.isInitialized = true;
    } catch (error) {
      errorMonitoring.captureException(error as Error, {
        tags: { type: 'performanceMonitoringInitError' }
      });
    }
  }

  private setupPerformanceObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleNavigationTiming(entry as PerformanceNavigationTiming);
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.add(navigationObserver);
      } catch (error) {
        console.warn('Failed to setup navigation timing observer:', error);
      }

      // Observe paint timing
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handlePaintTiming(entry as PerformancePaintTiming);
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.add(paintObserver);
      } catch (error) {
        console.warn('Failed to setup paint timing observer:', error);
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleResourceTiming(entry as PerformanceResourceTiming);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.add(resourceObserver);
      } catch (error) {
        console.warn('Failed to setup resource timing observer:', error);
      }
    }
  }

  private setupWebVitals() {
    // Core Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      try {
        const webVitalsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleWebVital(entry);
          }
        });
        webVitalsObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        this.observers.add(webVitalsObserver);
      } catch (error) {
        console.warn('Failed to setup web vitals observer:', error);
      }
    }
  }

  private setupResourceTiming() {
    // Monitor resource loading performance
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleResourceTiming(entry as PerformanceResourceTiming);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.add(resourceObserver);
      } catch (error) {
        console.warn('Failed to setup resource timing observer:', error);
      }
    }
  }

  private setupLongTaskDetection() {
    // Detect long tasks that block the main thread
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleLongTask(entry as PerformanceEntry);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.add(longTaskObserver);
      } catch (error) {
        console.warn('Failed to setup long task observer:', error);
      }
    }
  }

  private setupMemoryMonitoring() {
    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('memory_usage', memory.usedJSHeapSize, 'bytes', {
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        });
      }, 30000); // Check every 30 seconds
    }
  }

  private handleNavigationTiming(entry: PerformanceNavigationTiming) {
    const metrics = [
      { name: 'dom_content_loaded', value: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart, unit: 'ms' },
      { name: 'load_complete', value: entry.loadEventEnd - entry.loadEventStart, unit: 'ms' },
      { name: 'dom_interactive', value: entry.domInteractive - entry.fetchStart, unit: 'ms' },
      { name: 'first_byte', value: entry.responseStart - entry.fetchStart, unit: 'ms' },
      { name: 'dns_lookup', value: entry.domainLookupEnd - entry.domainLookupStart, unit: 'ms' },
      { name: 'tcp_connection', value: entry.connectEnd - entry.connectStart, unit: 'ms' },
      { name: 'server_response', value: entry.responseEnd - entry.responseStart, unit: 'ms' }
    ];

    metrics.forEach(metric => {
      if (metric.value > 0) {
        this.recordMetric(metric.name, metric.value, metric.unit, {
          url: window.location.href,
          navigationType: entry.navigationType
        });
      }
    });
  }

  private handlePaintTiming(entry: PerformancePaintTiming) {
    this.recordMetric(entry.name, entry.startTime, 'ms', {
      url: window.location.href
    });
  }

  private handleResourceTiming(entry: PerformanceResourceTiming) {
    const duration = entry.responseEnd - entry.startTime;
    if (duration > 0) {
      this.recordMetric('resource_load_time', duration, 'ms', {
        name: entry.name,
        type: entry.initiatorType,
        size: entry.transferSize,
        url: entry.name
      });
    }
  }

  private handleWebVital(entry: PerformanceEntry) {
    let value: number;
    let unit = 'ms';

    if ('value' in entry) {
      value = entry.value;
    } else if ('startTime' in entry) {
      value = entry.startTime;
    } else {
      return;
    }

    this.recordMetric(entry.entryType, value, unit, {
      url: window.location.href,
      navigationId: (entry as any).navigationId
    });
  }

  private handleLongTask(entry: PerformanceEntry) {
    const duration = entry.duration;
    if (duration > 50) { // Only track tasks longer than 50ms
      this.recordMetric('long_task', duration, 'ms', {
        url: window.location.href,
        startTime: entry.startTime
      });

      // Alert if task is very long
      if (duration > 100) {
        errorMonitoring.captureMessage(`Long task detected: ${duration}ms`, 'warning', {
          tags: { type: 'longTask' },
          extra: { duration, startTime: entry.startTime }
        });
      }
    }
  }

  // Public API methods
  startTiming(name: string, metadata?: Record<string, any>): (endMetadata?: Record<string, any>) => void {
    const startTime = performance.now();
    const timingId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.timings.set(timingId, {
      name,
      startTime,
      metadata
    });

    return (endMetadata?: Record<string, any>) => {
      this.endTiming(timingId, endMetadata);
    };
  }

  private endTiming(timingId: string, endMetadata?: Record<string, any>) {
    const timing = this.timings.get(timingId);
    if (!timing) return;

    const endTime = performance.now();
    const duration = endTime - timing.startTime;

    this.recordMetric(timing.name, duration, 'ms', {
      ...timing.metadata,
      ...endMetadata
    });

    this.timings.delete(timingId);
  }

  recordMetric(name: string, value: number, unit: string, metadata?: Record<string, any>, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      metadata,
      tags
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Send to monitoring service in production
    if (ENV.isProduction) {
      this.sendToMonitoringService(metric);
    }

    // Log in development
    if (ENV.isDevelopment) {
      console.log(`📊 Performance Metric: ${name} = ${value}${unit}`, metadata);
    }
  }

  mark(name: string, metadata?: Record<string, any>) {
    const mark: PerformanceMark = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.marks.set(name, mark);

    // Keep only recent marks
    if (this.marks.size > this.MAX_MARKS) {
      const firstKey = this.marks.keys().next().value;
      this.marks.delete(firstKey);
    }

    // Use native performance mark if available
    if ('mark' in performance) {
      try {
        performance.mark(name);
      } catch (error) {
        console.warn('Failed to create performance mark:', error);
      }
    }
  }

  measure(name: string, startMark: string, endMark?: string, metadata?: Record<string, any>) {
    try {
      if ('measure' in performance) {
        const measure = performance.measure(name, startMark, endMark);
        this.recordMetric(name, measure.duration, 'ms', {
          startMark,
          endMark,
          ...metadata
        });
      }
    } catch (error) {
      console.warn('Failed to measure performance:', error);
    }
  }

  getMetrics(name?: string, limit?: number): PerformanceMetric[] {
    let metrics = this.metrics;
    
    if (name) {
      metrics = metrics.filter(m => m.name === name);
    }
    
    if (limit) {
      metrics = metrics.slice(-limit);
    }
    
    return metrics;
  }

  getMarks(name?: string): PerformanceMark[] {
    let marks = Array.from(this.marks.values());
    
    if (name) {
      marks = marks.filter(m => m.name === name);
    }
    
    return marks;
  }

  clearMetrics() {
    this.metrics = [];
  }

  clearMarks() {
    this.marks.clear();
    if ('clearMarks' in performance) {
      performance.clearMarks();
    }
  }

  getPerformanceSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    // Group metrics by name and calculate statistics
    const metricGroups = this.metrics.reduce((groups, metric) => {
      if (!groups[metric.name]) {
        groups[metric.name] = [];
      }
      groups[metric.name].push(metric.value);
      return groups;
    }, {} as Record<string, number[]>);

    Object.entries(metricGroups).forEach(([name, values]) => {
      const sorted = values.sort((a, b) => a - b);
      summary[name] = {
        count: values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    });

    return summary;
  }

  private sendToMonitoringService(metric: PerformanceMetric) {
    try {
      // In production, send to monitoring service (Sentry, DataDog, etc.)
      if (ENV.SENTRY_DSN) {
        // Send to Sentry
        this.sendToSentry(metric);
      }

      // Send to analytics
      if (ENV.ANALYTICS_ID) {
        this.sendToAnalytics(metric);
      }
    } catch (error) {
      console.error('Failed to send performance metric to monitoring service:', error);
    }
  }

  private sendToSentry(metric: PerformanceMetric) {
    // Implementation would depend on Sentry SDK
    console.log('Sending to Sentry:', metric);
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Implementation would depend on analytics service
    console.log('Sending to Analytics:', metric);
  }

  // Cleanup method
  destroy() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect performance observer:', error);
      }
    });
    this.observers.clear();
    this.metrics = [];
    this.marks.clear();
    this.timings.clear();
    this.isInitialized = false;
  }
}

export const performanceMonitoring = PerformanceMonitoring.getInstance();

// Initialize performance monitoring when module loads
performanceMonitoring.initialize();