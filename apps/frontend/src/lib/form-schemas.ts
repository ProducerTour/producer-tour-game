/**
 * Common Zod Schemas for Form Validation
 * Reusable validation schemas for Producer Tour forms
 */

import { z } from 'zod';

// =====================
// Basic Field Schemas
// =====================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const simplePasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .optional()
  .or(z.literal(''));

export const currencySchema = z
  .number()
  .min(0, 'Amount must be positive')
  .multipleOf(0.01, 'Amount must have at most 2 decimal places');

export const percentageSchema = z
  .number()
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage cannot exceed 100');

// =====================
// Producer Tour Specific
// =====================

export const proTypeSchema = z.enum(['BMI', 'ASCAP', 'SESAC', 'GMR', 'OTHER'], {
  message: 'Please select a PRO type',
});

export const ipiNumberSchema = z
  .string()
  .regex(/^\d{9,11}$/, 'IPI number must be 9-11 digits')
  .optional()
  .or(z.literal(''));

export const writerNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters');

export const songTitleSchema = z
  .string()
  .min(1, 'Song title is required')
  .max(200, 'Song title cannot exceed 200 characters');

export const referralCodeSchema = z
  .string()
  .min(4, 'Referral code must be at least 4 characters')
  .max(20, 'Referral code cannot exceed 20 characters')
  .regex(/^[A-Z0-9]+$/i, 'Referral code can only contain letters and numbers');

// =====================
// Form Schemas
// =====================

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerFormSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const writerProfileSchema = z.object({
  firstName: writerNameSchema,
  lastName: writerNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  proType: proTypeSchema.optional(),
  ipiNumber: ipiNumberSchema,
  publisherName: z.string().optional(),
});

export const paymentSettingsSchema = z.object({
  paypalEmail: emailSchema.optional().or(z.literal('')),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z
    .string()
    .regex(/^\d{9}$/, 'Routing number must be 9 digits')
    .optional()
    .or(z.literal('')),
  minimumPayout: currencySchema.optional(),
});

export const commissionConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  rate: percentageSchema,
  isActive: z.boolean().default(true),
});

export const statementUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a file' }),
  proType: proTypeSchema,
  period: z.string().min(1, 'Statement period is required'),
  notes: z.string().optional(),
});

// =====================
// Type Exports
// =====================

export type LoginFormData = z.infer<typeof loginFormSchema>;
export type RegisterFormData = z.infer<typeof registerFormSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type WriterProfileFormData = z.infer<typeof writerProfileSchema>;
export type PaymentSettingsFormData = z.infer<typeof paymentSettingsSchema>;
export type CommissionConfigFormData = z.infer<typeof commissionConfigSchema>;
export type StatementUploadFormData = z.infer<typeof statementUploadSchema>;
