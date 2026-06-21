import { z } from 'zod';

/**
 * Zod schema untuk validasi form registrasi.
 */
export const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(120, 'Password maksimal 120 karakter'),
  ownerName: z
    .string()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(120, 'Nama lengkap maksimal 120 karakter'),
  businessName: z
    .string()
    .min(2, 'Nama bisnis minimal 2 karakter')
    .max(120, 'Nama bisnis maksimal 120 karakter'),
  businessSlug: z
    .string()
    .min(3, 'URL bisnis minimal 3 karakter')
    .max(60, 'URL bisnis maksimal 60 karakter')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        'Slug hanya boleh huruf kecil, angka, dan tanda hubung (mis. "toko-saya")',
    }),
  outletName: z
    .string()
    .min(2, 'Nama outlet minimal 2 karakter')
    .max(120, 'Nama outlet maksimal 120 karakter'),
  plan: z.enum(['FREE', 'STARTER', 'GROWTH'], {
    message: 'Pilih paket subscription',
  }),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
