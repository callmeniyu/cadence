import { z } from 'zod';

export const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  category: z.string().trim().max(60).optional().or(z.literal('')),
  description: z.string().trim().max(600).optional().or(z.literal('')),
  durationMinutes: z.coerce.number().int().min(5, 'Must be at least 5 minutes').max(600),
  price: z.coerce.number().min(0, 'Price cannot be negative').max(1000000),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(120),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(120),
  color: z.string().min(1),
  active: z.boolean(),
  publicVisible: z.boolean(),
});
