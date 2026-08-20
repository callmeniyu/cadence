import { z } from 'zod';

export const bookingCustomerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(150),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  phone: z.string().trim().min(5, 'Enter a valid phone number').max(40),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  company: z.string().max(0).optional().or(z.literal('')), // honeypot, spec section 120
});
