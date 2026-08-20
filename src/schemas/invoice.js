import { z } from 'zod';

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(200),
  quantity: z.coerce.number().min(0.01, 'Must be greater than 0').max(9999),
  unitPrice: z.coerce.number().min(0, 'Cannot be negative').max(1000000),
});

export const invoiceEditSchema = z.object({
  items: z.array(invoiceItemSchema).min(1, 'Add at least one line item'),
  taxRatePercent: z.coerce.number().min(0).max(100),
});
