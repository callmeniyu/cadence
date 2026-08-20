import { z } from 'zod';

export const customerSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is required').max(150),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});
