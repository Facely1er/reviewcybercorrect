// Production Authentication Service
import { z } from 'zod';
import { supabase, isSupabaseReady } from './supabase';
import { auditLogger } from './auditLog';
import { ENV } from '../config/environment';

// Validation schemas
export const signInSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const signUpSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  organization: z.string().min(2, 'Organization must be at least 2 characters').max(255),
  role: z.string().min(1, 'Role is required').max(100),
  industry: z.string().optional()
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  organization: z.string().min(2).max(255).optional(),
  role: z.string().min(1).max(100).optional(),
  industry: z.string().max(100).optional(),
  phone_number: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  preferences: z.record(z.any()).optional()
});

interface AuthResult {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
}

class ProductionAuthService {
  private static instance: ProductionAuthService;
  private sessionCheckInterval?: NodeJS.Timeout;

  static getInstance(): ProductionAuthService {
    if (!ProductionAuthService.instance) {
      ProductionAuthService.instance = new ProductionAuthService();
    }
    return ProductionAuthService.instance;
  }

  private constructor() {
    this.initializeSessionMonitoring();
  }

  private initializeSessionMonitoring() {
    if (ENV.isProduction && isSupabaseReady) {
      // Check session validity every 30 minutes
      this.sessionCheckInterval = setInterval(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && this.isSessionExpiring(session)) {
            await this.refreshSession();
          }
        } catch (error) {
          console.error('Session check failed:', error);
          auditLogger.logEvent('SESSION_CHECK_FAILED', { error: error.message });
        }
      }, 30 * 60 * 1000); // 30 minutes
    }
  }

  private isSessionExpiring(session: any): boolean {
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeDiff = expiresAt.getTime() - now.getTime();
    return timeDiff < 10 * 60 * 1000; // Less than 10 minutes
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // Validate input
      const validationResult = signInSchema.safeParse({ email, password });
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message,
          code: 'VALIDATION_ERROR'
        };
      }

      if (!isSupabaseReady) {
        auditLogger.logEvent('AUTH_ATTEMPT_LOCAL_MODE', { email });
        return {
          success: false,
          error: 'Authentication service not available',
          code: 'SERVICE_UNAVAILABLE'
        };
      }

      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validationResult.data.email,
        password: validationResult.data.password
      });

      if (error) {
        auditLogger.logEvent('AUTH_FAILED', { email, error: error.message });
        return {
          success: false,
          error: this.getErrorMessage(error),
          code: error.message
        };
      }

      if (data.user) {
        auditLogger.logEvent('AUTH_SUCCESS', { 
          userId: data.user.id, 
          email: data.user.email,
          lastSignIn: data.user.last_sign_in_at
        });
        
        return {
          success: true,
          data: {
            user: data.user,
            session: data.session
          }
        };
      }

      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_FAILED'
      };

    } catch (error: any) {
      auditLogger.logEvent('AUTH_ERROR', { email, error: error.message });
      return {
        success: false,
        error: 'Authentication service error',
        code: 'SERVICE_ERROR'
      };
    }
  }

  async signUp(email: string, password: string, userData: any): Promise<AuthResult> {
    try {
      // Validate input
      const validationResult = signUpSchema.safeParse({
        email,
        password,
        ...userData
      });

      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message,
          code: 'VALIDATION_ERROR'
        };
      }

      if (!isSupabaseReady) {
        auditLogger.logEvent('SIGNUP_ATTEMPT_LOCAL_MODE', { email });
        return {
          success: false,
          error: 'Authentication service not available',
          code: 'SERVICE_UNAVAILABLE'
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: validationResult.data.email,
        password: validationResult.data.password,
        options: {
          data: {
            name: validationResult.data.name,
            organization: validationResult.data.organization,
            role: validationResult.data.role,
            industry: validationResult.data.industry || ''
          }
        }
      });

      if (error) {
        auditLogger.logEvent('SIGNUP_FAILED', { email, error: error.message });
        return {
          success: false,
          error: this.getErrorMessage(error),
          code: error.message
        };
      }

      if (data.user) {
        auditLogger.logEvent('SIGNUP_SUCCESS', { 
          userId: data.user.id, 
          email: data.user.email 
        });
        
        return {
          success: true,
          data: {
            user: data.user,
            session: data.session
          }
        };
      }

      return {
        success: false,
        error: 'User creation failed',
        code: 'SIGNUP_FAILED'
      };

    } catch (error: any) {
      auditLogger.logEvent('SIGNUP_ERROR', { email, error: error.message });
      return {
        success: false,
        error: 'Sign up service error',
        code: 'SERVICE_ERROR'
      };
    }
  }

  async signOut(): Promise<AuthResult> {
    try {
      if (!isSupabaseReady) {
        return { success: true };
      }

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        auditLogger.logEvent('SIGNOUT_FAILED', { error: error.message });
        return {
          success: false,
          error: this.getErrorMessage(error),
          code: error.message
        };
      }

      auditLogger.logEvent('SIGNOUT_SUCCESS');
      return { success: true };

    } catch (error: any) {
      auditLogger.logEvent('SIGNOUT_ERROR', { error: error.message });
      return {
        success: false,
        error: 'Sign out service error',
        code: 'SERVICE_ERROR'
      };
    }
  }

  async getCurrentUser() {
    try {
      if (!isSupabaseReady) {
        return { data: { user: null }, error: null };
      }

      const { data, error } = await supabase.auth.getUser();
      return { data, error };
    } catch (error) {
      return { data: { user: null }, error };
    }
  }

  async getCurrentSession() {
    try {
      if (!isSupabaseReady) {
        return { data: { session: null }, error: null };
      }

      const { data, error } = await supabase.auth.getSession();
      return { data, error };
    } catch (error) {
      return { data: { session: null }, error };
    }
  }

  async refreshSession() {
    try {
      if (!isSupabaseReady) {
        return { data: { session: null }, error: null };
      }

      const { data, error } = await supabase.auth.refreshSession();
      
      if (data.session) {
        auditLogger.logEvent('SESSION_REFRESHED', { 
          userId: data.session.user.id 
        });
      }

      return { data, error };
    } catch (error) {
      auditLogger.logEvent('SESSION_REFRESH_FAILED', { error: error.message });
      return { data: { session: null }, error };
    }
  }

  async updateProfile(userId: string, updates: any): Promise<AuthResult> {
    try {
      const validationResult = updateProfileSchema.safeParse(updates);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message,
          code: 'VALIDATION_ERROR'
        };
      }

      if (!isSupabaseReady) {
        return {
          success: false,
          error: 'Profile update service not available',
          code: 'SERVICE_UNAVAILABLE'
        };
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(validationResult.data)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        auditLogger.logEvent('PROFILE_UPDATE_FAILED', { userId, error: error.message });
        return {
          success: false,
          error: 'Failed to update profile',
          code: 'UPDATE_FAILED'
        };
      }

      auditLogger.logEvent('PROFILE_UPDATED', { userId, updates: Object.keys(updates) });
      return {
        success: true,
        data
      };

    } catch (error: any) {
      auditLogger.logEvent('PROFILE_UPDATE_ERROR', { userId, error: error.message });
      return {
        success: false,
        error: 'Profile update service error',
        code: 'SERVICE_ERROR'
      };
    }
  }

  async getProfile(userId: string) {
    try {
      if (!isSupabaseReady) {
        return { data: null, error: new Error('Service not available') };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  private getErrorMessage(error: any): string {
    // Map Supabase errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'User already registered': 'An account with this email already exists',
      'Password should be at least 6 characters': 'Password must be at least 8 characters',
      'Signup requires a valid password': 'Please provide a valid password',
      'Invalid email': 'Please provide a valid email address'
    };

    return errorMap[error.message] || error.message || 'An unexpected error occurred';
  }

  cleanup() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
  }
}

// Export singleton instance
export const authService = ProductionAuthService.getInstance();