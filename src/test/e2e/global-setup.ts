// Global E2E Test Setup
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');

  const { baseURL } = config.projects[0].use;
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the application to be ready
    console.log('📡 Checking application availability...');
    await page.goto(baseURL!);
    
    // Wait for the main app to load
    await page.waitForSelector('[data-testid="app-root"]', { 
      timeout: 30000 
    });

    console.log('✅ Application is ready for testing');

    // Setup test data if needed
    console.log('📝 Setting up test data...');
    
    // You can add setup for test users, mock data, etc.
    await setupTestEnvironment(page);

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestEnvironment(page: any) {
  // Setup mock localStorage data for tests
  await page.addInitScript(() => {
    // Mock authentication state
    localStorage.setItem('cybersecurity-test-mode', 'true');
    
    // Mock user profile
    localStorage.setItem('user-profile', JSON.stringify({
      id: 'test-user-001',
      email: 'test@example.com',
      name: 'Test User',
      organization: 'Test Organization',
      role: 'admin',
      industry: 'Technology',
      preferences: {
        theme: 'light',
        notifications: true
      }
    }));

    // Mock assessment data
    localStorage.setItem('cybersecurity-assessments', JSON.stringify([
      {
        id: 'test-assessment-001',
        name: 'Test CMMC Assessment',
        frameworkId: 'cmmc',
        responses: {
          'AC.L2-3.1.1': 3,
          'AC.L2-3.1.2': 2
        },
        createdAt: new Date().toISOString(),
        status: 'in_progress'
      }
    ]));
  });
}

export default globalSetup;