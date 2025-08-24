// Authentication E2E Tests
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication state
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should display sign in page for unauthenticated users', async ({ page }) => {
    // Should redirect to sign in page
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    
    // Check sign in form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Enter invalid email
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/invalid email format/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/email and password are required/i)).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const passwordInput = page.getByPlaceholder(/password/i);
    const toggleButton = page.getByRole('button', { name: /toggle password visibility/i });
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click toggle to hide password again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should switch between sign in and sign up modes', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Click sign up link
    await page.getByRole('link', { name: /don't have an account/i }).click();
    
    // Should show sign up form
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByPlaceholder(/name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/organization/i)).toBeVisible();
    
    // Click sign in link
    await page.getByRole('link', { name: /already have an account/i }).click();
    
    // Should show sign in form
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should validate sign up form', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.getByRole('link', { name: /don't have an account/i }).click();
    
    // Fill partial form
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('short');
    
    // Try to submit
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();
    await expect(page.getByText(/name and organization are required/i)).toBeVisible();
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Mock failed authentication
    await page.route('**/auth/signin', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' })
      });
    });
    
    // Try to sign in with valid format but wrong credentials
    await page.getByPlaceholder(/email/i).fill('wrong@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should handle network errors during authentication', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Mock network error
    await page.route('**/auth/signin', (route) => {
      route.abort('failed');
    });
    
    // Try to sign in
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show network error message
    await expect(page.getByText(/network error|connection failed/i)).toBeVisible();
  });

  test('should show loading state during authentication', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Mock slow authentication response
    await page.route('**/auth/signin', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    // Fill form and submit
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show loading spinner
    await expect(page.getByTestId('loading-spinner')).toBeVisible();
    
    // Button should be disabled during loading
    await expect(page.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});

test.describe('Authenticated Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      localStorage.setItem('user-profile', JSON.stringify({
        id: 'test-user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }));
    });
  });

  test('should redirect to dashboard when authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should display user profile in navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show user name in navigation
    await expect(page.getByText(/test user/i)).toBeVisible();
    
    // Should show user menu
    await page.getByRole('button', { name: /user menu/i }).click();
    await expect(page.getByRole('menuitem', { name: /profile/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /sign out/i })).toBeVisible();
  });

  test('should sign out user', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open user menu and click sign out
    await page.getByRole('button', { name: /user menu/i }).click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    
    // Should redirect to sign in page
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
});