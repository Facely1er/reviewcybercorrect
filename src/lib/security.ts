import { ENV } from '../config/environment';
import { errorMonitoring } from './errorMonitoring';
import { performanceMonitoring } from './performanceMonitoring';

// Permission types
export type Permission = 
  | 'assessment:read'
  | 'assessment:write'
  | 'assessment:delete'
  | 'assessment:admin'
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'user:admin'
  | 'organization:read'
  | 'organization:write'
  | 'organization:delete'
  | 'organization:admin'
  | 'asset:read'
  | 'asset:write'
  | 'asset:delete'
  | 'asset:admin'
  | 'task:read'
  | 'task:write'
  | 'task:delete'
  | 'task:admin'
  | 'report:read'
  | 'report:write'
  | 'report:delete'
  | 'report:admin'
  | 'policy:read'
  | 'policy:write'
  | 'policy:delete'
  | 'policy:admin'
  | 'compliance:read'
  | 'compliance:write'
  | 'compliance:delete'
  | 'compliance:admin'
  | 'system:admin';

// Role definitions with permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  viewer: [
    'assessment:read',
    'user:read',
    'organization:read',
    'asset:read',
    'task:read',
    'report:read',
    'policy:read',
    'compliance:read'
  ],
  user: [
    'assessment:read',
    'assessment:write',
    'user:read',
    'user:write',
    'organization:read',
    'asset:read',
    'asset:write',
    'task:read',
    'task:write',
    'report:read',
    'report:write',
    'policy:read',
    'compliance:read',
    'compliance:write'
  ],
  admin: [
    'assessment:read',
    'assessment:write',
    'assessment:delete',
    'assessment:admin',
    'user:read',
    'user:write',
    'user:delete',
    'user:admin',
    'organization:read',
    'organization:write',
    'organization:delete',
    'organization:admin',
    'asset:read',
    'asset:write',
    'asset:delete',
    'asset:admin',
    'task:read',
    'task:write',
    'task:delete',
    'task:admin',
    'report:read',
    'report:write',
    'report:delete',
    'report:admin',
    'policy:read',
    'policy:write',
    'policy:delete',
    'policy:admin',
    'compliance:read',
    'compliance:write',
    'compliance:delete',
    'compliance:admin'
  ],
  super_admin: [
    'assessment:read',
    'assessment:write',
    'assessment:delete',
    'assessment:admin',
    'user:read',
    'user:write',
    'user:delete',
    'user:admin',
    'organization:read',
    'organization:write',
    'organization:delete',
    'organization:admin',
    'asset:read',
    'asset:write',
    'asset:delete',
    'asset:admin',
    'task:read',
    'task:write',
    'task:delete',
    'task:admin',
    'report:read',
    'report:write',
    'report:delete',
    'report:admin',
    'policy:read',
    'policy:write',
    'policy:delete',
    'policy:admin',
    'compliance:read',
    'compliance:write',
    'compliance:delete',
    'compliance:admin',
    'system:admin'
  ]
};

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 }, // 5 attempts per 15 min
  api: { maxRequests: 100, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 }, // 100 requests per minute
  assessment: { maxRequests: 50, windowMs: 60 * 1000, blockDurationMs: 10 * 60 * 1000 }, // 50 assessments per minute
  file_upload: { maxRequests: 10, windowMs: 60 * 1000, blockDurationMs: 15 * 60 * 1000 }, // 10 uploads per minute
  report_generation: { maxRequests: 5, windowMs: 60 * 1000, blockDurationMs: 20 * 60 * 1000 } // 5 reports per minute
};

// Security validation rules
export interface SecurityValidationRule {
  name: string;
  validate: (value: any) => boolean;
  message: string;
}

