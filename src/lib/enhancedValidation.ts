import { z } from 'zod';
import DOMPurify from 'dompurify';

// Base validation schemas
export const BaseIdSchema = z.string().uuid();
export const BaseNameSchema = z.string().min(1).max(255).transform(val => DOMPurify.sanitize(val.trim()));
export const BaseDescriptionSchema = z.string().min(1).max(1000).transform(val => DOMPurify.sanitize(val.trim()));
export const BaseEmailSchema = z.string().email().transform(val => DOMPurify.sanitize(val.toLowerCase().trim()));

// Enhanced Assessment Schema
export const EnhancedAssessmentSchema = z.object({
  id: BaseIdSchema,
  name: BaseNameSchema,
  description: BaseDescriptionSchema.optional(),
  frameworkId: z.string().min(1).max(100),
  organizationId: BaseIdSchema.optional(),
  userId: BaseIdSchema,
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']),
  responses: z.record(z.number().min(0).max(3)),
  metadata: z.record(z.any()).optional(),
  version: z.number().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  score: z.number().min(0).max(100).optional(),
  complianceLevel: z.enum(['basic', 'intermediate', 'advanced']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  tags: z.array(z.string().max(50)).optional(),
  notes: z.string().max(2000).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  attachments: z.array(z.object({
    id: BaseIdSchema,
    name: BaseNameSchema,
    url: z.string().url(),
    type: z.string().max(100),
    size: z.number().positive(),
    uploadedAt: z.date()
  })).optional()
});

// Enhanced User Profile Schema
export const EnhancedUserProfileSchema = z.object({
  id: BaseIdSchema,
  email: BaseEmailSchema,
  name: BaseNameSchema,
  organization: BaseNameSchema,
  role: z.enum(['viewer', 'user', 'admin', 'super_admin']),
  industry: z.string().max(100).optional(),
  certifications: z.array(z.string().max(100)).optional(),
  preferences: z.record(z.any()).optional(),
  currentOrganizationId: BaseIdSchema.optional(),
  phone: z.string().max(20).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  title: z.string().max(100).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  department: z.string().max(100).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  location: z.string().max(100).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  bio: z.string().max(500).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  avatar: z.string().url().optional(),
  lastLoginAt: z.date().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Enhanced Asset Schema
export const EnhancedAssetSchema = z.object({
  id: BaseIdSchema,
  name: BaseNameSchema,
  description: BaseDescriptionSchema.optional(),
  type: z.enum(['server', 'workstation', 'network_device', 'application', 'database', 'cloud_service', 'other']),
  category: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'decommissioned']),
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
  location: z.string().max(200).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  owner: BaseNameSchema.optional(),
  custodian: BaseNameSchema.optional(),
  ipAddress: z.string().ip().optional(),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional(),
  operatingSystem: z.string().max(100).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  version: z.string().max(50).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  tags: z.array(z.string().max(50)).optional(),
  metadata: z.record(z.any()).optional(),
  riskScore: z.number().min(0).max(100).optional(),
  lastAssessment: z.date().optional(),
  nextAssessment: z.date().optional(),
  organizationId: BaseIdSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

// Task Schema
export const TaskSchema = z.object({
  id: BaseIdSchema,
  title: BaseNameSchema,
  description: BaseDescriptionSchema.optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigneeId: BaseIdSchema.optional(),
  assigneeName: BaseNameSchema.optional(),
  dueDate: z.date().optional(),
  completedAt: z.date().optional(),
  tags: z.array(z.string().max(50)).optional(),
  attachments: z.array(z.object({
    id: BaseIdSchema,
    name: BaseNameSchema,
    url: z.string().url(),
    type: z.string().max(100)
  })).optional(),
  organizationId: BaseIdSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

// Organization Schema
export const OrganizationSchema = z.object({
  id: BaseIdSchema,
  name: BaseNameSchema,
  description: BaseDescriptionSchema.optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
  type: z.enum(['private', 'public', 'government', 'non_profit']).optional(),
  address: z.string().max(500).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  website: z.string().url().optional(),
  contactEmail: BaseEmailSchema.optional(),
  contactPhone: z.string().max(20).optional().transform(val => val ? DOMPurify.sanitize(val) : undefined),
  complianceFrameworks: z.array(z.string().max(100)).optional(),
  settings: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Search and Filter Schemas
export const SearchQuerySchema = z.object({
  query: z.string().max(200).optional().transform(val => val ? DOMPurify.sanitize(val.trim()) : undefined),
  filters: z.record(z.any()).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// API Request Schemas
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Authentication Schemas
export const LoginSchema = z.object({
  email: BaseEmailSchema,
  password: z.string().min(8).max(128)
});

export const SignUpSchema = z.object({
  email: BaseEmailSchema,
  password: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  confirmPassword: z.string(),
  name: BaseNameSchema,
  organization: BaseNameSchema,
  industry: z.string().max(100).optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  acceptPrivacy: z.boolean().refine(val => val === true, 'You must accept the privacy policy')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// File Upload Schema
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  allowedTypes: z.array(z.string()).optional(),
  maxSize: z.number().positive().optional(),
  allowedExtensions: z.array(z.string()).optional()
});

// Validation and Sanitization Functions
export const validateAndSanitizeInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      validationError.name = 'ValidationError';
      throw validationError;
    }
    throw error;
  }
};

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS URLs
    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
};

// Rate Limiting Schema
export const RateLimitSchema = z.object({
  identifier: z.string(),
  action: z.string(),
  timestamp: z.date(),
  count: z.number().min(0)
});

// Export all schemas
export type EnhancedAssessment = z.infer<typeof EnhancedAssessmentSchema>;
export type EnhancedUserProfile = z.infer<typeof EnhancedUserProfileSchema>;
export type EnhancedAsset = z.infer<typeof EnhancedAssetSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
export type SignUpData = z.infer<typeof SignUpSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type RateLimit = z.infer<typeof RateLimitSchema>;