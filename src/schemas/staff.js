import { z } from 'zod';

export const staffInviteSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  role: z.enum(['admin', 'staff']),
});

export const availabilityWindowSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
}).refine((d) => d.endTime > d.startTime, { message: 'End time must be after start time', path: ['endTime'] });

export const blockedTimeSchema = z.object({
  startAt: z.string().min(1, 'Start is required'),
  endAt: z.string().min(1, 'End is required'),
  reason: z.string().trim().max(200).optional().or(z.literal('')),
}).refine((d) => new Date(d.endAt) > new Date(d.startAt), { message: 'End must be after start', path: ['endAt'] });
