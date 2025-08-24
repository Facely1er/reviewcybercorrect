// Error Boundary Component Tests
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '../setup';
import { ProductionErrorBoundary, RouteErrorBoundary, ComponentErrorBoundary } from '../../components/ErrorBoundary';
import { ThrowError } from '../utils/testUtils';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('ProductionErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ProductionErrorBoundary>
        <div>Test content</div>
      </ProductionErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when error occurs', () => {
    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We apologize for the inconvenience/)).toBeInTheDocument();
  });

  it('displays error ID when error occurs', () => {
    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
  });

  it('shows refresh button that reloads page', () => {
    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true
    });

    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    const refreshButton = screen.getByText('Refresh Page');
    fireEvent.click(refreshButton);

    expect(reloadMock).toHaveBeenCalled();
  });

  it('shows go home button that navigates to home', () => {
    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    const homeButton = screen.getByText('Go to Home');
    expect(homeButton).toBeInTheDocument();
  });

  it('shows report bug button', () => {
    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    const reportButton = screen.getByText('Report Bug');
    expect(reportButton).toBeInTheDocument();
  });

  it('calls onError callback when provided', () => {
    const onErrorMock = vi.fn();

    render(
      <ProductionErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalled();
  });

  it('renders custom fallback when provided', () => {
    const CustomFallback = () => <div>Custom error message</div>;

    render(
      <ProductionErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    // Mock development environment
    vi.mock('../../config/environment', () => ({
      ENV: { isProduction: false }
    }));

    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development Mode)')).toBeInTheDocument();
  });
});

describe('RouteErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <RouteErrorBoundary>
        <div>Route content</div>
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Route content')).toBeInTheDocument();
  });

  it('renders route-specific error UI when error occurs', () => {
    render(
      <RouteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Page Error')).toBeInTheDocument();
    expect(screen.getByText("This section couldn't be loaded.")).toBeInTheDocument();
  });

  it('shows reload button in route error UI', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true
    });

    render(
      <RouteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </RouteErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload');
    fireEvent.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();
  });
});

describe('ComponentErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ComponentErrorBoundary>
        <div>Component content</div>
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Component content')).toBeInTheDocument();
  });

  it('renders component-specific error UI when error occurs', () => {
    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <ThrowError shouldThrow={true} />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('TestComponent Error')).toBeInTheDocument();
    expect(screen.getByText('This component failed to load. Please refresh the page.')).toBeInTheDocument();
  });

  it('uses default component name when not provided', () => {
    render(
      <ComponentErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Component Error')).toBeInTheDocument();
  });
});

describe('Error Boundary Integration', () => {
  it('handles nested error boundaries correctly', () => {
    render(
      <ProductionErrorBoundary>
        <div>
          <h1>Main Content</h1>
          <ComponentErrorBoundary componentName="NestedComponent">
            <ThrowError shouldThrow={true} />
          </ComponentErrorBoundary>
          <div>Other content</div>
        </div>
      </ProductionErrorBoundary>
    );

    // Only the nested component should show error, not the main boundary
    expect(screen.getByText('NestedComponent Error')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.getByText('Other content')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('bubbles error to parent boundary when child boundary fails', () => {
    // Simulate a boundary that throws during error handling
    const FailingBoundary = () => {
      throw new Error('Boundary failure');
    };

    render(
      <ProductionErrorBoundary>
        <ComponentErrorBoundary fallback={<FailingBoundary />}>
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      </ProductionErrorBoundary>
    );

    // Should show the parent boundary error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});