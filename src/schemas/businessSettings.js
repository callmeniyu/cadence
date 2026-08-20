import { z } from 'zod';

export const businessSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Business name is required').max(120),
  businessType: z.string().min(1),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().trim().max(240).optional().or(z.literal('')),
  timezone: z.string().min(1),
  currency: z.string().min(1),
  brandColor: z.string().min(1),
});

export const bookingSettingsSchema = z.object({
  bookingLeadTimeMinutes: z.coerce.number().int().min(0).max(10080),
  cancellationWindowHours: z.coerce.number().int().min(0).max(720),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(240),
  requiresApproval: z.boolean(),
  customerCanChooseStaff: z.boolean(),
  taxRatePercent: z.coerce.number().min(0).max(100),
  invoiceDueDays: z.coerce.number().int().min(0).max(120),
});

export const profileSettingsSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is required').max(120),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
});