export const SECURITY_VALIDATION_RULES: SecurityValidationRule[] = [
  {
    name: 'no_sql_injection',
    validate: (value: string) => !/(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript|onload|onerror|onclick)\b)/i.test(value),
    message: 'Input contains potentially dangerous SQL or script content'
  },
  {
    name: 'no_xss',
    validate: (value: string) => !/(<script|javascript:|vbscript:|onload|onerror|onclick|onmouseover|onfocus|onblur)/i.test(value),
    message: 'Input contains potentially dangerous HTML/JavaScript content'
  },
  {
    name: 'no_path_traversal',
    validate: (value: string) => !/(\.\.\/|\.\.\\|\.\.%2f|\.\.%5c)/i.test(value),
    message: 'Input contains path traversal attempts'
  },
  {
    name: 'no_command_injection',
    validate: (value: string) => !/(\b(cmd|powershell|bash|sh|exec|system|eval|Function|setTimeout|setInterval)\b)/i.test(value),
    message: 'Input contains potentially dangerous command execution content'
  }
];

// Main Security Service
class SecurityService {
  private static instance: SecurityService;
  private rateLimitStore: Map<string, Map<string, { count: number; resetTime: number; blockedUntil?: number }>> = new Map();
  private securityEvents: Array<{ timestamp: Date; type: string; details: any }> = [];
  private readonly MAX_SECURITY_EVENTS = 1000;

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  // Permission checking
  hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    return userPermissions.includes(requiredPermission);
  }

  hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  hasAllPermissions(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }

  // Role-based access control
  getRolePermissions(role: string): Permission[] {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
  }

  canAccessResource(userRole: string, resourceType: string, action: 'read' | 'write' | 'delete' | 'admin'): boolean {
    const permissions = this.getRolePermissions(userRole);
    const requiredPermission = `${resourceType}:${action}` as Permission;
    return permissions.includes(requiredPermission);
  }

  // Rate limiting
  isRateLimited(identifier: string, action: string): { allowed: boolean; remaining: number; resetTime: number; blockedUntil?: number } {
    const config = DEFAULT_RATE_LIMITS[action] || DEFAULT_RATE_LIMITS.api;
    const now = Date.now();
    
    if (!this.rateLimitStore.has(action)) {
      this.rateLimitStore.set(action, new Map());
    }
    
    const actionStore = this.rateLimitStore.get(action)!;
    const record = actionStore.get(identifier);
    
    // Check if currently blocked
    if (record?.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.blockedUntil,
        blockedUntil: record.blockedUntil
      };
    }
    
    // Check if window has expired
    if (!record || now > record.resetTime) {
      actionStore.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }
    
    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      // Block the identifier
      const blockedUntil = now + config.blockDurationMs;
      actionStore.set(identifier, {
        ...record,
        blockedUntil
      });
      
      this.logSecurityEvent('rate_limit_exceeded', {
        identifier,
        action,
        count: record.count,
        blockedUntil
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        blockedUntil
      };
    }
    
    // Increment count
    record.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  // Input validation and sanitization
  validateInput(input: string, rules: SecurityValidationRule[] = SECURITY_VALIDATION_RULES): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    rules.forEach(rule => {
      if (!rule.validate(input)) {
        errors.push(rule.message);
      }
    });
    
    if (errors.length > 0) {
      this.logSecurityEvent('input_validation_failed', {
        input: input.substring(0, 100), // Log first 100 chars only
        errors
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateObject(obj: Record<string, any>, fieldRules: Record<string, SecurityValidationRule[]>): { valid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};
    let isValid = true;
    
    Object.entries(fieldRules).forEach(([field, rules]) => {
      const value = obj[field];
      if (typeof value === 'string') {
        const validation = this.validateInput(value, rules);
        if (!validation.valid) {
          errors[field] = validation.errors;
          isValid = false;
        }
      }
    });
    
    return { valid: isValid, errors };
  }

  // JWT token validation
  validateJWT(token: string): { valid: boolean; payload?: any; error?: string } {
    try {
      // Basic JWT format validation
      if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Invalid token format' };
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid JWT structure' };
      }
      
      // Decode payload (base64url decode)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return { valid: false, error: 'Token expired' };
      }
      
      // Check not before
      if (payload.nbf && Date.now() < payload.nbf * 1000) {
        return { valid: false, error: 'Token not yet valid' };
      }
      
      // Check issuer (if configured)
      if (ENV.JWT_ISSUER && payload.iss !== ENV.JWT_ISSUER) {
        return { valid: false, error: 'Invalid token issuer' };
      }
      
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Token validation failed' };
    }
  }

  // Session management
  createSession(userId: string, permissions: Permission[], metadata?: Record<string, any>): string {
    const session = {
      id: this.generateSecureId(),
      userId,
      permissions,
      metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ENV.SESSION_TIMEOUT)
    };
    
    // In production, this would be stored securely (Redis, database, etc.)
    this.logSecurityEvent('session_created', {
      sessionId: session.id,
      userId,
      permissions: permissions.length
    });
    
    return session.id;
  }

  validateSession(sessionId: string): { valid: boolean; session?: any; error?: string } {
    // In production, this would validate against stored session data
    // For now, return a mock validation
    if (!sessionId || sessionId.length < 32) {
      return { valid: false, error: 'Invalid session ID' };
    }
    
    return { valid: true, session: { id: sessionId } };
  }

  // Security event logging
  logSecurityEvent(type: string, details: any): void {
    const event = {
      timestamp: new Date(),
      type,
      details
    };
    
    this.securityEvents.push(event);
    
    // Keep only recent events
    if (this.securityEvents.length > this.MAX_SECURITY_EVENTS) {
      this.securityEvents = this.securityEvents.slice(-this.MAX_SECURITY_EVENTS);
    }
    
    // Send to monitoring service in production
    if (ENV.isProduction) {
      errorMonitoring.captureMessage(`Security Event: ${type}`, 'warning', {
        tags: { type: 'securityEvent', eventType: type },
        extra: details
      });
    }
    
    // Log in development
    if (ENV.isDevelopment) {
      console.warn(`🚨 Security Event: ${type}`, details);
    }
  }

  getSecurityEvents(limit?: number): Array<{ timestamp: Date; type: string; details: any }> {
    const events = [...this.securityEvents].reverse();
    return limit ? events.slice(0, limit) : events;
  }

  // Utility methods
  private generateSecureId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Cleanup and maintenance
  cleanup(): void {
    const now = Date.now();
    
    // Clean up expired rate limit records
    this.rateLimitStore.forEach((actionStore, action) => {
      for (const [identifier, record] of actionStore.entries()) {
        if (now > record.resetTime && (!record.blockedUntil || now > record.blockedUntil)) {
          actionStore.delete(identifier);
        }
      }
    });
    
    // Clean up old security events
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.securityEvents = this.securityEvents.filter(event => event.timestamp > cutoff);
  }

  // Get security statistics
  getSecurityStats(): Record<string, any> {
    const now = Date.now();
    const stats = {
      totalSecurityEvents: this.securityEvents.length,
      rateLimitViolations: 0,
      activeBlocks: 0,
      totalSessions: 0
    };
    
    // Count rate limit violations and active blocks
    this.rateLimitStore.forEach(actionStore => {
      for (const record of actionStore.values()) {
        if (record.blockedUntil && now < record.blockedUntil) {
          stats.activeBlocks++;
        }
        if (record.count >= 10) { // Arbitrary threshold for violations
          stats.rateLimitViolations++;
        }
      }
    });
    
    return stats;
  }
}

export const securityService = SecurityService.getInstance();

// Cleanup every 5 minutes
setInterval(() => {
  securityService.cleanup();
}, 5 * 60 * 1000);

// Export types and constants
export type { SecurityValidationRule, RateLimitConfig };
export { DEFAULT_RATE_LIMITS, SECURITY_VALIDATION_RULES };