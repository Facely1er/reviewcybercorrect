// Test Setup and Configuration
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
vi.mock('../config/environment', () => ({
  ENV: {
    NODE_ENV: 'test',
    APP_VERSION: '2.0.0',
    AUTH_PROVIDER: 'supabase',
    JWT_SECRET: 'test-jwt-secret',
    SESSION_TIMEOUT: 3600000,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    ENABLE_CSP: false,
    SECURE_COOKIES: false,
    SENTRY_DSN: '',
    ANALYTICS_ID: '',
    ENABLE_OFFLINE_MODE: true,
    ENABLE_ADVANCED_FEATURES: true,
    ENABLE_MULTI_TENANT: false,
    API_BASE_URL: '/api',
    API_TIMEOUT: 30000,
    isProduction: false,
    isDevelopment: false,
    isTest: true
  }
}));

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ unsubscribe: vi.fn() }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      order: vi.fn().mockReturnThis()
    }))
  },
  isSupabaseReady: false
}));

// Mock local storage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
});

// Mock session storage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
});

// Mock navigation
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    now: vi.fn(() => Date.now())
  }
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn()
};

// Mock fetch
global.fetch = vi.fn();

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Test utilities
export const mockUser = {
  id: 'test-user-001',
  email: 'test@example.com',
  name: 'Test User'
};

export const mockProfile = {
  id: 'test-user-001',
  email: 'test@example.com',
  name: 'Test User',
  organization: 'Test Organization',
  role: 'admin',
  industry: 'Technology',
  preferences: {}
};

export const mockAssessment = {
  id: 'test-assessment-001',
  name: 'Test Assessment',
  description: 'Test assessment description',
  frameworkId: 'cmmc',
  responses: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  version: '1.0.0'
};

export const mockAsset = {
  id: 'test-asset-001',
  name: 'Test Server',
  type: 'server' as const,
  criticality: 'high' as const,
  owner: 'IT Department',
  description: 'Test server description'
};

// Custom render function with providers
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../shared/contexts/ThemeContext';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries = ['/'], ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything
export * from '@testing-library/react';
export { renderWithProviders as render };