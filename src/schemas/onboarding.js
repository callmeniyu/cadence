import { z } from 'zod';

export const businessBasicsSchema = z.object({
  name: z.string().trim().min(2, 'Business name is required').max(120),
  businessType: z.string().min(1, 'Choose a business type'),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  timezone: z.string().min(1, 'Choose a timezone'),
  currency: z.string().min(1, 'Choose a currency'),
  address: z.string().trim().max(240).optional().or(z.literal('')),
});

export const bookingPrefsSchema = z.object({
  bookingLeadTimeMinutes: z.coerce.number().int().min(0).max(10080),
  cancellationWindowHours: z.coerce.number().int().min(0).max(720),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(240),
  customerCanChooseStaff: z.boolean(),
  requiresApproval: z.boolean(),
});
