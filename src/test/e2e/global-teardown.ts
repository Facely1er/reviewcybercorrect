// Global E2E Test Teardown
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');

  try {
    // Cleanup test data
    console.log('🗑️ Cleaning up test data...');
    
    // You can add cleanup logic here:
    // - Remove test users from database
    // - Clean up uploaded files
    // - Reset test environment state
    
    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;