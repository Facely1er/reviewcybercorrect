// Test Utilities and Helpers
import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { AssessmentData, UserProfile, Asset } from '../../shared/types';

// Test data generators
export const createMockUser = (overrides?: Partial<UserProfile>): UserProfile => ({
  id: 'test-user-001',
  email: 'test@example.com',
  name: 'Test User',
  organization: 'Test Organization',
  role: 'admin',
  industry: 'Technology',
  certifications: ['CISSP', 'CISM'],
  preferences: {
    theme: 'light',
    notifications: true,
    autoSave: true
  },
  ...overrides
});

export const createMockAssessment = (overrides?: Partial<AssessmentData>): AssessmentData => ({
  id: 'test-assessment-001',
  name: 'Test CMMC Assessment',
  description: 'Test assessment for CMMC compliance',
  frameworkId: 'cmmc',
  framework: {
    id: 'cmmc',
    name: 'CMMC v2.0',
    version: '2.0',
    description: 'Cybersecurity Maturity Model Certification'
  },
  responses: {
    'AC.L2-3.1.1': 3,
    'AC.L2-3.1.2': 2,
    'AU.L2-3.3.1': 4
  },
  evidence: {},
  notes: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  completedAt: null,
  version: '1.0.0',
  status: 'in_progress',
  organizationInfo: {
    name: 'Test Organization',
    industry: 'Technology',
    size: 'medium',
    criticalAssets: ['Database Server', 'Web Application']
  },
  ...overrides
});

export const createMockAsset = (overrides?: Partial<Asset>): Asset => ({
  id: 'test-asset-001',
  name: 'Test Database Server',
  type: 'server',
  criticality: 'high',
  owner: 'IT Department',
  location: 'Data Center 1',
  description: 'Primary database server for customer data',
  ipAddress: '192.168.1.100',
  operatingSystem: 'Ubuntu 20.04 LTS',
  vendor: 'Dell',
  model: 'PowerEdge R740',
  serialNumber: 'SN123456789',
  purchaseDate: new Date('2023-01-15'),
  warrantyExpiry: new Date('2026-01-15'),
  lastUpdated: new Date(),
  tags: ['production', 'database', 'critical'],
  compliance: {
    frameworks: ['cmmc', 'nist-csf'],
    lastAssessment: new Date('2024-01-01'),
    status: 'compliant'
  },
  ...overrides
});

// Mock service factories
export const createMockDataService = () => ({
  getAssessments: vi.fn().mockResolvedValue([createMockAssessment()]),
  saveAssessment: vi.fn().mockResolvedValue(true),
  deleteAssessment: vi.fn().mockResolvedValue(true),
  getUserProfile: vi.fn().mockResolvedValue(createMockUser()),
  updateUserProfile: vi.fn().mockResolvedValue(true),
  getAssets: vi.fn().mockResolvedValue([createMockAsset()]),
  saveAsset: vi.fn().mockResolvedValue(true),
  deleteAsset: vi.fn().mockResolvedValue(true),
  exportData: vi.fn().mockResolvedValue('exported-data'),
  importData: vi.fn().mockResolvedValue(true),
  backup: vi.fn().mockResolvedValue(true),
  restore: vi.fn().mockResolvedValue(true)
});

export const createMockAuthService = () => ({
  signIn: vi.fn().mockResolvedValue({ success: true, data: { user: createMockUser() } }),
  signUp: vi.fn().mockResolvedValue({ success: true, data: { user: createMockUser() } }),
  signOut: vi.fn().mockResolvedValue({ success: true }),
  getCurrentUser: vi.fn().mockResolvedValue({ data: { user: createMockUser() } }),
  getCurrentSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
  getProfile: vi.fn().mockResolvedValue({ data: createMockUser() })
});

// Event simulation helpers
export const simulateUserInput = async (element: HTMLElement, value: string) => {
  const { fireEvent } = await import('@testing-library/react');
  
  fireEvent.change(element, { target: { value } });
  fireEvent.blur(element);
  
  await waitFor(() => {
    expect(element).toHaveValue(value);
  });
};

