// Production Input Validation and Sanitization
import { z } from 'zod';
import DOMPurify from 'dompurify';

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character'),
  name: z.string().min(1, 'Name is required').max(100).trim(),
  organization: z.string().min(1, 'Organization is required').max(255).trim(),
  phone: z.string().regex(/^[+]?[\d\s\-\(\)]{10,20}$/, 'Invalid phone number').optional(),
  url: z.string().url('Invalid URL').max(2048).optional(),
  text: z.string().max(10000, 'Text too long'),
  id: z.string().uuid('Invalid ID format'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').max(100)
};

// Assessment validation schemas
export const assessmentSchemas = {
  framework: z.object({
    id: commonSchemas.id,
    name: commonSchemas.name,
    version: z.string().max(20),
    description: z.string().max(1000).optional()
  }),
  
  response: z.object({
    questionId: commonSchemas.id,
    value: z.number().min(0).max(5),
    evidence: z.string().max(5000).optional(),
    notes: z.string().max(2000).optional(),
    attachments: z.array(z.string().url()).max(10).optional()
  }),

  assessment: z.object({
    id: commonSchemas.id.optional(),
    name: z.string().min(1, 'Assessment name is required').max(255),
    description: z.string().max(1000).optional(),
    frameworkId: commonSchemas.id,
    organizationId: commonSchemas.id,
    responses: z.record(z.number().min(0).max(5)),
    status: z.enum(['draft', 'in_progress', 'completed', 'archived']),
    dueDate: z.date().optional(),
    assignedTo: z.array(commonSchemas.id).optional()
  })
};

// Asset validation schemas
export const assetSchemas = {
  asset: z.object({
    id: commonSchemas.id.optional(),
    name: z.string().min(1, 'Asset name is required').max(255),
    type: z.enum(['server', 'workstation', 'network', 'application', 'database', 'other']),
    criticality: z.enum(['low', 'medium', 'high', 'critical']),
    owner: z.string().max(255),
    location: z.string().max(255).optional(),
    description: z.string().max(1000).optional(),
    ipAddress: z.string().ip().optional(),
    operatingSystem: z.string().max(100).optional(),
    vendor: z.string().max(100).optional(),
    model: z.string().max(100).optional(),
    serialNumber: z.string().max(100).optional(),
    purchaseDate: z.date().optional(),
    warrantyExpiry: z.date().optional(),
    lastUpdated: z.date().optional()
  })
};

// Policy validation schemas
export const policySchemas = {
  policy: z.object({
    id: commonSchemas.id.optional(),
    title: z.string().min(1, 'Policy title is required').max(255),
    content: z.string().min(1, 'Policy content is required').max(50000),
    version: z.string().max(20),
    status: z.enum(['draft', 'review', 'approved', 'archived']),
    category: z.string().max(100),
    tags: z.array(z.string().max(50)).max(20),
    approvedBy: commonSchemas.id.optional(),
    approvedDate: z.date().optional(),
    effectiveDate: z.date().optional(),
    reviewDate: z.date().optional()
  })
};

// Organization validation schemas
export const organizationSchemas = {
  organization: z.object({
    id: commonSchemas.id.optional(),
    name: z.string().min(1, 'Organization name is required').max(255),
    industry: z.string().max(100).optional(),
    size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
    address: z.object({
      street: z.string().max(255).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      zipCode: z.string().max(20).optional(),
      country: z.string().max(100).optional()
    }).optional(),
    website: commonSchemas.url,
    phone: commonSchemas.phone,
    settings: z.record(z.any()).optional()
  })
};

// Sanitization functions
export class InputSanitizer {
  private static dompurifyConfig = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'p', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false
  };

  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, this.dompurifyConfig);
  }

  static sanitizeText(input: string): string {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim();
  }

  static sanitizeFileName(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .substring(0, 255); // Limit length
  }

  static sanitizeSlug(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  static sanitizePhoneNumber(input: string): string {
    return input.replace(/[^\d+\s\-\(\)]/g, '');
  }

  static sanitizeUrl(input: string): string {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch {
      throw new Error('Invalid URL');
    }
  }

  static sanitizeNumber(input: any): number | null {
    const num = Number(input);
    return isFinite(num) ? num : null;
  }

  static sanitizeArray<T>(input: any[], itemSanitizer: (item: any) => T): T[] {
    if (!Array.isArray(input)) return [];
    return input.slice(0, 1000).map(itemSanitizer).filter(Boolean);
  }
}

// Validation middleware for forms
export class FormValidator {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: Record<string, string>;
  } {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        const errors: Record<string, string> = {};
        result.error.errors.forEach(error => {
          const path = error.path.join('.');
          errors[path] = error.message;
        });
        
        return {
          success: false,
          errors
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: { general: 'Validation error occurred' }
      };
    }
  }

  static validateAndSanitize<T>(
    schema: z.ZodSchema<T>, 
    data: unknown,
    sanitizers?: Record<string, (value: any) => any>
  ): {
    success: boolean;
    data?: T;
    errors?: Record<string, string>;
  } {
    // Apply sanitizers if provided
    if (sanitizers && typeof data === 'object' && data !== null) {
      const sanitizedData = { ...data as Record<string, any> };
      
      Object.entries(sanitizers).forEach(([key, sanitizer]) => {
        if (sanitizedData[key] !== undefined) {
          sanitizedData[key] = sanitizer(sanitizedData[key]);
        }
      });
      
      return this.validate(schema, sanitizedData);
    }
    
    return this.validate(schema, data);
  }
}

// Rate limiting for API calls
export class RateLimiter {
  private static attempts: Map<string, { count: number; resetTime: number }> = new Map();

  static checkLimit(
    key: string, 
    maxAttempts: number = 5, 
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
    }

    if (record.count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return { 
      allowed: true, 
      remaining: maxAttempts - record.count, 
      resetTime: record.resetTime 
    };
  }

  static reset(key: string): void {
    this.attempts.delete(key);
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

// Cleanup rate limiter every hour
setInterval(() => RateLimiter.cleanup(), 60 * 60 * 1000);

// Security headers helper
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-analytics.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

export { commonSchemas, assessmentSchemas, assetSchemas, policySchemas, organizationSchemas };