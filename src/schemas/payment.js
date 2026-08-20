import { z } from 'zod';

export const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0').max(1000000),
  method: z.enum(['cash', 'demo_card', 'bank_transfer', 'wallet']),
});