export const simulateFormSubmission = async (form: HTMLFormElement) => {
  const { fireEvent } = await import('@testing-library/react');
  
  fireEvent.submit(form);
  
  await waitFor(() => {
    // Wait for any async operations to complete
  });
};

export const simulateFileUpload = async (input: HTMLInputElement, file: File) => {
  const { fireEvent } = await import('@testing-library/react');
  
  Object.defineProperty(input, 'files', {
    value: [file],
    writable: false
  });
  
  fireEvent.change(input);
  
  await waitFor(() => {
    expect(input.files).toHaveLength(1);
  });
};

// Assertion helpers
export const expectElementToBeVisible = async (element: HTMLElement) => {
  await waitFor(() => {
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  });
};

export const expectElementToHaveText = async (element: HTMLElement, text: string) => {
  await waitFor(() => {
    expect(element).toHaveTextContent(text);
  });
};

export const expectFormToBeValid = async (form: HTMLFormElement) => {
  await waitFor(() => {
    expect(form).toBeValid();
  });
};

export const expectElementToHaveClass = async (element: HTMLElement, className: string) => {
  await waitFor(() => {
    expect(element).toHaveClass(className);
  });
};

// API mocking helpers
export const mockSuccessfulResponse = <T>(data: T) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data)
});

export const mockErrorResponse = (status: number, message: string) => ({
  ok: false,
  status,
  json: () => Promise.resolve({ error: message })
});

export const mockFetch = (response: any) => {
  global.fetch = vi.fn().mockResolvedValue(response);
};

// Time manipulation helpers
export const advanceTimersByTime = (ms: number) => {
  vi.advanceTimersByTime(ms);
};

export const runAllTimers = () => {
  vi.runAllTimers();
};

export const setSystemTime = (date: Date) => {
  vi.setSystemTime(date);
};

// Storage mocking helpers
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    get length() {
      return Object.keys(storage).length;
    },
    key: vi.fn((index: number) => Object.keys(storage)[index] || null)
  };
};

// Component testing helpers
export const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Element with data-testid="${testId}" not found`);
  }
  return element as HTMLElement;
};

export const queryByTestId = (container: HTMLElement, testId: string) => {
  return container.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
};

export const getAllByTestId = (container: HTMLElement, testId: string) => {
  const elements = container.querySelectorAll(`[data-testid="${testId}"]`);
  return Array.from(elements) as HTMLElement[];
};

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

export const expectPerformanceToBeUnder = async (
  fn: () => Promise<void> | void,
  maxTime: number
) => {
  const duration = await measurePerformance(fn);
  expect(duration).toBeLessThan(maxTime);
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  // This would integrate with axe-core for accessibility testing
  // For now, we'll do basic checks
  const elements = container.querySelectorAll('button, input, select, textarea, a');
  
  elements.forEach(element => {
    // Check for basic accessibility attributes
    if (element.tagName.toLowerCase() === 'button') {
      expect(element).toHaveAttribute('type');
    }
    
    if (element.tagName.toLowerCase() === 'input') {
      expect(element).toHaveAttribute('type');
    }
    
    // Check for labels
    const hasLabel = element.getAttribute('aria-label') || 
                     element.getAttribute('aria-labelledby') ||
                     container.querySelector(`label[for="${element.id}"]`);
    
    if (!hasLabel && element.getAttribute('aria-hidden') !== 'true') {
      console.warn(`Element ${element.tagName} missing accessible label`);
    }
  });
};

// Error boundary testing
export const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Custom matchers for testing
expect.extend({
  toBeAccessible(received: HTMLElement) {
    try {
      checkAccessibility(received);
      return {
        message: () => `Expected element to not be accessible`,
        pass: true
      };
    } catch (error) {
      return {
        message: () => `Expected element to be accessible: ${error.message}`,
        pass: false
      };
    }
  }
});

declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeAccessible(): T;
    }
  }
}